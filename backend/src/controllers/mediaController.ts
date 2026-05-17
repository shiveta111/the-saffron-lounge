import { Request, Response } from 'express';
import prisma from '../config/prisma';
import fs from 'fs';
import path from 'path';

export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    // File is already saved to disk by multer
    // Generate the URL path for frontend access
    const fileUrl = `/assets/uploads/media-library/${req.file.filename}`;

    // Create Media record in database
    let media;
    try {
      media = await prisma.media.create({
        data: {
          name: req.file.originalname,
          url: fileUrl,
          public_id: req.file.filename, // Store filename for deletion
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (dbError: any) {
      // Handle case where media table doesn't exist yet
      if (dbError.message?.includes('Table') && dbError.message?.includes("doesn't exist")) {
        console.warn('⚠️  Media table does not exist. Please run database migration.');
        
        // Delete the uploaded file since we can't save to DB
        if (req.file?.filename) {
          const filePath = path.join(__dirname, '../../assets/uploads/media-library', req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        
        return res.status(503).json({
          success: false,
          error: 'Media table not found',
          message: 'Please run database migration: npx prisma migrate dev --name add_media_table',
          details: 'The media table needs to be created in the database before uploading files.',
        });
      }
      throw dbError;
    }

    console.log('✅ Media uploaded successfully:', {
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size,
    });

    res.status(200).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        id: media.id,
        name: media.name,
        url: media.url,
        mimetype: media.mimetype,
        size: media.size,
        createdAt: media.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    
    // If database save fails, delete the uploaded file
    if (req.file?.filename) {
      const filePath = path.join(__dirname, '../../assets/uploads/media-library', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload media',
      details: error.message,
    });
  }
};

export const getAllMedia = async (req: Request, res: Response) => {
  // Define page and limit outside try block so they're accessible in catch block
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  try {
    const search = req.query.search as string || '';
    const skip = (page - 1) * limit;

    const where = search
      ? {
          name: {
            contains: search,
          },
        }
      : {};

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.media.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: media,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error('Get media error:', error);
    
    // Handle case where media table doesn't exist yet
    if (error.message?.includes('Table') && error.message?.includes("doesn't exist")) {
      console.warn('⚠️  Media table does not exist. Please run database migration.');
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        message: 'Media table not found. Please run database migration.',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch media',
      details: error.message,
    });
  }
};

export const deleteMedia = async (req: Request, res: Response) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Media ID is required',
      });
    }
    
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid media ID',
      });
    }

    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
      });
    }

    // Delete physical file from disk if public_id (filename) exists
    if (media.public_id) {
      try {
        const filePath = path.join(__dirname, '../../assets/uploads/media-library', media.public_id);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('✅ File deleted from disk:', media.public_id);
        }
      } catch (error) {
        console.error('Failed to delete file from disk:', error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await prisma.media.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete media',
      details: error.message,
    });
  }
};
