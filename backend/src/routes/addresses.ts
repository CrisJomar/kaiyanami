import express from 'express';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';
import { PrismaClient } from '@prisma/client';

import { Request, Response, NextFunction } from 'express';
import { 
  createAddress, 
  updateAddress, 
  deleteAddress, 
  getAddresses,
  getSavedAddresses 
} from '../controllers/addressController';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function for async handlers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

/**
 * @route GET /api/addresses
 * @desc Get all saved addresses for a user
 * @access Private
 */
router.get('/', verifyToken, asyncHandler(async (req: any, res: any) => {
  try {
    const addresses = await prisma.savedAddress.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' }
    });
    
    res.status(200).json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: 'Failed to fetch addresses' });
  }
}));

/**
 * @route POST /api/addresses
 * @desc Create a new saved address
 * @access Private
 */
router.post('/', verifyToken, asyncHandler(async (req: any, res: any) => {
  try {
    const { 
      fullName, 
      address1, 
      address2, 
      city, 
      state, 
      postalCode, 
      country, 
      phoneNumber, 
      isDefault 
    } = req.body;
    
    // Validate required fields
    if (!fullName || !address1 || !city || !state || !postalCode || !country) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // If this address is being set as default, clear any existing default
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false }
      });
    }
    
    // Create the new address
    const newAddress = await prisma.savedAddress.create({
      data: {
        userId: req.user.id,
        fullName,
        address1,
        address2,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        isDefault: isDefault || false
      }
    });
    
    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json({ message: 'Failed to create address' });
  }
}));

/**
 * @route PUT /api/addresses/:id
 * @desc Update an existing address
 * @access Private
 */
router.put('/:id', verifyToken, asyncHandler(async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { 
      fullName, 
      address1, 
      address2, 
      city, 
      state, 
      postalCode, 
      country, 
      phoneNumber, 
      isDefault 
    } = req.body;
    
    // Check if address exists and belongs to user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: { id, userId: req.user.id }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // If this address is being set as default, clear any existing default
    if (isDefault && !existingAddress.isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false }
      });
    }
    
    // Update the address
    const updatedAddress = await prisma.savedAddress.update({
      where: { id },
      data: {
        fullName,
        address1,
        address2,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        isDefault: isDefault || false
      }
    });
    
    res.status(200).json(updatedAddress);
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Failed to update address' });
  }
}));

/**
 * @route DELETE /api/addresses/:id
 * @desc Delete an address
 * @access Private
 */
router.delete('/:id', verifyToken, asyncHandler(async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Check if address exists and belongs to user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: { id, userId: req.user.id }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Delete the address
    await prisma.savedAddress.delete({ where: { id } });
    
    // If this was the default address, set another address as default
    if (existingAddress.isDefault) {
      const nextAddress = await prisma.savedAddress.findFirst({
        where: { userId: req.user.id }
      });
      
      if (nextAddress) {
        await prisma.savedAddress.update({
          where: { id: nextAddress.id },
          data: { isDefault: true }
        });
      }
    }
    
    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Failed to delete address' });
  }
}));

/**
 * @route PUT /api/addresses/:id/default
 * @desc Set an address as default
 * @access Private
 */
router.put('/:id/default', verifyToken, asyncHandler(async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Check if address exists and belongs to user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: { id, userId: req.user.id }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Clear any existing default
    await prisma.savedAddress.updateMany({
      where: { userId: req.user.id, isDefault: true },
      data: { isDefault: false }
    });
    
    // Set this address as default
    const updatedAddress = await prisma.savedAddress.update({
      where: { id },
      data: { isDefault: true }
    });
    
    res.status(200).json(updatedAddress);
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ message: 'Failed to set default address' });
  }
}));


router.get('/saved', verifyToken, asyncHandler(getSavedAddresses));


router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});

export default router;