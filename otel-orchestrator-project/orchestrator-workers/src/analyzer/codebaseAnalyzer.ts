import * as path from 'path';
import {
  CodebaseAnalysis,
  FileAnalysis,
  FunctionInfo,
  DependencyInfo,
  PackageDependency
} from '../types';
import { FileInfo } from '../utils/fileSystem';

export class CodebaseAnalyzer {
  /**
   * Analyze a codebase to understand its structure
   */
  static analyze(files: FileInfo[], rootPath: string): CodebaseAnalysis {
    const fileAnalyses: FileAnalysis[] = [];
    let entryPoint = '';
    let framework: 'express' | 'fastify' | 'unknown' = 'unknown';

    // Analyze each file
    for (const file of files) {
      if (file.extension === '.json') {
        continue; // Skip JSON files in analysis (we'll handle package.json separately)
      }

      const analysis = this.analyzeFile(file, rootPath);
      fileAnalyses.push(analysis);

      // Detect entry point
      if (file.content.includes('app.listen') || file.content.includes('.listen(')) {
        entryPoint = file.path;
      }

      // Detect framework
      if (file.content.includes('from \'express\'') || file.content.includes('require(\'express\')')) {
        framework = 'express';
      } else if (file.content.includes('from \'fastify\'') || file.content.includes('require(\'fastify\')')) {
        framework = 'fastify';
      }
    }

    // Analyze dependencies
    const dependencies = this.analyzeDependencies(files);

    return {
      files: fileAnalyses,
      dependencies,
      framework,
      entryPoint
    };
  }

  /**
   * Analyze a single file
   */
  private static analyzeFile(file: FileInfo, rootPath: string): FileAnalysis {
    const relativePath = path.relative(rootPath, file.path);
    const type = this.detectFileType(file, relativePath);
    const imports = this.extractImports(file.content);
    const exports = this.extractExports(file.content);
    const functions = this.extractFunctions(file.content);
    const hasAsyncOperations = this.detectAsyncOperations(file.content);

    return {
      path: relativePath,
      type,
      imports,
      exports,
      functions,
      hasAsyncOperations
    };
  }

  /**
   * Detect file type based on content and path
   */
  private static detectFileType(
    file: FileInfo,
    relativePath: string
  ): FileAnalysis['type'] {
    const content = file.content;
    const pathLower = relativePath.toLowerCase();

    // Entry point detection
    if (content.includes('app.listen') || pathLower.includes('index.ts') || pathLower.includes('main.ts')) {
      return 'entry';
    }

    // Route detection
    if (pathLower.includes('route') || content.includes('Router()') || content.includes('router.get') || content.includes('router.post')) {
      return 'route';
    }

    // Service detection
    if (pathLower.includes('service') || content.match(/class \w+Service/)) {
      return 'service';
    }

    // Middleware detection
    if (pathLower.includes('middleware') || content.includes('NextFunction')) {
      return 'middleware';
    }

    // Utility detection
    if (pathLower.includes('util') || pathLower.includes('helper')) {
      return 'utility';
    }

    return 'config';
  }

  /**
   * Extract import statements
   */
  private static extractImports(content: string): string[] {
    const imports: string[] = [];
    
    // Match ES6 imports
    const es6Regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = es6Regex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Match CommonJS requires
    const cjsRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = cjsRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract export statements
   */
  private static extractExports(content: string): string[] {
    const exports: string[] = [];

    // Match named exports
    const namedRegex = /export\s+(?:class|function|const|let|var|interface|type)\s+(\w+)/g;
    let match;
    while ((match = namedRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Match default exports
    if (content.includes('export default')) {
      exports.push('default');
    }

    return exports;
  }

  /**
   * Extract function information
   */
  private static extractFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');

    // Pattern for function declarations and arrow functions
    const functionPatterns = [
      /(?:async\s+)?function\s+(\w+)\s*\(/,  // function declarations
      /(?:async\s+)?(\w+)\s*=\s*\(/,         // arrow functions
      /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/,  // methods in classes
      /router\.(get|post|put|patch|delete)\(/  // Express route handlers
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1] || 'anonymous';
          const isAsync = line.includes('async');
          
          functions.push({
            name,
            isAsync,
            parameters: [], // Simplified for now
            callsExternalAPIs: this.detectExternalAPICalls(content, i),
            callsDatabase: this.detectDatabaseCalls(content, i),
            callsCache: this.detectCacheCalls(content, i),
            startLine: i + 1,
            endLine: this.findFunctionEnd(lines, i)
          });
        }
      }
    }

    return functions;
  }

  /**
   * Find the end line of a function
   */
  private static findFunctionEnd(lines: string[], startLine: number): number {
    let braceCount = 0;
    let foundStart = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
          if (foundStart && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }

    return startLine + 1;
  }

  /**
   * Detect if function calls external APIs
   */
  private static detectExternalAPICalls(content: string, line: number): boolean {
    const snippet = content.split('\n').slice(line, line + 50).join('\n');
    return snippet.includes('externalAPI') || snippet.includes('fetch(') || snippet.includes('axios');
  }

  /**
   * Detect if function calls database
   */
  private static detectDatabaseCalls(content: string, line: number): boolean {
    const snippet = content.split('\n').slice(line, line + 50).join('\n');
    return snippet.includes('db.') || snippet.includes('query(') || snippet.includes('findOne') || snippet.includes('findMany');
  }

  /**
   * Detect if function calls cache
   */
  private static detectCacheCalls(content: string, line: number): boolean {
    const snippet = content.split('\n').slice(line, line + 50).join('\n');
    return snippet.includes('cache.') || snippet.includes('redis.') || snippet.includes('get(') && snippet.includes('set(');
  }

  /**
   * Detect async operations in file
   */
  private static detectAsyncOperations(content: string): boolean {
    return content.includes('async ') || content.includes('await ') || content.includes('Promise<');
  }

  /**
   * Analyze dependencies from package.json
   */
  private static analyzeDependencies(files: FileInfo[]): DependencyInfo {
    const packageJsonFile = files.find(f => f.path.endsWith('package.json'));
    
    const current: PackageDependency[] = [];
    
    if (packageJsonFile) {
      try {
        const packageJson = JSON.parse(packageJsonFile.content);
        
        // Parse dependencies
        if (packageJson.dependencies) {
          for (const [name, version] of Object.entries(packageJson.dependencies)) {
            current.push({
              name,
              version: version as string,
              type: 'dependency'
            });
          }
        }

        // Parse devDependencies
        if (packageJson.devDependencies) {
          for (const [name, version] of Object.entries(packageJson.devDependencies)) {
            current.push({
              name,
              version: version as string,
              type: 'devDependency'
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse package.json:', error);
      }
    }

    // Define required OpenTelemetry packages
    const required: PackageDependency[] = [
      { name: '@opentelemetry/sdk-node', version: '^0.45.0', type: 'dependency' },
      { name: '@opentelemetry/api', version: '^1.7.0', type: 'dependency' },
      { name: '@opentelemetry/auto-instrumentations-node', version: '^0.40.0', type: 'dependency' },
      { name: '@opentelemetry/exporter-trace-otlp-http', version: '^0.45.0', type: 'dependency' }
    ];

    // Find missing packages
    const currentNames = new Set(current.map(dep => dep.name));
    const missing = required
      .filter(req => !currentNames.has(req.name))
      .map(req => req.name);

    return {
      current,
      required,
      missing
    };
  }
}