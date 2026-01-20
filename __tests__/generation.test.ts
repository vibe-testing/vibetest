/**
 * VibeTesting CLI - Test Generation Module Tests
 *
 * Tests for test variation generation from analyzed flows.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VariationGenerator,
  HappyPathGenerator,
  ValidationVariationGenerator,
  ErrorVariationGenerator,
  EdgeCaseGenerator,
  TestNamer,
  createStep,
  createAssertion,
} from '../src/generation/index.js';
import type { AnalyzedFlow, DetectedIntent, ValidationRule, ErrorScenario } from '../src/analysis/types.js';
import type { RecordedEvent } from '../src/recording/types.js';
import type { GenerationConfig } from '../src/generation/types.js';

// Test helpers
function createEvent(overrides: Partial<RecordedEvent> = {}): RecordedEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: 'click',
    timestamp: Date.now(),
    selector: 'button#submit',
    alternativeSelectors: [],
    pageUrl: 'https://example.com/form',
    pageTitle: 'Test Page',
    viewport: { width: 1920, height: 1080 },
    ...overrides,
  };
}

function createIntent(overrides: Partial<DetectedIntent> = {}): DetectedIntent {
  return {
    type: 'form_submission',
    confidence: 0.9,
    startEventIndex: 0,
    endEventIndex: 2,
    triggerEvents: ['event1', 'event2'],
    metadata: {},
    ...overrides,
  };
}

function createFlow(overrides: Partial<AnalyzedFlow> = {}): AnalyzedFlow {
  const events = [
    createEvent({
      type: 'input',
      selector: 'input[name="email"]',
      tagName: 'input',
      value: 'test@example.com',
      attributes: { type: 'email', name: 'email' },
    }),
    createEvent({
      type: 'input',
      selector: 'input[name="password"]',
      tagName: 'input',
      value: 'password123',
      attributes: { type: 'password', name: 'password' },
    }),
    createEvent({
      type: 'submit',
      selector: 'form#login',
      tagName: 'form',
    }),
  ];

  return {
    id: `flow_${Date.now()}`,
    name: 'Test Flow',
    description: 'A test flow',
    intent: createIntent(),
    events,
    assertions: [
      {
        type: 'url_change',
        description: 'Should redirect after login',
        confidence: 0.9,
      },
    ],
    validations: [
      {
        fieldSelector: 'input[name="email"]',
        fieldName: 'email',
        constraint: 'required',
        confidence: 0.95,
      },
      {
        fieldSelector: 'input[name="email"]',
        fieldName: 'email',
        constraint: 'email',
        confidence: 0.95,
      },
    ],
    errorScenarios: [
      {
        type: 'authentication_error',
        trigger: 'Invalid credentials',
        expectedBehavior: 'Should show error message',
        statusCode: 401,
      },
    ],
    startUrl: 'https://example.com/login',
    duration: 5000,
    confidence: 0.9,
    ...overrides,
  };
}

describe('VariationGenerator', () => {
  let generator: VariationGenerator;

  beforeEach(() => {
    generator = new VariationGenerator();
  });

  describe('generateFromFlows', () => {
    it('should generate variations for a single flow', () => {
      const flow = createFlow();
      const result = generator.generateFromFlows({ flows: [flow] });

      expect(result.suites.length).toBe(1);
      expect(result.totalVariations).toBeGreaterThan(0);
      expect(result.generatedAt).toBeGreaterThan(0);
    });

    it('should generate at least 10 variations per flow', () => {
      const flow = createFlow();
      const result = generator.generateFromFlows({ flows: [flow] });

      expect(result.totalVariations).toBeGreaterThanOrEqual(10);
    });

    it('should include variations from all enabled categories', () => {
      const flow = createFlow();
      const result = generator.generateFromFlows({ flows: [flow] });

      expect(result.variationsByCategory.happy_path).toBeGreaterThan(0);
      expect(result.variationsByCategory.validation).toBeGreaterThan(0);
      expect(result.variationsByCategory.error_handling).toBeGreaterThan(0);
    });

    it('should respect maxVariationsPerFlow config', () => {
      const flow = createFlow();
      const result = generator.generateFromFlows({
        flows: [flow],
        config: { maxVariationsPerFlow: 5 },
      });

      expect(result.totalVariations).toBeLessThanOrEqual(5);
    });

    it('should respect minPriority config', () => {
      const flow = createFlow();
      const result = generator.generateFromFlows({
        flows: [flow],
        config: { minPriority: 'high' },
      });

      const suite = result.suites[0]!;
      expect(
        suite.variations.every(
          (v) => v.priority === 'critical' || v.priority === 'high'
        )
      ).toBe(true);
    });

    it('should handle empty flows array', () => {
      const result = generator.generateFromFlows({ flows: [] });

      expect(result.suites.length).toBe(0);
      expect(result.totalVariations).toBe(0);
    });

    it('should handle multiple flows', () => {
      const flows = [createFlow(), createFlow({ id: 'flow_2' })];
      const result = generator.generateFromFlows({ flows });

      expect(result.suites.length).toBe(2);
    });
  });

  describe('configuration', () => {
    it('should disable happy path generation', () => {
      const flow = createFlow();
      const result = generator.generateFromFlows({
        flows: [flow],
        config: { includeHappyPath: false },
      });

      expect(result.variationsByCategory.happy_path).toBe(0);
    });

    it('should disable validation generation', () => {
      const flow = createFlow();
      const result = generator.generateFromFlows({
        flows: [flow],
        config: { includeValidation: false },
      });

      expect(result.variationsByCategory.validation).toBe(0);
    });

    it('should disable error handling generation', () => {
      const flow = createFlow();
      const result = generator.generateFromFlows({
        flows: [flow],
        config: { includeErrorHandling: false },
      });

      expect(result.variationsByCategory.error_handling).toBe(0);
    });
  });
});

describe('HappyPathGenerator', () => {
  let generator: HappyPathGenerator;

  beforeEach(() => {
    generator = new HappyPathGenerator();
  });

  it('should generate at least one happy path variation', () => {
    const flow = createFlow();
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.length).toBeGreaterThan(0);
    expect(variations[0]!.category).toBe('happy_path');
  });

  it('should include navigation step when startUrl is provided', () => {
    const flow = createFlow({ startUrl: 'https://example.com/start' });
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);
    const steps = variations[0]!.steps;

    expect(steps[0]!.type).toBe('navigate');
    expect(steps[0]!.url).toBe('https://example.com/start');
  });

  it('should convert events to appropriate step types', () => {
    const flow = createFlow();
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);
    const steps = variations[0]!.steps;

    // Should have navigation + 3 event steps
    expect(steps.length).toBeGreaterThanOrEqual(3);

    // Find fill steps (from input events)
    const fillSteps = steps.filter((s) => s.type === 'fill');
    expect(fillSteps.length).toBeGreaterThanOrEqual(2);
  });

  it('should mark main happy path as critical priority', () => {
    const flow = createFlow();
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations[0]!.priority).toBe('critical');
  });
});

describe('ValidationVariationGenerator', () => {
  let generator: ValidationVariationGenerator;

  beforeEach(() => {
    generator = new ValidationVariationGenerator();
  });

  it('should generate empty field tests for required validations', () => {
    const flow = createFlow({
      validations: [
        {
          fieldSelector: 'input[name="email"]',
          fieldName: 'email',
          constraint: 'required',
          confidence: 0.95,
        },
      ],
    });
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.some((v) => v.id.includes('empty'))).toBe(true);
  });

  it('should generate invalid format tests for email validation', () => {
    const flow = createFlow({
      validations: [
        {
          fieldSelector: 'input[name="email"]',
          fieldName: 'email',
          constraint: 'email',
          confidence: 0.95,
        },
      ],
    });
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.some((v) => v.id.includes('invalid_email'))).toBe(true);
  });

  it('should generate security tests when enabled', () => {
    const flow = createFlow();
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.some((v) => v.category === 'security')).toBe(true);
    expect(variations.some((v) => v.id.includes('sql_injection'))).toBe(true);
    expect(variations.some((v) => v.id.includes('xss'))).toBe(true);
  });

  it('should generate min/max length tests', () => {
    const flow = createFlow({
      validations: [
        {
          fieldSelector: 'input[name="password"]',
          fieldName: 'password',
          constraint: 'min_length',
          value: 8,
          confidence: 0.95,
        },
      ],
    });
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.some((v) => v.id.includes('min_length'))).toBe(true);
  });
});

describe('ErrorVariationGenerator', () => {
  let generator: ErrorVariationGenerator;

  beforeEach(() => {
    generator = new ErrorVariationGenerator();
  });

  it('should generate variations from error scenarios', () => {
    const flow = createFlow({
      errorScenarios: [
        {
          type: 'server_error',
          trigger: 'Server error',
          expectedBehavior: 'Should show error',
          statusCode: 500,
        },
      ],
    });
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.length).toBeGreaterThan(0);
    expect(variations.some((v) => v.category === 'error_handling')).toBe(true);
  });

  it('should include mock response setup for server errors', () => {
    const flow = createFlow({
      errorScenarios: [
        {
          type: 'server_error',
          trigger: 'Server error',
          expectedBehavior: 'Should show error',
          statusCode: 500,
        },
      ],
    });
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    const serverErrorVar = variations.find((v) => v.id.includes('server_error'));
    expect(serverErrorVar).toBeDefined();
    expect(serverErrorVar!.requiresMocking).toBe(true);
  });

  it('should generate network error tests for API flows', () => {
    const flow = createFlow({ intent: createIntent({ type: 'form_submission' }) });
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.some((v) => v.id.includes('server_500'))).toBe(true);
    expect(variations.some((v) => v.id.includes('timeout'))).toBe(true);
  });
});

describe('EdgeCaseGenerator', () => {
  let generator: EdgeCaseGenerator;

  beforeEach(() => {
    generator = new EdgeCaseGenerator();
  });

  it('should generate double submit test for forms', () => {
    const flow = createFlow();
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.some((v) => v.id.includes('double_submit'))).toBe(true);
  });

  it('should generate back button test when flow changes URL', () => {
    const flow = createFlow({
      startUrl: 'https://example.com/login',
      endUrl: 'https://example.com/dashboard',
    });
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.some((v) => v.id.includes('back_button'))).toBe(true);
  });

  it('should generate unicode input test for forms with text inputs', () => {
    const flow = createFlow();
    const config: GenerationConfig = {
      includeHappyPath: true,
      includeValidation: true,
      includeErrorHandling: true,
      includeEdgeCases: true,
      includeSecurity: true,
      minPriority: 'low',
      maxVariationsPerFlow: 25,
      defaultTimeout: 30000,
    };

    const variations = generator.generate(flow, config);

    expect(variations.some((v) => v.id.includes('unicode'))).toBe(true);
  });
});

describe('TestNamer', () => {
  let namer: TestNamer;

  beforeEach(() => {
    namer = new TestNamer();
  });

  it('should generate semantic test names with "should" prefix', () => {
    const flow = createFlow();
    const variation = {
      id: 'test_1',
      name: '',
      description: 'Test description',
      category: 'happy_path' as const,
      priority: 'high' as const,
      steps: [],
      assertions: [],
      tags: [],
      sourceFlowId: flow.id,
    };

    const named = namer.applyNaming(variation, flow);

    expect(named.name).toMatch(/^should /);
  });

  it('should include action based on intent type', () => {
    const flow = createFlow({ intent: createIntent({ type: 'authentication' }) });
    const variation = {
      id: 'test_1',
      name: '',
      description: 'Test description',
      category: 'happy_path' as const,
      priority: 'high' as const,
      steps: [],
      assertions: [],
      tags: [],
      sourceFlowId: flow.id,
    };

    const named = namer.applyNaming(variation, flow);

    expect(named.name).toContain('authenticate');
  });

  it('should generate validation-specific names', () => {
    const flow = createFlow();
    const variation = {
      id: 'test_1',
      name: '',
      description: 'Validation test',
      category: 'validation' as const,
      priority: 'high' as const,
      steps: [],
      assertions: [],
      tags: [],
      sourceFlowId: flow.id,
      validationRule: {
        fieldSelector: 'input[name="email"]',
        fieldName: 'email',
        constraint: 'required' as const,
        confidence: 0.95,
      },
    };

    const named = namer.applyNaming(variation, flow);

    expect(named.name).toContain('validation error');
    expect(named.name).toContain('email');
    expect(named.name).toContain('empty');
  });

  it('should generate error-specific names', () => {
    const flow = createFlow();
    const variation = {
      id: 'test_1',
      name: '',
      description: 'Error test',
      category: 'error_handling' as const,
      priority: 'high' as const,
      steps: [],
      assertions: [],
      tags: [],
      sourceFlowId: flow.id,
      errorScenario: {
        type: 'server_error' as const,
        trigger: 'Server error',
        expectedBehavior: 'Show error',
        statusCode: 500,
      },
    };

    const named = namer.applyNaming(variation, flow);

    expect(named.name).toContain('handle error');
    expect(named.name).toContain('500');
  });
});

describe('createStep helper', () => {
  it('should create a step with required fields', () => {
    const step = createStep('click', 'Click button');

    expect(step.type).toBe('click');
    expect(step.description).toBe('Click button');
  });

  it('should include optional fields when provided', () => {
    const step = createStep('fill', 'Fill email', {
      selector: 'input[name="email"]',
      value: 'test@example.com',
    });

    expect(step.selector).toBe('input[name="email"]');
    expect(step.value).toBe('test@example.com');
  });

  it('should not include undefined optional fields', () => {
    const step = createStep('click', 'Click button', {});

    expect('selector' in step).toBe(false);
    expect('value' in step).toBe(false);
  });
});

describe('createAssertion helper', () => {
  it('should create an assertion with required fields', () => {
    const assertion = createAssertion('visible', 'Element should be visible');

    expect(assertion.type).toBe('visible');
    expect(assertion.description).toBe('Element should be visible');
  });

  it('should include optional fields when provided', () => {
    const assertion = createAssertion('text_contains', 'Should contain text', {
      selector: 'div.message',
      expected: 'Success',
    });

    expect(assertion.selector).toBe('div.message');
    expect(assertion.expected).toBe('Success');
  });
});
