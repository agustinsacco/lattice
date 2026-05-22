import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (filepath: string) => void) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const filesToProcess: string[] = ['./apps/web/server.ts'];

walkDir('./apps/web/src', function(filepath) {
  if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) {
    filesToProcess.push(filepath);
  }
});

filesToProcess.forEach(filepath => {
  if (fs.existsSync(filepath)) {
    const content = fs.readFileSync(filepath, 'utf8');
    const newContent = content
      .replace(/@\/client\/components\/ui/g, '@lattice/ui')
      .replace(/@\/common\//g, '@lattice/shared/')
      .replace(/@\/client\/utils/g, '@lattice/ui')
      .replace(/\.\/src\/common\/types/g, '@lattice/shared');
    
    if (content !== newContent) {
      fs.writeFileSync(filepath, newContent);
      console.log(`Updated ${filepath}`);
    }
  }
});
