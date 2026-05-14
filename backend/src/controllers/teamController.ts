

import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';
import { deleteImageFile } from '../utils/upload';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'team-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/team-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/team.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createTeamSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  role: Joi.string().min(1).max(100).optional(), // Make role optional
  position: Joi.string().min(1).max(100).optional(), // Accept position as alias
  bio: Joi.string().max(500).optional(),
  photo: Joi.string().optional(), // Allow any string
  social_links: Joi.array().items(Joi.object({
    platform: Joi.string().required(),
    url: Joi.string().uri().required(),
  })).optional().default([]),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
}).or('role', 'position'); // Require at least one of role or position

const updateTeamSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  role: Joi.string().min(1).max(100).optional(),
  bio: Joi.string().max(500).optional(),
  photo: Joi.string().uri().optional(),
  social_links: Joi.array().items(Joi.object({
    platform: Joi.string().required(),
    url: Joi.string().uri().required(),
  })).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  sort_by: Joi.string().valid('name', 'role', 'created_at').optional().default('created_at'),
  order: Joi.string().valid('asc', 'desc').optional().default('desc'),
});

// Controller functions
export const getAllTeamMembers = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { error: error.details?.[0]?.message, query: req.query });
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
    }

    const { page, limit, sort_by, order } = value;
    const offset = (page - 1) * limit;

    // Get team members with pagination
    const teamMembers = await (prisma as any).team.findMany({
      orderBy: { [sort_by]: order },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await (prisma as any).team.count();

    // Parse social_links from JSON strings back to arrays
    const teamMembersWithParsedLinks = teamMembers.map((member: any) => {
      let socialLinks = [];
      try {
        socialLinks = member.social_links ? JSON.parse(member.social_links) : [];
      } catch (e) {
        logger.warn('Failed to parse social_links for member', { memberId: member.id, social_links: member.social_links });
        socialLinks = [];
      }
      return {
        ...member,
        social_links: socialLinks,
      };
    });

    logger.info('Team members retrieved successfully', {
      count: teamMembers.length,
      total,
      page,
      limit,
    });

    res.json({
      success: true,
      data: {
        members: teamMembersWithParsedLinks,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve team members', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve team members',
    });
  }
};

export const getTeamMemberById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team member ID',
      });
    }

    const member = await (prisma as any).team.findUnique({
      where: { id: Number(id) },
    });

    if (!member) {
      logger.warn('Team member not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Team member not found',
      });
    }

    // Parse social_links from JSON string back to array
    let socialLinks = [];
    try {
      socialLinks = member.social_links ? JSON.parse(member.social_links) : [];
    } catch (e) {
      logger.warn('Failed to parse social_links for member', { memberId: member.id, social_links: member.social_links });
      socialLinks = [];
    }
    const memberWithParsedLinks = {
      ...member,
      social_links: socialLinks,
    };

    logger.info('Team member retrieved successfully', { id, name: member.name });

    res.json({
      success: true,
      data: { member: memberWithParsedLinks },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve team member', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve team member',
    });
  }
};

export const createTeamMember = async (req: Request, res: Response) => {
  try {
    // Handle FormData if present (multipart/form-data)
    let bodyData: any = req.body;
    if (req.headers['content-type']?.includes('multipart/form-data') || (req as any).file) {
      bodyData = {};
      if (req.body.name) bodyData.name = req.body.name;
      if (req.body.role) bodyData.role = req.body.role;
      if (req.body.position) bodyData.position = req.body.position;
      if (req.body.bio) bodyData.bio = req.body.bio;
      if (req.body.email) bodyData.email = req.body.email;
      if (req.body.phone) bodyData.phone = req.body.phone;
      
      // Handle social_links (can be JSON string or array)
      if (req.body.social_links) {
        try {
          bodyData.social_links = typeof req.body.social_links === 'string' ? JSON.parse(req.body.social_links) : req.body.social_links;
        } catch {
          bodyData.social_links = Array.isArray(req.body.social_links) ? req.body.social_links : [];
        }
      }
      
      // Handle photo file upload if present
      if ((req as any).file) {
        bodyData.photo = `/assets/uploads/team/${(req as any).file.filename}`;
      } else if (req.body.photo) {
        bodyData.photo = req.body.photo;
      }
    }

    // Validate request body
    const { error, value } = createTeamSchema.validate(bodyData);
    if (error) {
      logger.warn('Invalid team member data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid team member data',
        details: error.details?.[0]?.message,
      });
    }

    const { name, role, position, bio, photo, social_links, email, phone } = value;

    // Use position as role if role is not provided
    const memberRole = role || position;

    // Check if email already exists (if provided)
    if (email) {
      const existingMember = await (prisma as any).team.findUnique({
        where: { email },
      });

      if (existingMember) {
        return res.status(409).json({
          success: false,
          error: 'Team member with this email already exists',
        });
      }
    }

    // Convert social_links array to JSON string
    const socialLinksJson = JSON.stringify(social_links || []);

    // Create the team member
    const member = await (prisma as any).team.create({
      data: {
        name,
        role: memberRole,
        bio,
        photo,
        social_links: socialLinksJson,
        email,
        phone,
      },
    });

    // Parse social_links back to array for response
    let socialLinks = [];
    try {
      socialLinks = JSON.parse(member.social_links);
    } catch (e) {
      logger.warn('Failed to parse social_links for created member', { memberId: member.id, social_links: member.social_links });
      socialLinks = [];
    }
    const memberWithParsedLinks = {
      ...member,
      social_links: socialLinks,
    };

    logger.info('Team member created successfully', {
      id: member.id,
      name: member.name,
      email: member.email,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: { member: memberWithParsedLinks },
    });
  } catch (error: any) {
    logger.error('Failed to create team member', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create team member',
    });
  }
};

