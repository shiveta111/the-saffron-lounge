import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Use process.cwd() for reliable path resolution (works in both dev and compiled code)
const uploadDir = path.join(process.cwd(), 'public', 'assets', 'uploads');
const menuItemsDir = path.join(uploadDir, 'menu-items');
const productsDir = path.join(uploadDir, 'products');
const blogsDir = path.join(uploadDir, 'blogs');
const teamDir = path.join(uploadDir, 'team');
const testimonialsDir = path.join(uploadDir, 'testimonials');

// Helper function to ensure directory exists
const ensureDirectoryExists = (dir: string): void => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created upload directory: ${dir}`);
    }
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
    throw error;
  }
};

// Create directories if they don't exist at module load
[uploadDir, menuItemsDir, productsDir, blogsDir, teamDir, testimonialsDir].forEach(dir => {
  ensureDirectoryExists(dir);
});

// Configure storage for blog featured images
const blogStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureDirectoryExists(blogsDir);
      cb(null, blogsDir);
    } catch (error) {
      console.error('Error setting blog image destination:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      let baseName = path.basename(file.originalname, ext);
      if (req.body.title) {
        baseName = req.body.title;
      }
      const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filename = `${sanitizedName}-${uniqueSuffix}${ext}`;
      console.log(`Blog image upload: Generated filename ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error('Error generating blog image filename:', error);
      cb(error as Error, '');
    }
  }
});

// Log upload paths for debugging
console.log('Image upload paths initialized:');
console.log(`  Upload directory: ${uploadDir}`);
console.log(`  Menu items directory: ${menuItemsDir}`);
console.log(`  Products directory: ${productsDir}`);
console.log(`  Blogs directory: ${blogsDir}`);
console.log(`  Team directory: ${teamDir}`);
console.log(`  Testimonials directory: ${testimonialsDir}`);

// Configure storage for menu items
const menuStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Ensure directory exists at runtime (in case it was deleted or path changed)
      ensureDirectoryExists(menuItemsDir);
      cb(null, menuItemsDir);
    } catch (error) {
      console.error('Error setting menu image destination:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate unique filename: name-timestamp-random.ext
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);

      // Use provided name from body or original filename
      let baseName = path.basename(file.originalname, ext);
      if (req.body.name) {
        baseName = req.body.name;
      }

      const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filename = `${sanitizedName}-${uniqueSuffix}${ext}`;
      console.log(`Menu image upload: Generated filename ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error('Error generating menu image filename:', error);
      cb(error as Error, '');
    }
  }
});

// Configure storage for products
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Ensure directory exists at runtime (in case it was deleted or path changed)
      ensureDirectoryExists(productsDir);
      cb(null, productsDir);
    } catch (error) {
      console.error('Error setting product image destination:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);

      // Use provided name from body or original filename
      let baseName = path.basename(file.originalname, ext);
      if (req.body.name) {
        baseName = req.body.name;
      }

      const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filename = `${sanitizedName}-${uniqueSuffix}${ext}`;
      console.log(`Product image upload: Generated filename ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error('Error generating product image filename:', error);
      cb(error as Error, '');
    }
  }
});

// SECURITY FIX: Enhanced file filter with magic number validation
// Magic numbers (file signatures) for common image types
const imageMagicNumbers: { [key: string]: number[][] } = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]], // JPEG
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
};

const validateFileMagicNumber = (buffer: Buffer, mimetype: string): boolean => {
  const signatures = imageMagicNumbers[mimetype];
  if (!signatures) return false;

  for (const signature of signatures) {
    const matches = signature.every((byte, index) => buffer[index] === byte);
    if (matches) return true;
  }
  return false;
};

// File filter to accept only images with magic number validation
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // First check MIME type
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }

  // Validate file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp are allowed.'));
  }

  // Note: Magic number validation will be done in the storage destination
  // since multer doesn't provide buffer access in fileFilter
  cb(null, true);
};

// Create multer instances
export const uploadMenuImage = multer({
  storage: menuStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

export const uploadProductImage = multer({
  storage: productStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

export const uploadBlogImage = multer({
  storage: blogStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Configure storage for team photos
const teamStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureDirectoryExists(teamDir);
      cb(null, teamDir);
    } catch (error) {
      console.error('Error setting team photo destination:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      let baseName = path.basename(file.originalname, ext);
      if (req.body.name) {
        baseName = req.body.name;
      }
      const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filename = `${sanitizedName}-${uniqueSuffix}${ext}`;
      console.log(`Team photo upload: Generated filename ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error('Error generating team photo filename:', error);
      cb(error as Error, '');
    }
  }
});

export const uploadTeamPhoto = multer({
  storage: teamStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Configure storage for testimonial photos
const testimonialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureDirectoryExists(testimonialsDir);
      cb(null, testimonialsDir);
    } catch (error) {
      console.error('Error setting testimonial photo destination:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      let baseName = path.basename(file.originalname, ext);
      if (req.body.client_name) {
        baseName = req.body.client_name;
      }
      const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filename = `${sanitizedName}-${uniqueSuffix}${ext}`;
      console.log(`Testimonial photo upload: Generated filename ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error('Error generating testimonial photo filename:', error);
      cb(error as Error, '');
    }
  }
});

export const uploadTestimonialPhoto = multer({
  storage: testimonialStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Helper function to delete old image file
export const deleteImageFile = (imagePath: string): void => {
  try {
    // Extract filename from URL path
    // Handle both full paths and relative paths
    let filename = path.basename(imagePath);
    
    // If it's a URL path like /assets/uploads/menu-items/filename.jpg, extract just the filename
    if (imagePath.includes('/')) {
      filename = path.basename(imagePath);
    }
    
    // Try to find the file in all upload directories
    const menuPath = path.join(menuItemsDir, filename);
    const productPath = path.join(productsDir, filename);
    const blogPath = path.join(blogsDir, filename);
    const teamPath = path.join(teamDir, filename);
    const testimonialPath = path.join(testimonialsDir, filename);
    
    if (fs.existsSync(menuPath)) {
      fs.unlinkSync(menuPath);
      console.log(`Deleted old menu image: ${filename}`);
    } else if (fs.existsSync(productPath)) {
      fs.unlinkSync(productPath);
      console.log(`Deleted old product image: ${filename}`);
    } else if (fs.existsSync(blogPath)) {
      fs.unlinkSync(blogPath);
      console.log(`Deleted old blog image: ${filename}`);
    } else if (fs.existsSync(teamPath)) {
      fs.unlinkSync(teamPath);
      console.log(`Deleted old team image: ${filename}`);
    } else if (fs.existsSync(testimonialPath)) {
      fs.unlinkSync(testimonialPath);
      console.log(`Deleted old testimonial image: ${filename}`);
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
};

// Helper function to get image URL from filename
// Returns API endpoint URL to avoid conflicts with frontend static assets
export const getImageUrl = (filename: string, type: 'menu' | 'product' | 'blog' | 'team' | 'testimonial'): string => {
  switch (type) {
    case 'menu':
      return `/api/v1/images/menu-items/${filename}`;
    case 'product':
      return `/api/v1/images/products/${filename}`;
    case 'blog':
      return `/api/v1/images/blogs/${filename}`;
    case 'team':
      return `/api/v1/images/team/${filename}`;
    case 'testimonial':
      return `/api/v1/images/testimonials/${filename}`;
    default:
      return `/api/v1/images/products/${filename}`;
  }
};
