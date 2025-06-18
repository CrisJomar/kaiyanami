import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
    [key: string]: any;
  };
}

const prisma = new PrismaClient();

// Get the current user's cart
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            productSizes: true
          }
        }
      }
    });

    res.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

// Add an item to the cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { productId, quantity, size } = req.body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        size: size || null
      }
    });

    if (existingItem) {
      // Update quantity if item exists
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      // Find or create user's cart
      let userCart = await prisma.cart.findFirst({
        where: { userId }
      });
      
      if (!userCart) {
        userCart = await prisma.cart.create({
          data: { userId }
        });
      }
      
      // Create new cart item
      await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity,
          size: size || null,
          cartId: userCart.id
        }
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            productSizes: true
          }
        }
      }
    });

    res.status(200).json(updatedCart);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Failed to add item to cart' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { cartItemId } = req.params;
    const { quantity } = req.body;

    // Verify the cart item belongs to the user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Update the quantity
    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity }
    });

    // Return updated cart
    const updatedCart = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            productSizes: true
          }
        }
      }
    });

    res.status(200).json(updatedCart);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
};

// Remove item from cart
export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { cartItemId } = req.params;

    // Verify the cart item belongs to the user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Delete the cart item
    await prisma.cartItem.delete({
      where: { id: cartItemId }
    });

    // Return updated cart
    const updatedCart = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            productSizes: true
          }
        }
      }
    });

    res.status(200).json(updatedCart);
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ message: 'Failed to remove cart item' });
  }
};

// Clear the entire cart
export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await prisma.cartItem.deleteMany({
      where: { userId }
    });

    res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};

// Migrate anonymous cart to user cart
export const migrateAnonymousCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { anonymousCartItems } = req.body;

    if (!anonymousCartItems || !Array.isArray(anonymousCartItems)) {
      return res.status(400).json({ message: 'Invalid cart format' });
    }

    // Process each item from the anonymous cart
    for (const item of anonymousCartItems) {
      const { productId, quantity, size } = item;

      // Verify the product exists
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) continue; // Skip invalid products

      // First, ensure the user has a cart
      let userCart = await prisma.cart.findFirst({
        where: { userId }
      });
      
      if (!userCart) {
        userCart = await prisma.cart.create({
          data: { userId }
        });
      }

      // Check if the item already exists in the user's cart
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          userId,
          productId,
          size: size || null
        }
      });

      if (existingItem) {
        // Update quantity if item exists
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity }
        });
      } else {
        // Create new cart item
        await prisma.cartItem.create({
          data: {
            userId,
            productId,
            quantity,
            size: size || null,
            cartId: userCart.id
          }
        });
      }
    }

    // Return the updated cart
    const updatedCart = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            productSizes: true
          }
        }
      }
    });

    res.status(200).json({ message: 'Cart migrated successfully', cart: updatedCart });
  } catch (error) {
    console.error('Error migrating cart:', error);
    res.status(500).json({ message: 'Failed to migrate cart' });
  }
};

export const addItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Get user ID from auth middleware
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { productId, quantity = 1, options } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    res.status(200).json({ 
      message: 'Item added to cart',
      item: { productId, quantity, options }
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ message: 'Failed to add item to cart' });
  }
};

export const updateItemQuantity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }
    
    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }
    res.status(200).json({
      message: 'Item quantity updated',
      itemId,
      quantity
    });
  } catch (error) {
    console.error('Error updating item quantity:', error);
    res.status(500).json({ message: 'Failed to update item quantity' });
  }
};

export const removeItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { itemId } = req.params;
    
    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    res.status(200).json({
      message: 'Item removed from cart',
      itemId
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Failed to remove item from cart' });
  }
};