export const updateTeamMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team member ID',
      });
    }

    // Handle FormData if present (multipart/form-data)
    let bodyData: any = req.body;
    if (req.headers['content-type']?.includes('multipart/form-data') || (req as any).file) {
      bodyData = {};
      if (req.body.name) bodyData.name = req.body.name;
      if (req.body.role) bodyData.role = req.body.role;
      if (req.body.bio) bodyData.bio = req.body.bio;
      if (req.body.email) bodyData.email = req.body.email;
      if (req.body.phone) bodyData.phone = req.body.phone;
      
      // Handle social_links (can be JSON string or array)
      if (req.body.social_links) {
        try {
          bodyData.social_links = typeof req.body.social_links === 'string' ? JSON.parse(req.body.social_links) : req.body.social_links;
        } catch {
          bodyData.social_links = Array.isArray(req.body.social_links) ? req.body.social_links : [];
        }
      }
      
      // Handle photo file upload if present
      if ((req as any).file) {
        bodyData.photo = `/assets/uploads/team/${(req as any).file.filename}`;
      } else if (req.body.photo === 'null' || req.body.photo === '') {
        // If frontend explicitly sends null/empty for photo, clear it
        bodyData.photo = null;
      } else if (req.body.photo) {
        // If photo is sent as a string (existing URL), keep it
        bodyData.photo = req.body.photo;
      }
    }

    // Validate request body
    const { error, value } = updateTeamSchema.validate(bodyData);
    if (error) {
      logger.warn('Invalid team member update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid team member update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if team member exists
    const existingMember = await (prisma as any).team.findUnique({
      where: { id: Number(id) },
    });

    if (!existingMember) {
      logger.warn('Team member not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Team member not found',
      });
    }

    // Check email uniqueness if being updated
    if (value.email && value.email !== existingMember.email) {
      const emailConflict = await (prisma as any).team.findUnique({
        where: { email: value.email },
      });

      if (emailConflict) {
        return res.status(409).json({
          success: false,
          error: 'Another team member with this email already exists',
        });
      }
    }

    // Delete old photo if a new one is uploaded or existing one is cleared
    if ((req as any).file && existingMember.photo) {
      deleteImageFile(existingMember.photo);
    } else if (value.photo === null && existingMember.photo) {
      deleteImageFile(existingMember.photo);
    }

    // Convert social_links array to JSON string if provided
    const updateData: any = { ...value };
    if (value.social_links) {
      updateData.social_links = JSON.stringify(value.social_links);
    }

    // Update the team member
    const updatedMember = await (prisma as any).team.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Parse social_links back to array for response
    let socialLinks = [];
    try {
      socialLinks = updatedMember.social_links ? JSON.parse(updatedMember.social_links) : [];
    } catch (e) {
      logger.warn('Failed to parse social_links for updated member', { memberId: updatedMember.id, social_links: updatedMember.social_links });
      socialLinks = [];
    }
    const memberWithParsedLinks = {
      ...updatedMember,
      social_links: socialLinks,
    };

    logger.info('Team member updated successfully', {
      id,
      name: updatedMember.name,
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'Team member updated successfully',
      data: { member: memberWithParsedLinks },
    });
  } catch (error: any) {
    logger.error('Failed to update team member', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update team member',
    });
  }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team member ID',
      });
    }

    // Check if team member exists
    const existingMember = await (prisma as any).team.findUnique({
      where: { id: Number(id) },
    });

    if (!existingMember) {
      logger.warn('Team member not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Team member not found',
      });
    }

    // Delete the team member
    await (prisma as any).team.delete({
      where: { id: Number(id) },
    });

    logger.info('Team member deleted successfully', {
      id,
      name: existingMember.name,
      email: existingMember.email,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Team member deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete team member', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete team member',
    });
  }
};