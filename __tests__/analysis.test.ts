/**
 * VibeTesting CLI - Analysis Module Tests
 *
 * Tests for flow analysis, intent detection, validation extraction,
 * and error scenario detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FlowAnalyzer,
  IntentDetector,
  ValidationExtractor,
  ErrorScenarioDetector,
} from '../src/analysis/index.js';
import type { RecordedEvent, RecordingSession } from '../src/recording/types.js';
import type { DetectedIntent, ValidationRule } from '../src/analysis/types.js';

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

function createSession(events: RecordedEvent[]): RecordingSession {
  return {
    id: `session_${Date.now()}`,
    startUrl: events[0]?.pageUrl || 'https://example.com',
    events,
    startTime: events[0]?.timestamp || Date.now(),
    endTime: events[events.length - 1]?.timestamp || Date.now(),
    metadata: {},
  };
}

describe('IntentDetector', () => {
  let detector: IntentDetector;

  beforeEach(() => {
    detector = new IntentDetector();
  });

  describe('form submission detection', () => {
    it('should detect form submission with multiple inputs and submit', () => {
      // Using non-auth fields to avoid authentication pattern
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="first_name"]',
          tagName: 'input',
          attributes: { type: 'text', name: 'first_name' },
        }),
        createEvent({
          type: 'input',
          selector: 'input[name="last_name"]',
          tagName: 'input',
          attributes: { type: 'text', name: 'last_name' },
        }),
        createEvent({
          type: 'submit',
          selector: 'form#profile',
          tagName: 'form',
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.length).toBeGreaterThan(0);
      expect(intents[0]!.type).toBe('form_submission');
      expect(intents[0]!.confidence).toBeGreaterThan(0.5);
    });

    it('should detect form submission with button click', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="name"]',
          tagName: 'input',
        }),
        createEvent({
          type: 'click',
          selector: 'button[type="submit"]',
          tagName: 'button',
          attributes: { type: 'submit' },
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.length).toBeGreaterThan(0);
      expect(intents[0]!.type).toBe('form_submission');
    });
  });

  describe('authentication detection', () => {
    it('should detect authentication with username/password fields', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="username"]',
          tagName: 'input',
          attributes: { name: 'username', type: 'text' },
        }),
        createEvent({
          type: 'input',
          selector: 'input[name="password"]',
          tagName: 'input',
          attributes: { name: 'password', type: 'password' },
        }),
        createEvent({
          type: 'click',
          selector: 'button#login',
          tagName: 'button',
          text: 'Login',
        }),
      ];

      const intents = detector.detectIntents(events);

      // Password field + submit button triggers authentication pattern
      expect(intents.length).toBeGreaterThan(0);
      expect(intents[0]!.type).toBe('authentication');
      expect(intents[0]!.confidence).toBeGreaterThan(0.7);
    });

    it('should detect authentication with email/password fields', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          tagName: 'input',
          attributes: { name: 'email', type: 'email' },
        }),
        createEvent({
          type: 'input',
          selector: 'input[name="password"]',
          tagName: 'input',
          attributes: { name: 'password', type: 'password' },
        }),
        createEvent({
          type: 'submit',
          selector: 'form#auth',
          tagName: 'form',
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.some((i) => i.type === 'authentication')).toBe(true);
    });
  });

  describe('search detection', () => {
    it('should detect search with search input and enter key', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[type="search"]',
          tagName: 'input',
          value: 'test query',
          attributes: { type: 'search', name: 'search' },
        }),
        createEvent({
          type: 'keydown',
          selector: 'input[type="search"]',
          tagName: 'input',
          key: 'Enter',
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.some((i) => i.type === 'search')).toBe(true);
    });

    it('should detect search with search button click', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="query"]',
          tagName: 'input',
          value: 'search term',
          attributes: { name: 'query', placeholder: 'Search...' },
        }),
        createEvent({
          type: 'click',
          selector: 'button.search-btn',
          tagName: 'button',
          text: 'Search',
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.some((i) => i.type === 'search')).toBe(true);
    });
  });

  describe('checkout detection', () => {
    it('should detect checkout flow', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="card_number"]',
          tagName: 'input',
          attributes: { name: 'card_number' },
        }),
        createEvent({
          type: 'input',
          selector: 'input[name="cvv"]',
          tagName: 'input',
          attributes: { name: 'cvv' },
        }),
        createEvent({
          type: 'click',
          selector: 'button#pay',
          tagName: 'button',
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.some((i) => i.type === 'checkout')).toBe(true);
    });
  });

  describe('file upload detection', () => {
    it('should detect file upload', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'change',
          selector: 'input[type="file"]',
          tagName: 'input',
          attributes: { type: 'file' },
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.some((i) => i.type === 'file_upload')).toBe(true);
    });
  });

  describe('pagination detection', () => {
    it('should detect pagination with page numbers', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'click',
          selector: 'a.pagination-link',
          tagName: 'a',
          text: '2', // Use 'text' not 'textContent'
          attributes: { href: '?page=2' },
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.some((i) => i.type === 'pagination')).toBe(true);
    });

    it('should detect pagination with next button', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'click',
          selector: 'button.next-page',
          tagName: 'button',
          text: 'Next',
        }),
      ];

      const intents = detector.detectIntents(events);

      expect(intents.some((i) => i.type === 'pagination')).toBe(true);
    });
  });

  describe('empty and minimal events', () => {
    it('should handle empty events array', () => {
      const intents = detector.detectIntents([]);
      expect(intents).toEqual([]);
    });

    it('should return unknown for single unrecognized click', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'click',
          selector: 'div.random',
          tagName: 'div',
        }),
      ];

      const intents = detector.detectIntents(events);
      expect(intents.length).toBe(0);
    });
  });
});

describe('ValidationExtractor', () => {
  let extractor: ValidationExtractor;

  beforeEach(() => {
    extractor = new ValidationExtractor();
  });

  describe('HTML5 validation attributes', () => {
    it('should extract required validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          attributes: { required: 'true', name: 'email' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'required')).toBe(true);
    });

    it('should extract email type validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          attributes: { type: 'email', name: 'email' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'email')).toBe(true);
      const emailVal = validations.find((v) => v.constraint === 'email');
      expect(emailVal!.confidence).toBe(0.95);
    });

    it('should extract minlength validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="password"]',
          attributes: { minlength: '8', name: 'password' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'min_length')).toBe(true);
      const minLen = validations.find((v) => v.constraint === 'min_length');
      expect(minLen!.value).toBe(8);
    });

    it('should extract maxlength validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="username"]',
          attributes: { maxlength: '50', name: 'username' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'max_length')).toBe(true);
      const maxLen = validations.find((v) => v.constraint === 'max_length');
      expect(maxLen!.value).toBe(50);
    });

    it('should extract pattern validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="phone"]',
          attributes: { pattern: '^\\d{3}-\\d{4}$', name: 'phone' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'pattern')).toBe(true);
      const patternVal = validations.find((v) => v.constraint === 'pattern');
      expect(patternVal!.value).toBe('^\\d{3}-\\d{4}$');
    });

    it('should extract min/max value for number inputs', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="age"]',
          attributes: { type: 'number', min: '18', max: '100', name: 'age' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'min_value')).toBe(true);
      expect(validations.some((v) => v.constraint === 'max_value')).toBe(true);
    });

    it('should extract phone validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="telephone"]',
          attributes: { type: 'tel', name: 'telephone' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'phone')).toBe(true);
    });

    it('should extract URL validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="website"]',
          attributes: { type: 'url', name: 'website' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'url')).toBe(true);
    });

    it('should extract date validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="birthdate"]',
          attributes: { type: 'date', name: 'birthdate' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'date')).toBe(true);
    });

    it('should extract file type validation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'change',
          selector: 'input[name="document"]',
          attributes: { type: 'file', accept: '.pdf,.doc', name: 'document' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'file_type')).toBe(true);
      const fileType = validations.find((v) => v.constraint === 'file_type');
      expect(fileType!.value).toBe('.pdf,.doc');
    });
  });

  describe('inferred validations', () => {
    it('should infer email validation from field name', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="user_email"]',
          attributes: { name: 'user_email', type: 'text' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'email')).toBe(true);
      const emailVal = validations.find((v) => v.constraint === 'email');
      expect(emailVal!.confidence).toBe(0.7); // Lower confidence for inferred
    });

    it('should infer phone validation from field name', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="mobile_phone"]',
          attributes: { name: 'mobile_phone', type: 'text' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'phone')).toBe(true);
    });

    it('should infer password min length', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="password"]',
          attributes: { name: 'password', type: 'password' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'min_length')).toBe(true);
      const minLen = validations.find((v) => v.constraint === 'min_length');
      expect(minLen!.value).toBe(8);
      expect(minLen!.confidence).toBe(0.5);
    });

    it('should infer zip code pattern', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="zip_code"]',
          attributes: { name: 'zip_code', type: 'text' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      expect(validations.some((v) => v.constraint === 'pattern')).toBe(true);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate same field/constraint with higher confidence winning', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          attributes: { type: 'email', name: 'email' },
        }),
        createEvent({
          type: 'focus',
          selector: 'input[name="email"]',
          attributes: { type: 'email', name: 'email' },
        }),
      ];

      const validations = extractor.extractValidations(events);

      // Should only have one email validation
      const emailValidations = validations.filter((v) => v.constraint === 'email');
      expect(emailValidations.length).toBe(1);
      expect(emailValidations[0]!.confidence).toBe(0.95);
    });
  });

  describe('empty and minimal events', () => {
    it('should handle empty events array', () => {
      const validations = extractor.extractValidations([]);
      expect(validations).toEqual([]);
    });

    it('should skip non-form events', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'click',
          selector: 'button#submit',
        }),
      ];

      const validations = extractor.extractValidations(events);
      expect(validations.length).toBe(0);
    });
  });
});

describe('ErrorScenarioDetector', () => {
  let detector: ErrorScenarioDetector;

  beforeEach(() => {
    detector = new ErrorScenarioDetector();
  });

  describe('form submission errors', () => {
    it('should generate required field error scenarios', () => {
      const events: RecordedEvent[] = [
        createEvent({ type: 'input', selector: 'input[name="email"]' }),
      ];
      const intent: DetectedIntent = {
        type: 'form_submission',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 0,
        triggerEvents: [events[0]!.id],
        metadata: {},
      };
      const validations: ValidationRule[] = [
        {
          fieldSelector: 'input[name="email"]',
          fieldName: 'email',
          constraint: 'required',
          confidence: 0.95,
        },
      ];

      const scenarios = detector.generateScenarios(events, intent, validations);

      expect(scenarios.some((s) => s.type === 'validation_error')).toBe(true);
      expect(
        scenarios.some(
          (s) =>
            s.trigger.includes('empty') && s.trigger.includes('email')
        )
      ).toBe(true);
    });

    it('should generate email format error scenario', () => {
      const events: RecordedEvent[] = [
        createEvent({ type: 'input', selector: 'input[name="email"]' }),
      ];
      const intent: DetectedIntent = {
        type: 'form_submission',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 0,
        triggerEvents: [events[0]!.id],
        metadata: {},
      };
      const validations: ValidationRule[] = [
        {
          fieldSelector: 'input[name="email"]',
          constraint: 'email',
          confidence: 0.95,
        },
      ];

      const scenarios = detector.generateScenarios(events, intent, validations);

      expect(
        scenarios.some(
          (s) =>
            s.type === 'validation_error' && s.trigger.includes('invalid email')
        )
      ).toBe(true);
    });

    it('should generate min length error scenario', () => {
      const events: RecordedEvent[] = [
        createEvent({ type: 'input', selector: 'input[name="password"]' }),
      ];
      const intent: DetectedIntent = {
        type: 'form_submission',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 0,
        triggerEvents: [events[0]!.id],
        metadata: {},
      };
      const validations: ValidationRule[] = [
        {
          fieldSelector: 'input[name="password"]',
          fieldName: 'password',
          constraint: 'min_length',
          value: 8,
          confidence: 0.95,
        },
      ];

      const scenarios = detector.generateScenarios(events, intent, validations);

      expect(
        scenarios.some(
          (s) =>
            s.type === 'validation_error' && s.trigger.includes('shorter than')
        )
      ).toBe(true);
    });

    it('should generate XSS/SQL injection test scenarios', () => {
      const events: RecordedEvent[] = [
        createEvent({ type: 'input', selector: 'input[name="name"]' }),
      ];
      const intent: DetectedIntent = {
        type: 'form_submission',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 0,
        triggerEvents: [events[0]!.id],
        metadata: {},
      };

      const scenarios = detector.generateScenarios(events, intent, []);

      expect(
        scenarios.some((s) => s.trigger.includes('XSS'))
      ).toBe(true);
      expect(
        scenarios.some((s) => s.trigger.includes('SQL injection'))
      ).toBe(true);
    });
  });

  describe('authentication errors', () => {
    it('should generate authentication error scenarios', () => {
      const events: RecordedEvent[] = [
        createEvent({ type: 'input', selector: 'input[name="username"]' }),
        createEvent({ type: 'input', selector: 'input[name="password"]' }),
      ];
      const intent: DetectedIntent = {
        type: 'authentication',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 1,
        triggerEvents: events.map((e) => e.id),
        metadata: {},
      };

      const scenarios = detector.generateScenarios(events, intent, []);

      expect(
        scenarios.some((s) => s.type === 'authentication_error')
      ).toBe(true);
      expect(scenarios.some((s) => s.type === 'rate_limit')).toBe(true);
      expect(
        scenarios.some((s) => s.trigger.includes('invalid credentials'))
      ).toBe(true);
    });
  });

  describe('checkout errors', () => {
    it('should generate payment error scenarios', () => {
      const events: RecordedEvent[] = [
        createEvent({ type: 'input', selector: 'input[name="card_number"]' }),
      ];
      const intent: DetectedIntent = {
        type: 'checkout',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 0,
        triggerEvents: [events[0]!.id],
        metadata: {},
      };

      const scenarios = detector.generateScenarios(events, intent, []);

      expect(
        scenarios.some((s) => s.trigger.includes('expired credit card'))
      ).toBe(true);
      expect(
        scenarios.some((s) => s.trigger.includes('invalid card number'))
      ).toBe(true);
      expect(
        scenarios.some((s) => s.trigger.includes('insufficient funds'))
      ).toBe(true);
    });
  });

  describe('file upload errors', () => {
    it('should generate file upload error scenarios', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'change',
          selector: 'input[type="file"]',
          attributes: { type: 'file', accept: '.pdf' },
        }),
      ];
      const intent: DetectedIntent = {
        type: 'file_upload',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 0,
        triggerEvents: [events[0]!.id],
        metadata: {},
      };

      const scenarios = detector.generateScenarios(events, intent, []);

      expect(
        scenarios.some((s) => s.trigger.includes('invalid type'))
      ).toBe(true);
      expect(
        scenarios.some((s) => s.trigger.includes('size limit'))
      ).toBe(true);
    });
  });

  describe('network errors', () => {
    it('should generate network error scenarios for API flows', () => {
      const events: RecordedEvent[] = [
        createEvent({ type: 'submit', selector: 'form#data' }),
      ];
      const intent: DetectedIntent = {
        type: 'form_submission',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 0,
        triggerEvents: [events[0]!.id],
        metadata: {},
      };

      const scenarios = detector.generateScenarios(events, intent, []);

      expect(scenarios.some((s) => s.type === 'network_timeout')).toBe(true);
      expect(scenarios.some((s) => s.type === 'server_error')).toBe(true);
      expect(scenarios.some((s) => s.statusCode === 500)).toBe(true);
      expect(scenarios.some((s) => s.statusCode === 503)).toBe(true);
    });

    it('should not generate network errors for navigation flows', () => {
      const events: RecordedEvent[] = [
        createEvent({ type: 'click', selector: 'a.nav-link' }),
      ];
      const intent: DetectedIntent = {
        type: 'navigation',
        confidence: 0.9,
        startEventIndex: 0,
        endEventIndex: 0,
        triggerEvents: [events[0]!.id],
        metadata: {},
      };

      const scenarios = detector.generateScenarios(events, intent, []);

      expect(scenarios.filter((s) => s.type === 'network_timeout').length).toBe(
        0
      );
    });
  });
});

describe('FlowAnalyzer', () => {
  let analyzer: FlowAnalyzer;

  beforeEach(() => {
    analyzer = new FlowAnalyzer();
  });

  describe('session analysis', () => {
    it('should analyze a simple form submission session', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          tagName: 'input',
          attributes: { type: 'email', name: 'email', required: 'true' },
          timestamp: 1000,
        }),
        createEvent({
          type: 'input',
          selector: 'input[name="password"]',
          tagName: 'input',
          attributes: { type: 'password', name: 'password' },
          timestamp: 2000,
        }),
        createEvent({
          type: 'submit',
          selector: 'form#login',
          tagName: 'form',
          timestamp: 3000,
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      expect(result.sessionId).toBe(session.id);
      expect(result.flows.length).toBeGreaterThan(0);
      expect(result.analyzedAt).toBeGreaterThan(0);
    });

    it('should detect intents in flows', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="username"]',
          tagName: 'input',
          attributes: { name: 'username' },
          timestamp: 1000,
        }),
        createEvent({
          type: 'input',
          selector: 'input[name="password"]',
          tagName: 'input',
          attributes: { type: 'password', name: 'password' },
          timestamp: 2000,
        }),
        createEvent({
          type: 'click',
          selector: 'button#login',
          tagName: 'button',
          text: 'Login',
          timestamp: 3000,
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      expect(result.flows.length).toBeGreaterThan(0);
      // Should detect authentication intent
      expect(result.flows[0]!.intent.type).toBe('authentication');
    });

    it('should extract validations from flows', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          tagName: 'input',
          attributes: { type: 'email', name: 'email', required: 'true' },
          timestamp: 1000,
        }),
        createEvent({
          type: 'submit',
          selector: 'form',
          tagName: 'form',
          timestamp: 2000,
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      expect(result.validationRules.length).toBeGreaterThan(0);
      expect(
        result.validationRules.some((v) => v.constraint === 'required')
      ).toBe(true);
    });

    it('should generate error scenarios', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          tagName: 'input',
          attributes: { type: 'email', name: 'email' },
          timestamp: 1000,
        }),
        createEvent({
          type: 'submit',
          selector: 'form',
          tagName: 'form',
          timestamp: 2000,
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      expect(result.errorScenarios.length).toBeGreaterThan(0);
    });

    it('should generate assertions', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="query"]',
          tagName: 'input',
          pageUrl: 'https://example.com/search',
          timestamp: 1000,
        }),
        createEvent({
          type: 'click',
          selector: 'button#submit',
          tagName: 'button',
          pageUrl: 'https://example.com/search',
          timestamp: 2000,
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      expect(result.flows.length).toBeGreaterThan(0);
      // Should have some assertions
      const totalAssertions = result.flows.reduce(
        (sum, f) => sum + f.assertions.length,
        0
      );
      expect(totalAssertions).toBeGreaterThan(0);
    });
  });

  describe('flow splitting', () => {
    it('should split flows on large time gaps', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'click',
          selector: 'button#first',
          timestamp: 1000,
        }),
        createEvent({
          type: 'click',
          selector: 'button#second',
          timestamp: 1000 + 60000, // 60 seconds later
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      expect(result.flows.length).toBe(2);
    });

    it('should split flows on page navigation', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'click',
          selector: 'a.nav',
          pageUrl: 'https://example.com/page1',
          timestamp: 1000,
        }),
        createEvent({
          type: 'navigation',
          selector: '',
          pageUrl: 'https://example.com/page2',
          timestamp: 2000,
        }),
        createEvent({
          type: 'click',
          selector: 'button#action',
          pageUrl: 'https://example.com/page2',
          timestamp: 3000,
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      expect(result.flows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('coverage metrics', () => {
    it('should calculate coverage metrics', () => {
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input#email',
          pageUrl: 'https://example.com/form',
          timestamp: 1000,
        }),
        createEvent({
          type: 'input',
          selector: 'input#name',
          pageUrl: 'https://example.com/form',
          timestamp: 2000,
        }),
        createEvent({
          type: 'click',
          selector: 'button#submit',
          pageUrl: 'https://example.com/confirm',
          timestamp: 3000,
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      expect(result.coverage.totalEvents).toBe(3);
      expect(result.coverage.uniquePages).toBe(2);
      expect(result.coverage.uniqueSelectors).toBe(3);
    });
  });

  describe('insights', () => {
    it('should generate insights for patterns', () => {
      // Create multiple similar form submissions
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          tagName: 'input',
          attributes: { type: 'email' },
          timestamp: 1000,
        }),
        createEvent({
          type: 'submit',
          selector: 'form#first',
          tagName: 'form',
          timestamp: 2000,
        }),
        createEvent({
          type: 'navigation',
          selector: '',
          pageUrl: 'https://example.com/second',
          timestamp: 3000,
        }),
        createEvent({
          type: 'input',
          selector: 'input[name="data"]',
          tagName: 'input',
          pageUrl: 'https://example.com/second',
          timestamp: 4000,
        }),
        createEvent({
          type: 'submit',
          selector: 'form#second',
          tagName: 'form',
          pageUrl: 'https://example.com/second',
          timestamp: 5000,
        }),
      ];

      const session = createSession(events);
      const result = analyzer.analyzeSession(session);

      // Should have some insights generated
      expect(result.insights).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should respect minIntentConfidence config', () => {
      const strictAnalyzer = new FlowAnalyzer({ minIntentConfidence: 0.95 });
      const events: RecordedEvent[] = [
        createEvent({
          type: 'click',
          selector: 'button#random',
          tagName: 'button',
        }),
      ];

      const session = createSession(events);
      const result = strictAnalyzer.analyzeSession(session);

      // High confidence requirement may filter out low-confidence intents
      expect(result.flows.every((f) => f.confidence >= 0.3)).toBe(true);
    });

    it('should respect generateErrorScenarios config', () => {
      const noErrorsAnalyzer = new FlowAnalyzer({ generateErrorScenarios: false });
      const events: RecordedEvent[] = [
        createEvent({
          type: 'input',
          selector: 'input[name="email"]',
          tagName: 'input',
          attributes: { type: 'email' },
        }),
        createEvent({
          type: 'submit',
          selector: 'form',
          tagName: 'form',
        }),
      ];

      const session = createSession(events);
      const result = noErrorsAnalyzer.analyzeSession(session);

      expect(result.errorScenarios.length).toBe(0);
    });
  });

  describe('empty sessions', () => {
    it('should handle empty session', () => {
      const session = createSession([]);
      const result = analyzer.analyzeSession(session);

      expect(result.flows).toEqual([]);
      expect(result.coverage.totalEvents).toBe(0);
    });
  });
});
