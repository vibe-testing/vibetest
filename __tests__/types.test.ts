/**
 * Types Tests
 *
 * Comprehensive tests for type definitions, enums, and the ConsoleLogger class.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GraphNodeType,
  ElementType,
  InputFieldType,
  ElementEdgeType,
  InteractionEdgeType,
  TransitionType,
  NavigationStatus,
  ConsoleLogger,
} from '../src/graph/types.js';

describe('Enums', () => {
  describe('GraphNodeType', () => {
    it('has correct values', () => {
      expect(GraphNodeType.PAGE).toBe('PAGE');
      expect(GraphNodeType.ELEMENT).toBe('ELEMENT');
      expect(GraphNodeType.NETWORK_REQUEST).toBe('NETWORK_REQUEST');
      expect(GraphNodeType.NETWORK_MESSAGE).toBe('NETWORK_MESSAGE');
      expect(GraphNodeType.CUSTOM_EVENT).toBe('CUSTOM_EVENT');
      expect(GraphNodeType.STATE_SNAPSHOT).toBe('STATE_SNAPSHOT');
    });

    it('has all expected members', () => {
      const expectedMembers = [
        'PAGE',
        'ELEMENT',
        'NETWORK_REQUEST',
        'NETWORK_MESSAGE',
        'CUSTOM_EVENT',
        'STATE_SNAPSHOT',
      ];

      for (const member of expectedMembers) {
        expect(Object.values(GraphNodeType)).toContain(member);
      }
    });
  });

  describe('ElementType', () => {
    it('has correct values', () => {
      expect(ElementType.BUTTON).toBe('button');
      expect(ElementType.LINK).toBe('link');
      expect(ElementType.INPUT).toBe('input');
      expect(ElementType.SELECT).toBe('select');
      expect(ElementType.CHECKBOX).toBe('checkbox');
      expect(ElementType.RADIO).toBe('radio');
      expect(ElementType.TEXTAREA).toBe('textarea');
      expect(ElementType.FORM).toBe('form');
      expect(ElementType.IMAGE).toBe('image');
      expect(ElementType.VIDEO).toBe('video');
      expect(ElementType.AUDIO).toBe('audio');
      expect(ElementType.IFRAME).toBe('iframe');
      expect(ElementType.OTHER).toBe('other');
    });

    it('has all expected members', () => {
      const expectedMembers = [
        'button',
        'link',
        'input',
        'select',
        'checkbox',
        'radio',
        'textarea',
        'form',
        'image',
        'video',
        'audio',
        'iframe',
        'other',
      ];

      for (const member of expectedMembers) {
        expect(Object.values(ElementType)).toContain(member);
      }
    });
  });

  describe('InputFieldType', () => {
    it('has correct values', () => {
      expect(InputFieldType.TEXT).toBe('text');
      expect(InputFieldType.EMAIL).toBe('email');
      expect(InputFieldType.PASSWORD).toBe('password');
      expect(InputFieldType.NUMBER).toBe('number');
      expect(InputFieldType.TEL).toBe('tel');
      expect(InputFieldType.URL).toBe('url');
      expect(InputFieldType.SEARCH).toBe('search');
      expect(InputFieldType.DATE).toBe('date');
      expect(InputFieldType.TIME).toBe('time');
      expect(InputFieldType.DATETIME).toBe('datetime-local');
      expect(InputFieldType.FILE).toBe('file');
      expect(InputFieldType.HIDDEN).toBe('hidden');
      expect(InputFieldType.OTHER).toBe('other');
    });

    it('has all expected members', () => {
      const expectedMembers = [
        'text',
        'email',
        'password',
        'number',
        'tel',
        'url',
        'search',
        'date',
        'time',
        'datetime-local',
        'file',
        'hidden',
        'other',
      ];

      for (const member of expectedMembers) {
        expect(Object.values(InputFieldType)).toContain(member);
      }
    });
  });

  describe('ElementEdgeType', () => {
    it('has correct values', () => {
      expect(ElementEdgeType.CONTAINS).toBe('CONTAINS');
      expect(ElementEdgeType.TRIGGERS).toBe('TRIGGERS');
      expect(ElementEdgeType.SUBMITS_TO).toBe('SUBMITS_TO');
      expect(ElementEdgeType.NAVIGATES_TO).toBe('NAVIGATES_TO');
      expect(ElementEdgeType.SIBLING_OF).toBe('SIBLING_OF');
    });

    it('has all expected members', () => {
      const expectedMembers = [
        'CONTAINS',
        'TRIGGERS',
        'SUBMITS_TO',
        'NAVIGATES_TO',
        'SIBLING_OF',
      ];

      for (const member of expectedMembers) {
        expect(Object.values(ElementEdgeType)).toContain(member);
      }
    });
  });

  describe('InteractionEdgeType', () => {
    it('has correct values', () => {
      expect(InteractionEdgeType.EMITS).toBe('EMITS');
      expect(InteractionEdgeType.REQUESTS).toBe('REQUESTS');
      expect(InteractionEdgeType.RECEIVES).toBe('RECEIVES');
      expect(InteractionEdgeType.MUTATES).toBe('MUTATES');
      expect(InteractionEdgeType.CAUSES).toBe('CAUSES');
    });

    it('has all expected members', () => {
      const expectedMembers = [
        'EMITS',
        'REQUESTS',
        'RECEIVES',
        'MUTATES',
        'CAUSES',
      ];

      for (const member of expectedMembers) {
        expect(Object.values(InteractionEdgeType)).toContain(member);
      }
    });
  });

  describe('TransitionType', () => {
    it('has correct values', () => {
      expect(TransitionType.CLICK).toBe('click');
      expect(TransitionType.FORM_SUBMIT).toBe('form_submit');
      expect(TransitionType.NAVIGATION).toBe('navigation');
      expect(TransitionType.REDIRECT).toBe('redirect');
      expect(TransitionType.AJAX).toBe('ajax');
      expect(TransitionType.PROGRAMMATIC).toBe('programmatic');
      expect(TransitionType.LINK_CLICK).toBe('link_click');
      expect(TransitionType.BUTTON_CLICK).toBe('button_click');
      expect(TransitionType.BACK_NAVIGATION).toBe('back_navigation');
      expect(TransitionType.FORWARD_NAVIGATION).toBe('forward_navigation');
      expect(TransitionType.REFRESH).toBe('refresh');
      expect(TransitionType.UNKNOWN).toBe('unknown');
    });

    it('has all expected members', () => {
      const expectedMembers = [
        'click',
        'form_submit',
        'navigation',
        'redirect',
        'ajax',
        'programmatic',
        'link_click',
        'button_click',
        'back_navigation',
        'forward_navigation',
        'refresh',
        'unknown',
      ];

      for (const member of expectedMembers) {
        expect(Object.values(TransitionType)).toContain(member);
      }
    });
  });

  describe('NavigationStatus', () => {
    it('has correct values', () => {
      expect(NavigationStatus.SUCCESS).toBe('success');
      expect(NavigationStatus.FAILED).toBe('failed');
      expect(NavigationStatus.TIMEOUT).toBe('timeout');
      expect(NavigationStatus.BLOCKED).toBe('blocked');
      expect(NavigationStatus.PENDING).toBe('pending');
    });

    it('has all expected members', () => {
      const expectedMembers = [
        'success',
        'failed',
        'timeout',
        'blocked',
        'pending',
      ];

      for (const member of expectedMembers) {
        expect(Object.values(NavigationStatus)).toContain(member);
      }
    });
  });
});

describe('ConsoleLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };
  const originalEnv = process.env.DEBUG;

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.debug.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
    process.env.DEBUG = originalEnv;
  });

  describe('constructor', () => {
    it('creates logger without context', () => {
      const logger = new ConsoleLogger();
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    it('creates logger with context', () => {
      const logger = new ConsoleLogger('TestContext');
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });
  });

  describe('log()', () => {
    it('logs message without context', () => {
      const logger = new ConsoleLogger();
      logger.log('Test message');

      expect(consoleSpy.log).toHaveBeenCalledWith('Test message');
    });

    it('logs message with context prefix', () => {
      const logger = new ConsoleLogger('MyContext');
      logger.log('Test message');

      expect(consoleSpy.log).toHaveBeenCalledWith('[MyContext] Test message');
    });

    it('logs message with additional arguments', () => {
      const logger = new ConsoleLogger('Test');
      logger.log('Message with args', { foo: 'bar' }, 123);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[Test] Message with args',
        { foo: 'bar' },
        123
      );
    });

    it('handles empty message', () => {
      const logger = new ConsoleLogger('Test');
      logger.log('');

      expect(consoleSpy.log).toHaveBeenCalledWith('[Test] ');
    });
  });

  describe('debug()', () => {
    it('does not log when DEBUG env is not set', () => {
      delete process.env.DEBUG;
      const logger = new ConsoleLogger('Test');
      logger.debug('Debug message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('logs when DEBUG env is set', () => {
      process.env.DEBUG = 'true';
      const logger = new ConsoleLogger('Test');
      logger.debug('Debug message');

      expect(consoleSpy.debug).toHaveBeenCalledWith('[Test] Debug message');
    });

    it('logs debug message with context', () => {
      process.env.DEBUG = '1';
      const logger = new ConsoleLogger('DebugContext');
      logger.debug('Debug info', { data: 'value' });

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '[DebugContext] Debug info',
        { data: 'value' }
      );
    });

    it('logs debug message without context when DEBUG is set', () => {
      process.env.DEBUG = 'yes';
      const logger = new ConsoleLogger();
      logger.debug('Plain debug');

      expect(consoleSpy.debug).toHaveBeenCalledWith('Plain debug');
    });
  });

  describe('warn()', () => {
    it('logs warning message without context', () => {
      const logger = new ConsoleLogger();
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalledWith('Warning message');
    });

    it('logs warning message with context prefix', () => {
      const logger = new ConsoleLogger('WarnContext');
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[WarnContext] Warning message'
      );
    });

    it('logs warning with additional arguments', () => {
      const logger = new ConsoleLogger('Test');
      logger.warn('Warning with data', { warning: true });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[Test] Warning with data',
        { warning: true }
      );
    });
  });

  describe('error()', () => {
    it('logs error message without context', () => {
      const logger = new ConsoleLogger();
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalledWith('Error message');
    });

    it('logs error message with context prefix', () => {
      const logger = new ConsoleLogger('ErrorContext');
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ErrorContext] Error message'
      );
    });

    it('logs error with additional arguments', () => {
      const error = new Error('Test error');
      const logger = new ConsoleLogger('Test');
      logger.error('An error occurred', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[Test] An error occurred',
        error
      );
    });
  });

  describe('format()', () => {
    it('returns message as-is when no context', () => {
      const logger = new ConsoleLogger();
      logger.log('Simple message');

      expect(consoleSpy.log).toHaveBeenCalledWith('Simple message');
    });

    it('prepends context in brackets', () => {
      const logger = new ConsoleLogger('MyModule');
      logger.log('Module message');

      expect(consoleSpy.log).toHaveBeenCalledWith('[MyModule] Module message');
    });

    it('handles special characters in context', () => {
      const logger = new ConsoleLogger('Module:SubModule');
      logger.log('Message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[Module:SubModule] Message'
      );
    });

    it('handles empty string context', () => {
      const logger = new ConsoleLogger('');
      logger.log('Message');

      // Empty string is falsy, so no context prefix
      expect(consoleSpy.log).toHaveBeenCalledWith('Message');
    });
  });

  describe('Logger interface compliance', () => {
    it('implements log method', () => {
      const logger = new ConsoleLogger();
      expect(typeof logger.log).toBe('function');
    });

    it('implements debug method', () => {
      const logger = new ConsoleLogger();
      expect(typeof logger.debug).toBe('function');
    });

    it('implements warn method', () => {
      const logger = new ConsoleLogger();
      expect(typeof logger.warn).toBe('function');
    });

    it('implements error method', () => {
      const logger = new ConsoleLogger();
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('multiple loggers', () => {
    it('allows multiple loggers with different contexts', () => {
      const logger1 = new ConsoleLogger('Module1');
      const logger2 = new ConsoleLogger('Module2');

      logger1.log('Message from 1');
      logger2.log('Message from 2');

      expect(consoleSpy.log).toHaveBeenCalledWith('[Module1] Message from 1');
      expect(consoleSpy.log).toHaveBeenCalledWith('[Module2] Message from 2');
    });

    it('loggers are independent', () => {
      const logger1 = new ConsoleLogger('First');
      const logger2 = new ConsoleLogger('Second');
      const logger3 = new ConsoleLogger();

      logger1.warn('Warning 1');
      logger2.error('Error 2');
      logger3.log('Plain log');

      expect(consoleSpy.warn).toHaveBeenCalledWith('[First] Warning 1');
      expect(consoleSpy.error).toHaveBeenCalledWith('[Second] Error 2');
      expect(consoleSpy.log).toHaveBeenCalledWith('Plain log');
    });
  });
});
