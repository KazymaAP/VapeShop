const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        processDirectory(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const original = content;

        // Fix logger.error(err) -> logger.error(err instanceof Error ? err.message : 'Unknown error')
        content = content.replace(
          /logger\.error\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)\s*;/g,
          (match, varName) => {
            return `logger.error(${varName} instanceof Error ? ${varName}.message : 'Unknown error');`;
          }
        );

        if (content !== original) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`✓ Fixed: ${filePath}`);
        }
      } catch (err) {
        console.error(`✗ Error processing ${filePath}:`, err.message);
      }
    }
  });
}

processDirectory(path.join(__dirname, 'pages'));
processDirectory(path.join(__dirname, 'lib'));
console.log('✓ Fixing complete!');
