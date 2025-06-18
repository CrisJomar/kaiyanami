import { Request, Response } from 'express';
import * as wishlistService from '../services/wishlistService';

export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const wishlist = await wishlistService.getWishlistForUser(userId);
    res.json(wishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await wishlistService.addToWishlist(userId, productId);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const { wishlistItemId } = req.body;
    await wishlistService.removeFromWishlist(wishlistItemId);
    res.status(200).json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
