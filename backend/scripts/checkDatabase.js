const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database for test product sizes...');
    
    // Get product with sizes
    const product = await prisma.product.findUnique({
      where: { id: 'test-product-1' },
      include: { productSizes: true }
    });
    
    if (!product) {
      console.log('Product not found!');
      return;
    }
    
    console.log('Product from database:');
    console.log('- ID:', product.id);
    console.log('- Name:', product.name);
    console.log('- hasSizes:', product.hasSizes);
    console.log('- productSizes count:', product.productSizes.length);
    
    if (product.productSizes.length > 0) {
      console.log('Product sizes:');
      product.productSizes.forEach(size => {
        console.log(`- Size: ${size.size}, Stock: ${size.stock}`);
      });
    } else {
      console.log('No sizes found. Recreating sizes...');
      
      // First delete any existing sizes
      await prisma.productSize.deleteMany({
        where: { productId: 'test-product-1' }
      });
      
      // Add new sizes
      const sizes = [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 15 },
        { size: 'L', stock: 5 },
        { size: 'XL', stock: 3 }
      ];
      
      for (const sizeData of sizes) {
        await prisma.productSize.create({
          data: {
            productId: 'test-product-1',
            size: sizeData.size,
            stock: sizeData.stock
          }
        });
        console.log(`Added size ${sizeData.size} with stock ${sizeData.stock}`);
      }
      
      // Update hasSizes flag
      await prisma.product.update({
        where: { id: 'test-product-1' },
        data: { hasSizes: true }
      });
      
      // Verify changes
      const updatedProduct = await prisma.product.findUnique({
        where: { id: 'test-product-1' },
        include: { productSizes: true }
      });
      
      console.log('\nUpdated product:');
      console.log('- ID:', updatedProduct.id);
      console.log('- Name:', updatedProduct.name);
      console.log('- hasSizes:', updatedProduct.hasSizes);
      console.log('- productSizes count:', updatedProduct.productSizes.length);
      
      if (updatedProduct.productSizes.length > 0) {
        console.log('Updated product sizes:');
        updatedProduct.productSizes.forEach(size => {
          console.log(`- Size: ${size.size}, Stock: ${size.stock}`);
        });
      }
    }
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();