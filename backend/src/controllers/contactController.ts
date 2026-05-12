import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'contact-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/contact-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/contact.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createContactSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  subject: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).required(),
});

const updateContactSchema = Joi.object({
  status: Joi.string().valid('unread', 'read', 'replied').required(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  status: Joi.string().valid('unread', 'read', 'replied').optional(),
  sort_by: Joi.string().valid('created_at', 'name', 'email').optional().default('created_at'),
  order: Joi.string().valid('asc', 'desc').optional().default('desc'),
});

// Controller functions
export const getAllContacts = async (req: Request, res: Response) => {
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

    const { page, limit, status, sort_by, order } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;

    // Get contacts with pagination
    const contacts = await (prisma as any).contact.findMany({
      where,
      orderBy: { [sort_by]: order },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await (prisma as any).contact.count({ where });

    logger.info('Contacts retrieved successfully', {
      count: contacts.length,
      total,
      page,
      limit,
      status,
    });

    res.json({
      success: true,
      data: {
        contacts,
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
  } catch (error) {
    logger.error('Failed to retrieve contacts', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contacts',
    });
  }
};

export const createContact = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createContactSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid contact data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid contact data',
        details: error.details?.[0]?.message,
      });
    }

    const { name, email, subject, message } = value;

    // Create the contact submission
    const contact = await (prisma as any).contact.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    logger.info('Contact submission created successfully', {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
    });

    // TODO: Send email notification here
    // await sendContactNotification(contact);

    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully. We will get back to you soon!',
      data: { contact },
    });
  } catch (error) {
    logger.error('Failed to create contact submission', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form',
    });
  }
};

export const updateContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contact ID',
      });
    }

    // Validate request body
    const { error, value } = updateContactSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid contact update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid contact update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if contact exists
    const existingContact = await (prisma as any).contact.findUnique({
      where: { id: Number(id) },
    });

    if (!existingContact) {
      logger.warn('Contact not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Contact submission not found',
      });
    }

    // Update the contact
    const updatedContact = await (prisma as any).contact.update({
      where: { id: Number(id) },
      data: value,
    });

    logger.info('Contact updated successfully', {
      id,
      name: updatedContact.name,
      status: updatedContact.status,
      updatedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Contact status updated successfully',
      data: { contact: updatedContact },
    });
  } catch (error) {
    logger.error('Failed to update contact', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update contact',
    });
  }
};

export const deleteContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contact ID',
      });
    }

    // Check if contact exists
    const existingContact = await (prisma as any).contact.findUnique({
      where: { id: Number(id) },
    });

    if (!existingContact) {
      logger.warn('Contact not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Contact submission not found',
      });
    }

    // Delete the contact
    await (prisma as any).contact.delete({
      where: { id: Number(id) },
    });

    logger.info('Contact deleted successfully', {
      id,
      name: existingContact.name,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Contact submission deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete contact', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact submission',
    });
  }
};