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
  defaultMeta: { service: 'blog-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/blog-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/blog.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const parseTagsSafe = (rawTags: unknown): string[] => {
  if (!rawTags) return [];

  if (Array.isArray(rawTags)) {
    return rawTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
  }

  if (typeof rawTags !== 'string') return [];

  const trimmed = rawTags.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
    }
  } catch {
    // Fallback for legacy comma-separated tags
  }

  return trimmed
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const isAcceptedImagePath = (value: string): boolean => {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/assets/') ||
    value.startsWith('/api/')
  );
};

// Validation schemas
const createBlogSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  slug: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).required(),
  featured_image: Joi.string().optional().allow('', null).custom((value, helpers) => {
    // Allow empty strings, null, or valid URIs/paths
    if (!value || value === '') return value;
    if (isAcceptedImagePath(value)) {
      return value;
    }
    return helpers.error('string.uri');
  }),
  tags: Joi.array().items(Joi.string()).optional().default([]),
  published_status: Joi.boolean().optional().default(false),
  meta_title: Joi.string().max(60).optional(),
  meta_description: Joi.string().max(160).optional(),
  author_id: Joi.number().integer().optional(),
  category_id: Joi.number().integer().optional().allow(null),
});

const updateBlogSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  slug: Joi.string().min(1).max(200).optional().allow(''),
  content: Joi.string().min(1).optional().allow(''),
  featured_image: Joi.string().optional().allow('', null).custom((value, helpers) => {
    // Allow empty strings, null, or valid URIs/paths
    if (!value || value === '') return value;
    if (isAcceptedImagePath(value)) {
      return value;
    }
    return helpers.error('string.uri');
  }),
  tags: Joi.array().items(Joi.string()).optional(),
  published_status: Joi.boolean().optional(),
  meta_title: Joi.string().max(60).optional().allow(''),
  meta_description: Joi.string().max(160).optional().allow(''),
  author_id: Joi.number().integer().optional(),
  category_id: Joi.number().integer().optional().allow(null, ''),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  search: Joi.string().optional(),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'title').optional().default('created_at'),
  order: Joi.string().valid('asc', 'desc').optional().default('desc'),
  published_status: Joi.boolean().optional(),
  category_id: Joi.number().integer().optional(),
});

// Controller functions
export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { error: error.details?.[0]?.message, query: req.query });
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
      return;
    }

    const { page, limit, search, sort_by, order, published_status, category_id } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    if (published_status !== undefined) {
      where.published_status = published_status;
    }
    if (category_id !== undefined) {
      where.category_id = category_id;
    }

    // Get blogs with pagination
    const blogs = await (prisma as any).blog.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
      orderBy: { [sort_by]: order },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await (prisma as any).blog.count({ where });

    // Parse tags from JSON strings back to arrays
    const blogsWithParsedTags = blogs.map((blog: any) => ({
      ...blog,
      tags: parseTagsSafe(blog.tags),
    }));

    logger.info('Blogs retrieved successfully', {
      count: blogs.length,
      total,
      page,
      limit,
      search,
    });

    res.json({
      success: true,
      data: {
        blogs: blogsWithParsedTags,
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
    logger.error('Failed to retrieve blogs', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blogs',
    });
  }
};

export const getBlogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blog ID',
      });
    }

    const blog = await (prisma as any).blog.findUnique({
      where: { id: Number(id) },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    });

    if (!blog) {
      logger.warn('Blog not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Blog post not found',
      });
    }

    // Parse tags from JSON string back to array
    const parsedBlogTags = parseTagsSafe(blog.tags);
    const blogWithParsedTags = {
      ...blog,
      tags: parsedBlogTags,
    };

    // Get related posts (same tags, excluding current post)
    let relatedPosts = [];
    if (parsedBlogTags.length > 0) {
      const tags = parsedBlogTags;
      relatedPosts = await (prisma as any).blog.findMany({
        where: {
          id: { not: Number(id) },
          published_status: true,
          OR: tags.map((tag: string) => ({
            tags: { contains: tag },
          })),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          featured_image: true,
          created_at: true,
        },
        take: 3,
        orderBy: { created_at: 'desc' },
      });
    }

    logger.info('Blog retrieved successfully', { id, title: blog.title });

    res.json({
      success: true,
      data: {
        blog: blogWithParsedTags,
        relatedPosts,
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve blog', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blog post',
    });
  }
};

