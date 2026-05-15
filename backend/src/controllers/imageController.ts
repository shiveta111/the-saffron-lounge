import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs'; 

/**
 * Serve uploaded images via API endpoint
 * This avoids conflicts with frontend static assets
 */
export const serveUploadedImage = async (req: Request, res: Response) => {
  try {
    const { folder, filename } = req.params;
    
    // Validate params exist
    if (!folder || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Folder and filename are required',
      });
    }
    
    // Validate folder to prevent directory traversal
    const allowedFolders = ['products', 'menu-items', 'blogs', 'team', 'testimonials'];
    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid folder',
      });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    
    // Construct file path
    const filePath = path.join(
      process.cwd(),
      'public',
      'assets',
      'uploads',
      folder,
      sanitizedFilename
    );

    // Check if file exists — serve placeholder silently if missing
    if (!fs.existsSync(filePath)) {
      const fallbackPath = path.join(
        process.cwd(),
        'public',
        'assets',
        'uploads',
        'menu-items',
        'coming-soon-1765125090194-848291736.png'
      );
      if (fs.existsSync(fallbackPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return fs.createReadStream(fallbackPath).pipe(res);
      }
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    // Get file stats for headers
    const stat = fs.statSync(filePath);
    
    // Determine content type based on extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error serving image',
        });
      }
    });
  } catch (error: any) {
    console.error('Image serve error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve image',
      details: error.message,
    });
  }
};
