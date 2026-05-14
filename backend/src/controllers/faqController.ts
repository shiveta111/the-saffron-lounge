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
  defaultMeta: { service: 'faq-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/faq-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/faq.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createFAQSchema = Joi.object({
  question: Joi.string().min(1).max(1000).required(),
  answer: Joi.string().min(1).max(5000).required(),
  category: Joi.string().min(1).max(100).required(),
  tags: Joi.array().items(Joi.string()).optional().default([]),
});

const updateFAQSchema = Joi.object({
  question: Joi.string().min(1).max(1000).optional(),
  answer: Joi.string().min(1).max(5000).optional(),
  category: Joi.string().min(1).max(100).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  category: Joi.string().optional(),
  search: Joi.string().optional(),
});

// Controller functions
export const getAllFAQs = async (req: Request, res: Response) => {
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

    const { page, limit, category, search } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (category && category !== '') where.category = category;
    if (search && search !== '') {
      where.OR = [
        { question: { contains: search } },
        { answer: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    // Get FAQs
    const faqs = await (prisma as any).fAQ.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    // Parse tags from JSON strings back to arrays
    const faqsWithParsedTags = faqs.map((faq: any) => {
      let tags = [];
      try {
        tags = faq.tags ? JSON.parse(faq.tags) : [];
      } catch (e) {
        logger.warn('Failed to parse tags for FAQ', { faqId: faq.id, tags: faq.tags });
        tags = [];
      }
      return {
        ...faq,
        tags,
      };
    });

    // Get total count
    const total = await (prisma as any).fAQ.count({ where });

    logger.info('FAQs retrieved successfully', {
      count: faqs.length,
      total,
      page,
      limit,
      filters: { category, search },
    });

    res.json({
      success: true,
      data: {
        faqs: faqsWithParsedTags,
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
    logger.error('Failed to retrieve FAQs', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve FAQs',
    });
  }
};

export const getFAQById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FAQ ID',
      });
    }

    const faq = await (prisma as any).fAQ.findUnique({
      where: { id: Number(id) },
    });

    if (!faq) {
      logger.warn('FAQ not found', { id });
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
      });
    }

    // Parse tags from JSON string back to array
    let tags = [];
    try {
      tags = faq.tags ? JSON.parse(faq.tags) : [];
    } catch (e) {
      logger.warn('Failed to parse tags for FAQ', { faqId: faq.id, tags: faq.tags });
      tags = [];
    }
    const faqWithParsedTags = {
      ...faq,
      tags,
    };

    logger.info('FAQ retrieved successfully', { id, question: faq.question });

    res.json({
      success: true,
      data: { faq: faqWithParsedTags },
    });
  } catch (error) {
    logger.error('Failed to retrieve FAQ', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve FAQ',
    });
  }
};

export const createFAQ = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createFAQSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid FAQ data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid FAQ data',
        details: error.details?.[0]?.message,
      });
    }

    const { question, answer, category, tags } = value;

    // Convert tags array to JSON string
    const tagsJson = JSON.stringify(tags || []);

    // Create the FAQ
    const faq = await (prisma as any).fAQ.create({
      data: {
        question,
        answer,
        category,
        tags: tagsJson,
      },
    });

    // Parse tags back to array for response
    let parsedTags = [];
    try {
      parsedTags = JSON.parse(faq.tags);
    } catch (e) {
      logger.warn('Failed to parse tags for created FAQ', { faqId: faq.id, tags: faq.tags });
      parsedTags = [];
    }
    const faqWithParsedTags = {
      ...faq,
      tags: parsedTags,
    };

    logger.info('FAQ created successfully', {
      id: faq.id,
      question: faq.question,
      category: faq.category,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: { faq: faqWithParsedTags },
    });
  } catch (error) {
    logger.error('Failed to create FAQ', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create FAQ',
    });
  }
};

export const updateFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FAQ ID',
      });
    }

    // Validate request body
    const { error, value } = updateFAQSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid FAQ update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid FAQ update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if FAQ exists
    const existingFAQ = await (prisma as any).fAQ.findUnique({
      where: { id: Number(id) },
    });

    if (!existingFAQ) {
      logger.warn('FAQ not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
      });
    }

    // Convert tags array to JSON string if provided
    const updateData: any = { ...value };
    if (value.tags) {
      updateData.tags = JSON.stringify(value.tags);
    }

    // Update the FAQ
    const updatedFAQ = await (prisma as any).fAQ.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Parse tags back to array for response
    let tags = [];
    try {
      tags = updatedFAQ.tags ? JSON.parse(updatedFAQ.tags) : [];
    } catch (e) {
      logger.warn('Failed to parse tags for updated FAQ', { faqId: updatedFAQ.id, tags: updatedFAQ.tags });
      tags = [];
    }
    const faqWithParsedTags = {
      ...updatedFAQ,
      tags,
    };

    logger.info('FAQ updated successfully', {
      id,
      question: updatedFAQ.question,
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'FAQ updated successfully',
      data: { faq: faqWithParsedTags },
    });
  } catch (error) {
    logger.error('Failed to update FAQ', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update FAQ',
    });
  }
};

export const deleteFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FAQ ID',
      });
    }

    // Check if FAQ exists
    const existingFAQ = await (prisma as any).fAQ.findUnique({
      where: { id: Number(id) },
    });

    if (!existingFAQ) {
      logger.warn('FAQ not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
      });
    }

    // Delete the FAQ
    await (prisma as any).fAQ.delete({
      where: { id: Number(id) },
    });

    logger.info('FAQ deleted successfully', {
      id,
      question: existingFAQ.question,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete FAQ', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete FAQ',
    });
  }
};