export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug || !slug.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blog slug',
      });
    }

    const blog = await (prisma as any).blog.findFirst({
      where: {
        slug: {
          equals: decodeURIComponent(slug),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    });

    if (!blog) {
      logger.warn('Blog not found by slug', { slug });
      return res.status(404).json({
        success: false,
        error: 'Blog post not found',
      });
    }

    const parsedBlogTags = parseTagsSafe(blog.tags);
    const blogWithParsedTags = {
      ...blog,
      tags: parsedBlogTags,
    };

    let relatedPosts = [];
    if (parsedBlogTags.length > 0) {
      const tags = parsedBlogTags;
      relatedPosts = await (prisma as any).blog.findMany({
        where: {
          id: { not: blog.id },
          published_status: true,
          OR: tags.map((tag: string) => ({
            tags: { contains: tag },
          })),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          featured_image: true,
          created_at: true,
        },
        take: 3,
        orderBy: { created_at: 'desc' },
      });
    }

    logger.info('Blog retrieved successfully by slug', { slug, id: blog.id, title: blog.title });

    res.json({
      success: true,
      data: {
        blog: blogWithParsedTags,
        relatedPosts,
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve blog by slug', { error, slug: req.params.slug });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blog post',
    });
  }
};

export const createBlog = async (req: Request, res: Response) => {
  try {
    // Handle FormData if present (multipart/form-data)
    let bodyData: any = req.body;
    if (req.headers['content-type']?.includes('multipart/form-data') || (req as any).file) {
      // If FormData, parse it and map frontend field names to backend field names
      bodyData = {};
      if (req.body.title) bodyData.title = req.body.title;
      if (req.body.slug) bodyData.slug = req.body.slug;
      if (req.body.content) bodyData.content = req.body.content;
      // Don't set featured_image from req.body when processing FormData - it will be set from file upload below
      
      // Map tags (can be string or array)
      if (req.body.tags) {
        try {
          bodyData.tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
        } catch {
          // If parsing fails, try comma-separated string
          if (typeof req.body.tags === 'string') {
            bodyData.tags = req.body.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t);
          } else {
            bodyData.tags = Array.isArray(req.body.tags) ? req.body.tags : [];
          }
        }
      }
      
      // Map status to published_status
      if (req.body.status !== undefined) {
        bodyData.published_status = req.body.status === 'PUBLISHED' || req.body.status === 'true' || req.body.status === true;
      } else if (req.body.published_status !== undefined) {
        bodyData.published_status = req.body.published_status === 'true' || req.body.published_status === true;
      }
      
      // Map SEO fields
      if (req.body.seoTitle || req.body.meta_title) {
        bodyData.meta_title = req.body.seoTitle || req.body.meta_title;
      }
      if (req.body.seoDescription || req.body.meta_description) {
        bodyData.meta_description = req.body.seoDescription || req.body.meta_description;
      }
      
      if (req.body.author_id) bodyData.author_id = parseInt(req.body.author_id);
      if (req.body.category_id !== undefined) {
        bodyData.category_id = req.body.category_id === '' || req.body.category_id === 'null' || req.body.category_id === null ? null : parseInt(req.body.category_id);
      }
      
      // Handle featured image file upload if present
      if ((req as any).file) {
        bodyData.featured_image = `/api/v1/images/blogs/${(req as any).file.filename}`;
      } else if (req.body.featured_image && req.body.featured_image.trim() !== '') {
        // Only set from req.body if it's a valid URL/path (not empty string)
        const imageValue = req.body.featured_image.trim();
        if (isAcceptedImagePath(imageValue)) {
          bodyData.featured_image = imageValue;
        }
      }
    }

    // Validate request body
    const { error, value } = createBlogSchema.validate(bodyData);
    if (error) {
      logger.warn('Invalid blog data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid blog data',
        details: error.details?.[0]?.message,
      });
    }

    const { title, slug, content, featured_image, tags, published_status, meta_title, meta_description, author_id, category_id } = value;

    // Check if slug already exists
    const existingBlog = await (prisma as any).blog.findUnique({
      where: { slug },
    });

    if (existingBlog) {
      return res.status(409).json({
        success: false,
        error: 'Blog post with this slug already exists',
      });
    }

    // Convert tags array to JSON string
    const tagsJson = JSON.stringify(tags || []);

    // Create the blog post
    const blog = await (prisma as any).blog.create({
      data: {
        title,
        slug,
        content,
        featured_image,
        tags: tagsJson,
        published_status,
        meta_title,
        meta_description,
        author_id,
        category_id: category_id || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    });

    // Parse tags back to array for response
    const blogWithParsedTags = {
      ...blog,
      tags: parseTagsSafe(blog.tags),
    };

    logger.info('Blog post created successfully', {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      authorId: author_id,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: { blog: blogWithParsedTags },
    });
  } catch (error) {
    logger.error('Failed to create blog post', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create blog post',
    });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blog ID',
      });
    }

    // Handle FormData if present (multipart/form-data)
    let bodyData: any = req.body;
    if (req.headers['content-type']?.includes('multipart/form-data') || (req as any).file) {
      // If FormData, parse it and map frontend field names to backend field names
      bodyData = {};
      if (req.body.title) bodyData.title = req.body.title;
      if (req.body.slug) bodyData.slug = req.body.slug;
      if (req.body.content) bodyData.content = req.body.content;
      if (req.body.featured_image) bodyData.featured_image = req.body.featured_image;
      
      // Map tags (can be string or array)
      if (req.body.tags) {
        try {
          bodyData.tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
        } catch {
          // If parsing fails, try comma-separated string
          if (typeof req.body.tags === 'string') {
            bodyData.tags = req.body.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t);
          } else {
            bodyData.tags = Array.isArray(req.body.tags) ? req.body.tags : [];
          }
        }
      }
      
      // Map status to published_status (DRAFT/PUBLISHED/ARCHIVED -> boolean)
      if (req.body.status !== undefined) {
        bodyData.published_status = req.body.status === 'PUBLISHED';
      } else if (req.body.published_status !== undefined) {
        bodyData.published_status = req.body.published_status === 'true' || req.body.published_status === true;
      }
      
      // Map SEO fields
      if (req.body.seoTitle || req.body.meta_title) {
        bodyData.meta_title = req.body.seoTitle || req.body.meta_title;
      }
      if (req.body.seoDescription || req.body.meta_description) {
        bodyData.meta_description = req.body.seoDescription || req.body.meta_description;
      }
      
      if (req.body.author_id) bodyData.author_id = parseInt(req.body.author_id);
      if (req.body.category_id !== undefined) {
        bodyData.category_id = req.body.category_id === '' || req.body.category_id === 'null' || req.body.category_id === null ? null : parseInt(req.body.category_id);
      }
      
      // Handle featured image file upload if present
      if ((req as any).file) {
        bodyData.featured_image = `/api/v1/images/blogs/${(req as any).file.filename}`;
      } else if (req.body.featured_image && req.body.featured_image.trim() !== '') {
        // Only set from req.body if it's a valid URL/path (not empty string)
        const imageValue = req.body.featured_image.trim();
        if (isAcceptedImagePath(imageValue)) {
          bodyData.featured_image = imageValue;
        }
      }
    }

    // Validate request body
    const { error, value } = updateBlogSchema.validate(bodyData, { allowUnknown: true, stripUnknown: false });
    if (error) {
      logger.warn('Invalid blog update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid blog update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if blog exists
    const existingBlog = await (prisma as any).blog.findUnique({
      where: { id: Number(id) },
    });

    if (!existingBlog) {
      logger.warn('Blog not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Blog post not found',
      });
    }

    // Check slug uniqueness if being updated
    if (value.slug && value.slug !== existingBlog.slug) {
      const slugConflict = await (prisma as any).blog.findUnique({
        where: { slug: value.slug },
      });

      if (slugConflict) {
        return res.status(409).json({
          success: false,
          error: 'Another blog post with this slug already exists',
        });
      }
    }

    // Convert tags array to JSON string if provided
    const updateData: any = { ...value };
    if (value.tags !== undefined) {
      updateData.tags = JSON.stringify(value.tags);
    }
    
    // Ensure published_status is included if status was provided (even if false)
    // This is important because false is a valid value and shouldn't be filtered out
    if (value.published_status !== undefined) {
      updateData.published_status = value.published_status;
    }
    
    // Remove undefined/null/empty values to allow partial updates (except category_id and published_status which can be null/false)
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || (updateData[key] === null && key !== 'category_id' && key !== 'published_status')) {
        delete updateData[key];
      }
    });

    // Update the blog post
    const updatedBlog = await (prisma as any).blog.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    });

    // Parse tags back to array for response
    const blogWithParsedTags = {
      ...updatedBlog,
      tags: parseTagsSafe(updatedBlog.tags),
    };

    logger.info('Blog post updated successfully', {
      id,
      title: updatedBlog.title,
      slug: updatedBlog.slug,
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'Blog post updated successfully',
      data: { blog: blogWithParsedTags },
    });
  } catch (error) {
    logger.error('Failed to update blog post', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update blog post',
    });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blog ID',
      });
    }

    // Check if blog exists
    const existingBlog = await (prisma as any).blog.findUnique({
      where: { id: Number(id) },
    });

    if (!existingBlog) {
      logger.warn('Blog not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Blog post not found',
      });
    }

    // Delete the blog post
    await (prisma as any).blog.delete({
      where: { id: Number(id) },
    });

    logger.info('Blog post deleted successfully', {
      id,
      title: existingBlog.title,
      slug: existingBlog.slug,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Blog post deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete blog post', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete blog post',
    });
  }
};