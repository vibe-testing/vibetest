/**
 * VibeTesting CLI - Test Naming Service
 *
 * Provides LLM-based semantic test name generation with caching and fallback.
 *
 * @license MIT
 */

import { b } from '../baml_client/index.js';
import type {
  TestNamingContext,
  GeneratedTestName,
  LLMNamingConfig,
} from './types.js';
import { DEFAULT_LLM_CONFIG } from './types.js';
import { createHash } from 'crypto';

/**
 * Cache entry for generated test names.
 */
interface CacheEntry {
  result: GeneratedTestName;
  timestamp: number;
}

/**
 * Service for generating semantic test names using BAML/LLM.
 */
export class TestNamingService {
  private config: Required<LLMNamingConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private llmAvailable: boolean | null = null;

  constructor(config: Partial<LLMNamingConfig> = {}) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
  }

  /**
   * Check if LLM is available (API key or AWS credentials configured).
   */
  isLLMAvailable(): boolean {
    if (this.llmAvailable !== null) {
      return this.llmAvailable;
    }

    // Check for API keys - BAML supports multiple providers
    const hasApiKey = !!(
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.VIBETEST_OPENAI_API_KEY
    );

    // Check for AWS credentials (for Bedrock)
    const hasAwsCredentials = !!(
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.AWS_PROFILE ||
      process.env.AWS_ROLE_ARN
    );

    this.llmAvailable = this.config.enabled && (hasApiKey || hasAwsCredentials);
    return this.llmAvailable;
  }

  /**
   * Generate a cache key for the context.
   */
  private getCacheKey(context: TestNamingContext): string {
    const content = JSON.stringify(context);
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Check if a cache entry is still valid.
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.config.cacheTtl;
  }

  /**
   * Get a cached result if available.
   */
  private getCached(context: TestNamingContext): GeneratedTestName | null {
    if (!this.config.cacheEnabled) {
      return null;
    }

    const key = this.getCacheKey(context);
    const entry = this.cache.get(key);

    if (entry && this.isCacheValid(entry)) {
      return entry.result;
    }

    if (entry) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Store a result in the cache.
   */
  private setCache(context: TestNamingContext, result: GeneratedTestName): void {
    if (!this.config.cacheEnabled) {
      return;
    }

    const key = this.getCacheKey(context);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate a test name using LLM.
   */
  async generateName(context: TestNamingContext): Promise<GeneratedTestName> {
    // Check cache first
    const cached = this.getCached(context);
    if (cached) {
      return cached;
    }

    // Try LLM if available
    if (this.isLLMAvailable()) {
      try {
        const result = await b.GenerateTestName({
          flowName: context.flowName,
          flowDescription: context.flowDescription,
          intentType: context.intentType,
          variationCategory: context.variationCategory,
          variationDescription: context.variationDescription,
          fieldName: context.fieldName ?? null,
          constraintType: context.constraintType ?? null,
          errorType: context.errorType ?? null,
          inputValue: context.inputValue ?? null,
          expectedBehavior: context.expectedBehavior ?? null,
        });

        const generated: GeneratedTestName = {
          name: result.name,
          description: result.description,
        };

        this.setCache(context, generated);
        return generated;
      } catch (error) {
        // Log and fall through to template-based naming
        console.warn('LLM naming failed, using fallback:', (error as Error).message);
      }
    }

    // Fallback to template-based naming
    return this.generateTemplateName(context);
  }

  /**
   * Generate multiple test names in a batch (more efficient).
   */
  async generateNamesBatch(
    contexts: TestNamingContext[]
  ): Promise<GeneratedTestName[]> {
    // Check cache for all contexts
    const results: (GeneratedTestName | null)[] = contexts.map(ctx =>
      this.getCached(ctx)
    );

    // Find uncached contexts
    const uncachedIndices: number[] = [];
    const uncachedContexts: TestNamingContext[] = [];

    results.forEach((result, index) => {
      if (!result) {
        const ctx = contexts[index];
        if (ctx) {
          uncachedIndices.push(index);
          uncachedContexts.push(ctx);
        }
      }
    });

    // If all cached, return immediately
    if (uncachedContexts.length === 0) {
      return results as GeneratedTestName[];
    }

    // Try LLM batch generation if available
    if (this.isLLMAvailable() && uncachedContexts.length > 0) {
      try {
        const batchResult = await b.GenerateTestNamesBatch({
          contexts: uncachedContexts.map(ctx => ({
            flowName: ctx.flowName,
            flowDescription: ctx.flowDescription,
            intentType: ctx.intentType,
            variationCategory: ctx.variationCategory,
            variationDescription: ctx.variationDescription,
            fieldName: ctx.fieldName ?? null,
            constraintType: ctx.constraintType ?? null,
            errorType: ctx.errorType ?? null,
            inputValue: ctx.inputValue ?? null,
            expectedBehavior: ctx.expectedBehavior ?? null,
          })),
        });

        // Map batch results back to original positions
        batchResult.names.forEach((name, i) => {
          const originalIndex = uncachedIndices[i];
          const uncachedCtx = uncachedContexts[i];
          if (originalIndex !== undefined && uncachedCtx) {
            const generated: GeneratedTestName = {
              name: name.name,
              description: name.description,
            };
            results[originalIndex] = generated;
            this.setCache(uncachedCtx, generated);
          }
        });

        return results as GeneratedTestName[];
      } catch (error) {
        console.warn('LLM batch naming failed, using fallback:', (error as Error).message);
      }
    }

    // Fallback: generate template names for uncached contexts
    uncachedIndices.forEach((originalIndex, i) => {
      const uncachedCtx = uncachedContexts[i];
      if (uncachedCtx) {
        results[originalIndex] = this.generateTemplateName(uncachedCtx);
      }
    });

    return results as GeneratedTestName[];
  }

  /**
   * Generate a test name using templates (fallback when LLM unavailable).
   */
  generateTemplateName(context: TestNamingContext): GeneratedTestName {
    const { variationCategory, intentType, fieldName, constraintType, errorType } = context;

    let name: string;
    let description: string;

    switch (variationCategory) {
      case 'happy_path':
        name = this.generateHappyPathName(intentType);
        description = `Verifies successful ${this.formatIntentType(intentType)}`;
        break;

      case 'validation':
        name = this.generateValidationName(fieldName, constraintType);
        description = `Tests ${constraintType || 'validation'} for ${fieldName || 'field'}`;
        break;

      case 'error_handling':
        name = this.generateErrorHandlingName(errorType);
        description = `Verifies handling of ${this.formatErrorType(errorType)}`;
        break;

      case 'edge_case':
        name = this.generateEdgeCaseName(context);
        description = `Tests edge case: ${context.variationDescription}`;
        break;

      case 'security':
        name = this.generateSecurityName(context);
        description = `Security test: ${context.variationDescription}`;
        break;

      case 'accessibility':
        name = `should be accessible when ${this.formatIntentType(intentType)}`;
        description = `Accessibility validation for ${intentType}`;
        break;

      case 'performance':
        name = `should complete ${this.formatIntentType(intentType)} within timeout`;
        description = `Performance test for ${intentType}`;
        break;

      default:
        name = `should handle ${context.variationDescription}`;
        description = context.variationDescription;
    }

    return { name, description };
  }

  /**
   * Generate happy path test name.
   */
  private generateHappyPathName(intentType: string): string {
    const intentNames: Record<string, string> = {
      form_submission: 'should submit form successfully when all fields are valid',
      search: 'should return results when search term is valid',
      navigation: 'should navigate to destination when link is clicked',
      authentication: 'should authenticate user when credentials are valid',
      checkout: 'should complete checkout when payment is valid',
      filter: 'should filter results when criteria are applied',
      sort: 'should sort results when sort option is selected',
      pagination: 'should load next page when pagination is clicked',
      file_upload: 'should upload file successfully when file is valid',
      data_entry: 'should save data when form is submitted',
      selection: 'should update selection when option is chosen',
      modal_interaction: 'should handle modal correctly when triggered',
      menu_navigation: 'should navigate menu when item is clicked',
    };

    return intentNames[intentType] || `should complete ${this.formatIntentType(intentType)} successfully`;
  }

  /**
   * Generate validation test name.
   */
  private generateValidationName(fieldName?: string, constraintType?: string): string {
    const field = fieldName || 'field';

    const constraintNames: Record<string, string> = {
      required: `should show error when ${field} is empty`,
      email: `should show error when ${field} has invalid email format`,
      url: `should show error when ${field} has invalid URL format`,
      phone: `should show error when ${field} has invalid phone format`,
      number: `should show error when ${field} is not a number`,
      min_length: `should show error when ${field} is too short`,
      max_length: `should show error when ${field} is too long`,
      min_value: `should show error when ${field} is below minimum`,
      max_value: `should show error when ${field} exceeds maximum`,
      pattern: `should show error when ${field} does not match pattern`,
      date: `should show error when ${field} has invalid date`,
      time: `should show error when ${field} has invalid time`,
      file_type: `should show error when file type is invalid`,
      file_size: `should show error when file size exceeds limit`,
    };

    return constraintNames[constraintType || ''] || `should validate ${field} correctly`;
  }

  /**
   * Generate error handling test name.
   */
  private generateErrorHandlingName(errorType?: string): string {
    const errorNames: Record<string, string> = {
      network_timeout: 'should show timeout error when server does not respond',
      server_error: 'should show error message when server returns 500',
      validation_error: 'should display validation errors when input is invalid',
      authentication_error: 'should redirect to login when session expires',
      authorization_error: 'should show forbidden message when access denied',
      rate_limit: 'should show rate limit message when requests exceed limit',
      not_found: 'should show not found message when resource missing',
      conflict: 'should handle conflict when concurrent update occurs',
      client_error: 'should display error when client request fails',
    };

    return errorNames[errorType || ''] || `should handle ${this.formatErrorType(errorType)} gracefully`;
  }

  /**
   * Generate edge case test name.
   */
  private generateEdgeCaseName(context: TestNamingContext): string {
    const desc = context.variationDescription.toLowerCase();

    if (desc.includes('rapid') || desc.includes('double')) {
      return 'should prevent duplicate submission when button clicked rapidly';
    }
    if (desc.includes('back button')) {
      return 'should handle navigation when back button pressed after submission';
    }
    if (desc.includes('refresh') || desc.includes('reload')) {
      return 'should restore state when page is refreshed';
    }
    if (desc.includes('resize')) {
      return 'should remain functional when browser is resized';
    }
    if (desc.includes('tab') || desc.includes('switch')) {
      return 'should maintain state when tab is switched';
    }

    return `should handle edge case: ${context.variationDescription}`;
  }

  /**
   * Generate security test name.
   */
  private generateSecurityName(context: TestNamingContext): string {
    const desc = context.variationDescription.toLowerCase();

    if (desc.includes('xss')) {
      return 'should escape script tags when malicious input entered';
    }
    if (desc.includes('sql')) {
      return 'should prevent SQL injection when special characters entered';
    }
    if (desc.includes('csrf')) {
      return 'should validate CSRF token when form submitted';
    }
    if (desc.includes('injection')) {
      return 'should sanitize input when injection attempted';
    }

    return `should prevent security vulnerability: ${context.variationDescription}`;
  }

  /**
   * Format intent type for display.
   */
  private formatIntentType(intentType: string): string {
    return intentType.replace(/_/g, ' ');
  }

  /**
   * Format error type for display.
   */
  private formatErrorType(errorType?: string): string {
    if (!errorType) return 'error';
    return errorType.replace(/_/g, ' ');
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; config: Required<LLMNamingConfig> } {
    return {
      size: this.cache.size,
      config: this.config,
    };
  }
}

/**
 * Singleton instance for convenience.
 */
let defaultInstance: TestNamingService | null = null;

/**
 * Get the default naming service instance.
 */
export function getTestNamingService(config?: Partial<LLMNamingConfig>): TestNamingService {
  if (!defaultInstance) {
    defaultInstance = new TestNamingService(config);
  }
  return defaultInstance;
}
