import { Request, Response } from 'express';

const uploadController = {
  uploadImage: async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      
      // Process the uploaded file
      const fileUrl = `/uploads/${file.filename}`;
      
      res.status(200).json({
        success: true,
        fileUrl,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  },
  
  uploadProductImage: async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No product image uploaded' });
        return;
      }
      
      // Process the uploaded product image
      const fileUrl = `/uploads/${file.filename}`;
      
      res.status(200).json({
        success: true,
        fileUrl,
        message: 'Product image uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading product image:', error);
      res.status(500).json({ error: 'Product image upload failed' });
    }
  },
  
  uploadMultipleImages: async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }
      
      // Process the uploaded files
      const fileUrls = files.map(file => `/uploads/${file.filename}`);
      
      res.status(200).json({
        success: true,
        fileUrls,
        message: `${files.length} files uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      res.status(500).json({ error: 'File uploads failed' });
    }
  }
};

export default uploadController;