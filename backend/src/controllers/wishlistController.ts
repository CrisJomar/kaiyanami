import { Request, Response } from "express";
import { WishlistService } from "../services/wishlistService";

export class WishlistController {
  static async getWishlist(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const wishlist = await WishlistService.getWishlist(userId);
      res.status(200).json(wishlist);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
    }
  }

  static async addToWishlist(req: Request, res: Response) {
    try {
      const { userId, productId } = req.body;
      if (!userId || !productId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const wishlistItem = await WishlistService.addToWishlist(userId, productId);
      res.status(201).json(wishlistItem);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
    }
  }

  static async removeFromWishlist(req: Request, res: Response) {
    try {
      const { userId, productId } = req.body;
      await WishlistService.removeFromWishlist(userId, productId);
      res.status(200).json({ message: "Item removed from wishlist" });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
    }
  }
}
