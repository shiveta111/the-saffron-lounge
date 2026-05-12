import { Request, Response } from 'express';
import { getImageUrl } from '../utils/upload';
import path from 'path';
import fs from 'fs';

/**
 * Upload menu item image
 */
export const uploadMenuItemImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
    }

    // Verify file was actually saved
    const menuItemsDir = path.join(process.cwd(), 'public', 'assets', 'uploads', 'menu-items');
    const filePath = path.join(menuItemsDir, req.file.filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Menu image file not found at expected path: ${filePath}`);
      return res.status(500).json({
        success: false,
        error: 'File was not saved to server',
        details: `Expected path: ${filePath}`,
      });
    }

    console.log(`Menu image uploaded successfully: ${req.file.filename} (${req.file.size} bytes) at ${filePath}`);
    const imageUrl = getImageUrl(req.file.filename, 'menu');

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully ttt',
      data: {
        filename: req.file.filename,
        imageUrl: imageUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: error.message,
    });
  }
};

/**
 * Upload product image
 */
export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
    }

    // Verify file was actually saved
    const productsDir = path.join(process.cwd(), 'public', 'assets', 'uploads', 'products');
    const filePath = path.join(productsDir, req.file.filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Product image file not found at expected path: ${filePath}`);
      return res.status(500).json({
        success: false,
        error: 'File was not saved to server',
        details: `Expected path: ${filePath}`,
      });
    }

    console.log(`Product image uploaded successfully: ${req.file.filename} (${req.file.size} bytes) at ${filePath}`);
    const imageUrl = getImageUrl(req.file.filename, 'product');

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully ttt',
      data: {
        filename: req.file.filename,
        imageUrl: imageUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: error.message,
    });
  }
};
