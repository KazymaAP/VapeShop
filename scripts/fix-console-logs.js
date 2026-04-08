#!/usr/bin/env node

/**
 * Script to replace console.* with logger.* for HIGH-001 fix
 * Usage: node scripts/fix-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const DIRS = ['pages/api', 'lib', 'components'];
const LOG_LEVEL_MAP = {
  'console.log': 'logger.info',
  'console.error': 'logger.error',
  'console.warn': 'logger.warn',
  'console.debug': 'logger.debug',
};

function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixConsoleInFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf-8');
  const originalLength = content.length;
  let replacementCount = 0;
  
  // Check if logger is imported
  if (!content.includes("import { logger }") && !content.includes("import {") ||  !content.includes("logger")) {
    if (content.match(/console\.(log|error|warn|debug)/)) {
      // Add logger import after other imports
      const importRegex = /^(import .*from[^;]+;\n)*/m;
      const match = content.match(importRegex);
      if (match) {
        content = content.substring(0, match[0].length) + 
                  "import { logger } from '@/lib/logger';\n" +
                  content.substring(match[0].length);
      }
    }
  }
  
  // Replace console calls
  for (const [consoleCall, loggerCall] of Object.entries(LOG_LEVEL_MAP)) {
    // Pattern: console.error('msg', var) → logger.error('msg', { var })
    // Pattern: console.error('msg:', err) → logger.error('msg', { error: err.message || String(err) })
    const pattern = new RegExp(consoleCall.replace(/\./g, '\\.') + '\\s*\\(([^)]+)\\)', 'g');
    
    content = content.replace(pattern, (match, args) => {
      replacementCount++;
      // Simple replacement for now
      return `${loggerCall}(${args})`;
    });
  }
  
  if (replacementCount > 0) {
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`✅ ${filepath}: ${replacementCount} replacements`);
  }
  
  return replacementCount;
}

// Main
let totalFixed = 0;
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  
  const files = getAllTsFiles(dir);
  for (const file of files) {
    totalFixed += fixConsoleInFile(file);
  }
}

console.log(`\n✨ Total: ${totalFixed} console calls replaced`);
