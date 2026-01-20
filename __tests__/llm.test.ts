/**
 * VibeTesting CLI - LLM Module Tests
 *
 * Tests for LLM-based test naming functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TestNamingService,
  DEFAULT_LLM_CONFIG,
  type TestNamingContext,
  type LLMNamingConfig,
} from '../src/llm/index.js';
import { TestNamer } from '../src/generation/test-namer.js';
import { VariationGenerator } from '../src/generation/variation-generator.js';
import type { AnalyzedFlow } from '../src/analysis/types.js';
import type { TestVariation, VariationCategory, VariationPriority } from '../src/generation/types.js';

/**
 * Helper to create a test naming context.
 */
function createContext(overrides: Partial<TestNamingContext> = {}): TestNamingContext {
  return {
    flowName: 'User Login',
    flowDescription: 'User logs in with credentials',
    intentType: 'authentication',
    variationCategory: 'happy_path',
    variationDescription: 'Successful login with valid credentials',
    ...overrides,
  };
}

describe('TestNamingService', () => {
  describe('constructor', () => {
    it('creates service with default config', () => {
      const service = new TestNamingService();
      const stats = service.getCacheStats();

      expect(stats.config.enabled).toBe(true);
      expect(stats.config.cacheEnabled).toBe(true);
      expect(stats.config.batchSize).toBe(10);
    });

    it('accepts custom config', () => {
      const config: Partial<LLMNamingConfig> = {
        enabled: false,
        batchSize: 5,
        timeout: 10000,
      };

      const service = new TestNamingService(config);
      const stats = service.getCacheStats();

      expect(stats.config.enabled).toBe(false);
      expect(stats.config.batchSize).toBe(5);
      expect(stats.config.timeout).toBe(10000);
    });
  });

  describe('isLLMAvailable', () => {
    beforeEach(() => {
      // Clear environment variables for testing
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.VIBETEST_OPENAI_API_KEY;
    });

    it('returns false when no API key is set', () => {
      const service = new TestNamingService();
      expect(service.isLLMAvailable()).toBe(false);
    });

    it('returns false when disabled', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const service = new TestNamingService({ enabled: false });
      expect(service.isLLMAvailable()).toBe(false);
    });

    it('returns true when enabled and API key present', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const service = new TestNamingService({ enabled: true });
      expect(service.isLLMAvailable()).toBe(true);
    });

    it('detects OPENAI_API_KEY', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const service = new TestNamingService({ enabled: true });
      expect(service.isLLMAvailable()).toBe(true);
    });

    it('detects VIBETEST_OPENAI_API_KEY', () => {
      process.env.VIBETEST_OPENAI_API_KEY = 'test-key';
      const service = new TestNamingService({ enabled: true });
      expect(service.isLLMAvailable()).toBe(true);
    });
  });

  describe('generateTemplateName', () => {
    let service: TestNamingService;

    beforeEach(() => {
      service = new TestNamingService({ enabled: false });
    });

    describe('happy path', () => {
      it('generates name for form submission', () => {
        const context = createContext({
          intentType: 'form_submission',
          variationCategory: 'happy_path',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should submit form successfully when all fields are valid');
        expect(result.description).toContain('form submission');
      });

      it('generates name for authentication', () => {
        const context = createContext({
          intentType: 'authentication',
          variationCategory: 'happy_path',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should authenticate user when credentials are valid');
      });

      it('generates name for search', () => {
        const context = createContext({
          intentType: 'search',
          variationCategory: 'happy_path',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should return results when search term is valid');
      });

      it('generates name for checkout', () => {
        const context = createContext({
          intentType: 'checkout',
          variationCategory: 'happy_path',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should complete checkout when payment is valid');
      });

      it('generates name for file upload', () => {
        const context = createContext({
          intentType: 'file_upload',
          variationCategory: 'happy_path',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should upload file successfully when file is valid');
      });
    });

    describe('validation', () => {
      it('generates name for required field', () => {
        const context = createContext({
          variationCategory: 'validation',
          fieldName: 'email',
          constraintType: 'required',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show error when email is empty');
        expect(result.description).toContain('email');
      });

      it('generates name for email validation', () => {
        const context = createContext({
          variationCategory: 'validation',
          fieldName: 'email',
          constraintType: 'email',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show error when email has invalid email format');
      });

      it('generates name for min_length validation', () => {
        const context = createContext({
          variationCategory: 'validation',
          fieldName: 'password',
          constraintType: 'min_length',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show error when password is too short');
      });

      it('generates name for max_length validation', () => {
        const context = createContext({
          variationCategory: 'validation',
          fieldName: 'username',
          constraintType: 'max_length',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show error when username is too long');
      });

      it('generates name for phone validation', () => {
        const context = createContext({
          variationCategory: 'validation',
          fieldName: 'phone',
          constraintType: 'phone',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show error when phone has invalid phone format');
      });

      it('handles missing field name', () => {
        const context = createContext({
          variationCategory: 'validation',
          constraintType: 'required',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show error when field is empty');
      });
    });

    describe('error handling', () => {
      it('generates name for network timeout', () => {
        const context = createContext({
          variationCategory: 'error_handling',
          errorType: 'network_timeout',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show timeout error when server does not respond');
        expect(result.description).toContain('timeout');
      });

      it('generates name for server error', () => {
        const context = createContext({
          variationCategory: 'error_handling',
          errorType: 'server_error',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show error message when server returns 500');
      });

      it('generates name for rate limit', () => {
        const context = createContext({
          variationCategory: 'error_handling',
          errorType: 'rate_limit',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should show rate limit message when requests exceed limit');
      });

      it('generates name for authentication error', () => {
        const context = createContext({
          variationCategory: 'error_handling',
          errorType: 'authentication_error',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should redirect to login when session expires');
      });
    });

    describe('security', () => {
      it('generates name for XSS attempt', () => {
        const context = createContext({
          variationCategory: 'security',
          variationDescription: 'XSS injection attempt',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should escape script tags when malicious input entered');
      });

      it('generates name for SQL injection', () => {
        const context = createContext({
          variationCategory: 'security',
          variationDescription: 'SQL injection attempt',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should prevent SQL injection when special characters entered');
      });
    });

    describe('edge cases', () => {
      it('generates name for rapid submission', () => {
        const context = createContext({
          variationCategory: 'edge_case',
          variationDescription: 'Rapid double submission',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should prevent duplicate submission when button clicked rapidly');
      });

      it('generates name for back button', () => {
        const context = createContext({
          variationCategory: 'edge_case',
          variationDescription: 'Back button after submission',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should handle navigation when back button pressed after submission');
      });

      it('generates name for page refresh', () => {
        const context = createContext({
          variationCategory: 'edge_case',
          variationDescription: 'Page refresh during flow',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should restore state when page is refreshed');
      });
    });

    describe('other categories', () => {
      it('generates name for accessibility', () => {
        const context = createContext({
          variationCategory: 'accessibility',
          intentType: 'form_submission',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should be accessible when form submission');
      });

      it('generates name for performance', () => {
        const context = createContext({
          variationCategory: 'performance',
          intentType: 'search',
        });

        const result = service.generateTemplateName(context);

        expect(result.name).toBe('should complete search within timeout');
      });
    });
  });

  describe('caching', () => {
    let service: TestNamingService;

    beforeEach(() => {
      service = new TestNamingService({
        enabled: false,
        cacheEnabled: true,
        cacheTtl: 60000,
      });
    });

    it('starts with empty cache', () => {
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('clears cache', async () => {
      const context = createContext();
      await service.generateName(context);

      service.clearCache();

      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('generateName', () => {
    let service: TestNamingService;

    beforeEach(() => {
      service = new TestNamingService({ enabled: false });
    });

    it('generates name using templates when LLM unavailable', async () => {
      const context = createContext({
        intentType: 'form_submission',
        variationCategory: 'happy_path',
      });

      const result = await service.generateName(context);

      expect(result.name).toBe('should submit form successfully when all fields are valid');
    });

    it('returns consistent results on second call', async () => {
      service = new TestNamingService({ enabled: false, cacheEnabled: true });
      const context = createContext();

      const result1 = await service.generateName(context);
      const result2 = await service.generateName(context);

      // Template-based naming is deterministic, so results should match
      expect(result1.name).toBe(result2.name);
      expect(result1.description).toBe(result2.description);
    });
  });

  describe('generateNamesBatch', () => {
    let service: TestNamingService;

    beforeEach(() => {
      service = new TestNamingService({ enabled: false });
    });

    it('generates names for multiple contexts', async () => {
      const contexts: TestNamingContext[] = [
        createContext({
          variationCategory: 'happy_path',
          intentType: 'form_submission',
        }),
        createContext({
          variationCategory: 'validation',
          fieldName: 'email',
          constraintType: 'required',
        }),
        createContext({
          variationCategory: 'error_handling',
          errorType: 'network_timeout',
        }),
      ];

      const results = await service.generateNamesBatch(contexts);

      expect(results).toHaveLength(3);
      expect(results[0]?.name).toContain('submit form');
      expect(results[1]?.name).toContain('email');
      expect(results[2]?.name).toContain('timeout');
    });

    it('returns empty array for empty input', async () => {
      const results = await service.generateNamesBatch([]);
      expect(results).toHaveLength(0);
    });
  });
});

describe('DEFAULT_LLM_CONFIG', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_LLM_CONFIG.enabled).toBe(true);
    expect(DEFAULT_LLM_CONFIG.cacheEnabled).toBe(true);
    expect(DEFAULT_LLM_CONFIG.cacheTtl).toBe(24 * 60 * 60 * 1000);
    expect(DEFAULT_LLM_CONFIG.batchSize).toBe(10);
    expect(DEFAULT_LLM_CONFIG.maxConcurrent).toBe(5);
    expect(DEFAULT_LLM_CONFIG.timeout).toBe(30000);
  });
});

describe('TestNamer with LLM', () => {
  // We test the fallback behavior since LLM calls require API keys

  it('creates namer without LLM by default', () => {
    const namer = new TestNamer();
    // When useLLM is false, isLLMAvailable should always be false
    expect(namer.isLLMAvailable()).toBe(false);
  });

  it('creates namer with LLM when requested', () => {
    const namer = new TestNamer(true);
    // LLM service is created - availability depends on environment
    // Just verify it returns a boolean
    expect(typeof namer.isLLMAvailable()).toBe('boolean');
  });

  it('applies template naming synchronously', () => {
    const namer = new TestNamer();
    const flow: AnalyzedFlow = {
      id: 'flow_1',
      name: 'Login',
      description: 'User login',
      intent: {
        type: 'authentication',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 1,
        triggerEvents: [],
        metadata: {},
      },
      events: [],
      assertions: [],
      validations: [],
      errorScenarios: [],
      startUrl: 'http://example.com',
      duration: 1000,
      confidence: 0.9,
    };

    const variation: TestVariation = {
      id: 'var_1',
      name: 'temp',
      description: 'Successful login',
      category: 'happy_path' as VariationCategory,
      priority: 'high' as VariationPriority,
      steps: [],
      assertions: [],
      tags: [],
      sourceFlowId: 'flow_1',
    };

    const result = namer.applyNaming(variation, flow);

    expect(result.name).toContain('should');
    expect(result.name).toContain('authenticate');
  });
});

describe('VariationGenerator with LLM', () => {
  it('creates generator without LLM by default', () => {
    const generator = new VariationGenerator();
    expect(generator.isLLMAvailable()).toBe(false);
  });

  it('creates generator with LLM option', () => {
    const generator = new VariationGenerator({ useLLM: true });
    // Returns true if any API key is available, false otherwise
    // (depends on environment configuration)
    expect(typeof generator.isLLMAvailable()).toBe('boolean');
  });

  it('accepts old config signature for backward compatibility', () => {
    const generator = new VariationGenerator({
      maxVariationsPerFlow: 10,
      includeHappyPath: true,
    });

    const config = generator.getConfig();
    expect(config.maxVariationsPerFlow).toBe(10);
    expect(config.includeHappyPath).toBe(true);
  });

  it('accepts new options signature', () => {
    const generator = new VariationGenerator({
      config: { maxVariationsPerFlow: 5 },
      useLLM: false,
    });

    const config = generator.getConfig();
    expect(config.maxVariationsPerFlow).toBe(5);
  });
});
