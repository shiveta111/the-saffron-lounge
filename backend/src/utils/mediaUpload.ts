import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../assets/uploads/media-library');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// SECURITY FIX: Enhanced file filter with extension validation
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // Check MIME type
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }

  // Validate file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp are allowed.'));
  }

  cb(null, true);
};

// Configure disk storage for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// Use disk storage for local file uploads
export const uploadMedia = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});
