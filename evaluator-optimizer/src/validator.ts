import SwaggerParser from '@apidevtools/swagger-parser';
import { ValidationResult } from './types.js';

async function validateOpenAPISpec(spec: object): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validates and dereferences the spec
    await SwaggerParser.validate(spec as any);
    
    // Optional: Add custom checks for common issues
    const specAny = spec as any;
    if (!specAny.info?.version) {
      warnings.push('API version not specified in info.version');
    }
    if (!specAny.servers || specAny.servers.length === 0) {
      warnings.push('No server URLs defined');
    }
    
    return { isValid: true, errors: [], warnings };
  } catch (error) {
    if (error instanceof Error) {
      // SwaggerParser may throw aggregated errors
      errors.push(error.message);
      
      // Check if there are nested errors (some validators provide these)
      if ('details' in error && Array.isArray((error as any).details)) {
        (error as any).details.forEach((detail: any) => {
          if (detail.message && !errors.includes(detail.message)) {
            errors.push(detail.message);
          }
        });
      }
    } else {
      errors.push('Unknown validation error occurred');
    }
    return { isValid: false, errors, warnings };
  }
}

export { validateOpenAPISpec};