import * as fs from 'fs';
import * as path from 'path';

export interface FileInfo {
  path: string;
  content: string;
  extension: string;
}

export class FileSystemUtil {
  /**
   * Read all TypeScript files from a directory recursively
   */
  static async readCodebase(rootPath: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    await this.readDirectoryRecursive(rootPath, files);
    
    return files;
  }

  private static async readDirectoryRecursive(
    dirPath: string,
    files: FileInfo[]
  ): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip node_modules, dist, and hidden directories
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
          continue;
        }
        await this.readDirectoryRecursive(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        
        // Only include TypeScript, JavaScript, and JSON files
        if (['.ts', '.js', '.json'].includes(ext)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          files.push({
            path: fullPath,
            content,
            extension: ext
          });
        }
      }
    }
  }

  /**
   * Write content to a file, creating directories as needed
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Copy directory structure
   */
  static async copyDirectory(source: string, destination: string): Promise<void> {
    // Create destination directory
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      // Skip node_modules and dist
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  /**
   * Read file content
   */
  static readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Check if file exists
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get relative path from base directory
   */
  static getRelativePath(basePath: string, filePath: string): string {
    return path.relative(basePath, filePath);
  }
}