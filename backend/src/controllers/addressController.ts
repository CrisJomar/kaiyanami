import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all addresses for a user
export const getAddresses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' }
    });
    
    res.json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
};

// Get all saved addresses for a user
export const getSavedAddresses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const savedAddresses = await prisma.savedAddress.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' }
    });
    
    res.json(savedAddresses);
  } catch (error) {
    console.error('Error fetching saved addresses:', error);
    res.status(500).json({ error: 'Failed to fetch saved addresses' });
  }
};

// Create a new saved address
export const createSavedAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
    if (!fullName || !address1 || !city || !state || !postalCode) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }
    
    // If setting as default, update all other addresses
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }
    
    const newAddress = await prisma.savedAddress.create({
      data: {
        userId,
        fullName,
        address1,
        address2,
        city,
        state,
        postalCode,
        country: country || 'US',
        phoneNumber,
        isDefault: isDefault || false
      }
    });
    
    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error creating saved address:', error);
    res.status(500).json({ error: 'Failed to create saved address' });
  }
};

// Update a saved address
export const updateSavedAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if address exists and belongs to user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: { id, userId }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
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
    
    // If setting as default, update all other addresses
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: {
          userId,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }
    
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
        isDefault
      }
    });
    
    res.json(updatedAddress);
  } catch (error) {
    console.error('Error updating saved address:', error);
    res.status(500).json({ error: 'Failed to update saved address' });
  }
};

// Delete a saved address
export const deleteSavedAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if address exists and belongs to user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: { id, userId }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    await prisma.savedAddress.delete({
      where: { id }
    });
    
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    console.error('Error deleting saved address:', error);
    res.status(500).json({ error: 'Failed to delete saved address' });
  }
};

// Legacy methods for compatibility
export const createAddress = async (req: Request, res: Response) => {
  // Redirect to createSavedAddress for now
  return createSavedAddress(req, res);
};

export const updateAddress = async (req: Request, res: Response) => {
  // Redirect to updateSavedAddress for now
  return updateSavedAddress(req, res);
};

export const deleteAddress = async (req: Request, res: Response) => {
  // Redirect to deleteSavedAddress for now
  return deleteSavedAddress(req, res);
};

export default {
  getAddresses,
  getSavedAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress
};