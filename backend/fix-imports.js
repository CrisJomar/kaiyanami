const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src/routes');

// Read all files in the routes directory
fs.readdir(routesDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach(file => {
    if (file.endsWith('.ts')) {
      const filePath = path.join(routesDir, file);
      
      // Read file content
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading file ${file}:`, err);
          return;
        }
        
        // Replace imports
        let newContent = data;
        
        // Fix direct imports from authMiddleware
        newContent = newContent.replace(
          /import\s+{\s*verifyToken\s*,?\s*.*}\s+from\s+['"]\.\.\/middleware\/authMiddleware['"];?/g,
          `import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';`
        );
        
        newContent = newContent.replace(
          /import\s+{\s*verifyToken\s*}\s+from\s+['"]\.\.\/middleware\/authMiddleware['"];?/g,
          `import { auth, verifyToken } from '../utils/middlewareHelpers';`
        );
        
        // If the file doesn't already import from middlewareHelpers and has a verifyToken import
        if (!newContent.includes("from '../utils/middlewareHelpers'") && 
            newContent.includes("from '../middleware/authMiddleware'")) {
          newContent = newContent.replace(
            /import\s+.*\s+from\s+['"]\.\.\/middleware\/authMiddleware['"];?/g,
            `import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';`
          );
        }
        
        // Write back to file if changes were made
        if (newContent !== data) {
          fs.writeFile(filePath, newContent, 'utf8', err => {
            if (err) {
              console.error(`Error writing file ${file}:`, err);
              return;
            }
            console.log(`✅ Fixed imports in ${file}`);
          });
        }
      });
    }
  });
});