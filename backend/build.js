const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create a temporary tsconfig for production build
const tempConfig = {
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "skipLibCheck": true,
    "noEmitOnError": false,
    "allowJs": true,
    "checkJs": false,
    "noImplicitAny": false
  }
};

try {
  // Write temporary config
  fs.writeFileSync('./tsconfig.prod.json', JSON.stringify(tempConfig, null, 2));
  
  console.log('🔧 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('🔧 Building TypeScript...');
  execSync('npx tsc --project tsconfig.prod.json', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
} finally {
  // Clean up temp config
  try {
    fs.unlinkSync('./tsconfig.prod.json');
  } catch (e) {}
}