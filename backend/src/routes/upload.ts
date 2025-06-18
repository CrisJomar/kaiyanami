import express, { Request, Response, NextFunction } from 'express';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import uploadController from '../controllers/uploadController';

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only .jpeg, .jpg, .png and .webp formats allowed!'));
  }
});

// Define routes with proper controller functions
router.post('/image', auth, upload.single('image'), (req: Request, res: Response, next: NextFunction) => {
  uploadController.uploadImage(req, res)
    .catch(next);
});

// Fix product-image upload
router.post('/product-image', auth, upload.single('productImage'), (req: Request, res: Response, next: NextFunction) => {
  if (typeof uploadController.uploadProductImage === 'function') {
    uploadController.uploadProductImage(req, res)
      .catch(next);
  } else {
    res.status(501).json({ error: 'Upload product image functionality not implemented yet' });
  }
});

// Fix multiple image upload
router.post('/multiple', auth, upload.array('images', 5), (req: Request, res: Response, next: NextFunction) => {
  uploadController.uploadMultipleImages(req, res)
    .catch(next);
});

router.get('/protected-route', auth, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

router.post('/', auth, upload.single('image'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return; 
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const relativePath = `/uploads/${req.file.filename}`;
    const fileUrl = baseUrl + relativePath;
    
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

export default router;