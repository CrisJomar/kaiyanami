import express from 'express';
import { Request, Response } from 'express';
import categoryController from '../controllers/categoryController';
import { auth } from '../utils/middlewareHelpers';

const router = express.Router();

// GET all categories
router.get('/', (req: Request, res: Response) => {
  categoryController.getAllCategories(req, res)
    .catch(err => {
      console.error('Error in GET /categories:', err);
      res.status(500).json({ error: 'Failed to retrieve categories' });
    });
});

// GET category by ID
router.get('/:id', (req: Request, res: Response) => {
  categoryController.getCategoryById(req, res)
    .catch(err => {
      console.error('Error in GET /categories/:id:', err);
      res.status(500).json({ error: 'Failed to retrieve category' });
    });
});

// POST new category (admin only)

router.post('/', auth, (req: Request, res: Response) => {
  // Check if createCategory exists on the controller
  if (categoryController.createCategory) {
    categoryController.createCategory(req, res)
      .catch(err => {
        console.error('Error in POST /categories:', err);
        res.status(500).json({ error: 'Failed to create category' });
      });
  } else {
    // Fallback if the function doesn't exist
    console.error('categoryController.createCategory is not defined');
    res.status(501).json({ error: 'Create category functionality not implemented' });
  }
});

// PUT/update category
router.put('/:id', auth, (req: Request, res: Response) => {
  if (categoryController.updateCategory) {
    categoryController.updateCategory(req, res)
      .catch(err => {
        console.error('Error in PUT /categories/:id:', err);
        res.status(500).json({ error: 'Failed to update category' });
      });
  } else {
    res.status(501).json({ error: 'Update category functionality not implemented' });
  }
});

// DELETE category
router.delete('/:id', auth, (req: Request, res: Response) => {
  if (categoryController.deleteCategory) {
    categoryController.deleteCategory(req, res)
      .catch(err => {
        console.error('Error in DELETE /categories/:id:', err);
        res.status(500).json({ error: 'Failed to delete category' });
      });
  } else {
    res.status(501).json({ error: 'Delete category functionality not implemented' });
  }
});

export default router;