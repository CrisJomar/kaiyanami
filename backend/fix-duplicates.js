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
        
        // Count occurrences of imports from middlewareHelpers
        const importMatches = data.match(/import\s+{.*}\s+from\s+['"]\.\.\/utils\/middlewareHelpers['"];?/g);
        
        if (importMatches && importMatches.length > 1) {
          // Extract all identifiers being imported
          const identifiers = new Set();
          importMatches.forEach(match => {
            const parts = match.match(/import\s+{(.*?)}\s+from/);
            if (parts && parts[1]) {
              parts[1].split(',').forEach(id => {
                identifiers.add(id.trim());
              });
            }
          });
          
          // Create a new single import statement
          const newImport = `import { ${Array.from(identifiers).join(', ')} } from '../utils/middlewareHelpers';`;
          
          // Replace all existing imports with the new one
          let newContent = data;
          importMatches.forEach(match => {
            newContent = newContent.replace(match, '');
          });
          
          // Add the new import at the top of the file
          newContent = newContent.replace(/(import.*?;[\r\n]+)/, `$1${newImport}\n`);
          
          // Clean up any blank lines
          newContent = newContent.replace(/[\r\n]{3,}/g, '\n\n');
          
          // Write back to file
          fs.writeFile(filePath, newContent, 'utf8', err => {
            if (err) {
              console.error(`Error writing file ${file}:`, err);
              return;
            }
            console.log(`✅ Fixed duplicate imports in ${file}`);
          });
        }
      });
    }
  });
});