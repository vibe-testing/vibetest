/**
 * Tests for the Recording Module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SessionManager,
  RecordingServer,
  EventListener,
  createRecordingScript,
  createSelectorGeneratorScript,
} from '../src/recording/index.js';
import type {
  RecordedEvent,
  RecordingSession,
  RecordingConfig,
} from '../src/recording/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocket } from 'ws';

// Mock fs for session manager tests
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

// ============================================================================
// SessionManager Tests
// ============================================================================

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('creates a new session with required fields', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
      });

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_/);

      const session = manager.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.startUrl).toBe('https://example.com');
      expect(session?.events).toEqual([]);
      expect(session?.startTime).toBeDefined();
      expect(session?.endTime).toBeNull();
    });

    it('creates a session with optional fields', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
        name: 'Login flow test',
        browser: 'Chrome 120',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
      });

      const session = manager.getSession(sessionId);
      expect(session?.name).toBe('Login flow test');
      expect(session?.metadata.browser).toBe('Chrome 120');
      expect(session?.metadata.userAgent).toBe('Mozilla/5.0');
      expect(session?.metadata.viewport).toEqual({ width: 1920, height: 1080 });
    });

    it('sets the created session as active', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
      });

      expect(manager.getActiveSessionId()).toBe(sessionId);
    });
  });

  describe('addEvents', () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = manager.createSession({
        startUrl: 'https://example.com',
      });
    });

    it('adds events to a session', () => {
      const events: RecordedEvent[] = [
        {
          id: 'evt_1',
          type: 'click',
          timestamp: Date.now(),
          selector: '#button',
          alternativeSelectors: [],
          tagName: 'button',
          pageUrl: 'https://example.com',
        },
      ];

      const result = manager.addEvents(sessionId, events);
      expect(result).toBe(true);

      const session = manager.getSession(sessionId);
      expect(session?.events).toHaveLength(1);
      expect(session?.events[0]?.id).toBe('evt_1');
    });

    it('sorts events by timestamp', () => {
      const now = Date.now();
      const events: RecordedEvent[] = [
        {
          id: 'evt_2',
          type: 'input',
          timestamp: now + 1000,
          selector: '#input',
          alternativeSelectors: [],
          tagName: 'input',
          pageUrl: 'https://example.com',
        },
        {
          id: 'evt_1',
          type: 'click',
          timestamp: now,
          selector: '#button',
          alternativeSelectors: [],
          tagName: 'button',
          pageUrl: 'https://example.com',
        },
      ];

      manager.addEvents(sessionId, events);

      const session = manager.getSession(sessionId);
      expect(session?.events[0]?.id).toBe('evt_1');
      expect(session?.events[1]?.id).toBe('evt_2');
    });

    it('filters duplicate events by ID', () => {
      const event: RecordedEvent = {
        id: 'evt_1',
        type: 'click',
        timestamp: Date.now(),
        selector: '#button',
        alternativeSelectors: [],
        tagName: 'button',
        pageUrl: 'https://example.com',
      };

      manager.addEvents(sessionId, [event]);
      manager.addEvents(sessionId, [event]); // Duplicate

      const session = manager.getSession(sessionId);
      expect(session?.events).toHaveLength(1);
    });

    it('returns false for non-existent session', () => {
      const result = manager.addEvents('non_existent', []);
      expect(result).toBe(false);
    });
  });

  describe('addEventsToActiveSession', () => {
    it('adds events to the active session', () => {
      manager.createSession({ startUrl: 'https://example.com' });

      const event: RecordedEvent = {
        id: 'evt_1',
        type: 'click',
        timestamp: Date.now(),
        selector: '#button',
        alternativeSelectors: [],
        tagName: 'button',
        pageUrl: 'https://example.com',
      };

      const result = manager.addEventsToActiveSession([event]);
      expect(result).toBe(true);
    });

    it('returns false when no active session', () => {
      const result = manager.addEventsToActiveSession([]);
      expect(result).toBe(false);
    });
  });

  describe('endSession', () => {
    it('sets end time on session', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
      });

      const result = manager.endSession(sessionId);
      expect(result).toBe(true);

      const session = manager.getSession(sessionId);
      expect(session?.endTime).not.toBeNull();
    });

    it('clears active session when ending it', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
      });

      manager.endSession(sessionId);
      expect(manager.getActiveSessionId()).toBeNull();
    });
  });

  describe('getSessionStats', () => {
    it('returns statistics for a session', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
      });

      const events: RecordedEvent[] = [
        {
          id: 'evt_1',
          type: 'click',
          timestamp: Date.now(),
          selector: '#button',
          alternativeSelectors: [],
          tagName: 'button',
          pageUrl: 'https://example.com',
        },
        {
          id: 'evt_2',
          type: 'input',
          timestamp: Date.now(),
          selector: '#input',
          alternativeSelectors: [],
          tagName: 'input',
          pageUrl: 'https://example.com/form',
        },
        {
          id: 'evt_3',
          type: 'click',
          timestamp: Date.now(),
          selector: '#submit',
          alternativeSelectors: [],
          tagName: 'button',
          pageUrl: 'https://example.com/form',
        },
      ];

      manager.addEvents(sessionId, events);

      const stats = manager.getSessionStats(sessionId);
      expect(stats).toBeDefined();
      expect(stats?.eventCount).toBe(3);
      expect(stats?.eventTypes['click']).toBe(2);
      expect(stats?.eventTypes['input']).toBe(1);
      expect(stats?.uniquePages).toHaveLength(2);
    });
  });

  describe('exportSession', () => {
    it('exports session to JSON file', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
        name: 'Test session',
      });

      const outputPath = manager.exportSession(sessionId, {
        outputPath: '/tmp/recording.json',
      });

      expect(outputPath).toBe('/tmp/recording.json');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('throws error for non-existent session', () => {
      expect(() => {
        manager.exportSession('non_existent', {
          outputPath: '/tmp/recording.json',
        });
      }).toThrow('Session not found');
    });
  });

  describe('getAllSessions', () => {
    it('returns all sessions', () => {
      manager.createSession({ startUrl: 'https://example1.com' });
      manager.createSession({ startUrl: 'https://example2.com' });

      const sessions = manager.getAllSessions();
      expect(sessions).toHaveLength(2);
    });
  });

  describe('deleteSession', () => {
    it('removes a session', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
      });

      const result = manager.deleteSession(sessionId);
      expect(result).toBe(true);
      expect(manager.getSession(sessionId)).toBeUndefined();
    });

    it('clears active session if deleting it', () => {
      const sessionId = manager.createSession({
        startUrl: 'https://example.com',
      });

      manager.deleteSession(sessionId);
      expect(manager.getActiveSessionId()).toBeNull();
    });
  });
});

// ============================================================================
// EventListener Tests
// ============================================================================

describe('EventListener', () => {
  let listener: EventListener;

  beforeEach(() => {
    listener = new EventListener();
  });

  describe('constructor', () => {
    it('creates with default config', () => {
      const config = listener.getConfig();
      expect(config.captureEvents).toBeDefined();
      expect(config.bufferSize).toBe(10);
    });

    it('merges custom config', () => {
      const customListener = new EventListener({
        captureHover: true,
        bufferSize: 20,
      });

      const config = customListener.getConfig();
      expect(config.captureHover).toBe(true);
      expect(config.bufferSize).toBe(20);
    });
  });

  describe('getRecordingScript', () => {
    it('returns a valid JavaScript string', () => {
      const script = listener.getRecordingScript('ws://localhost:9876');
      expect(typeof script).toBe('string');
      expect(script).toContain('WebSocket');
      expect(script).toContain('ws://localhost:9876');
    });
  });

  describe('event management', () => {
    it('adds and retrieves events', () => {
      const events: RecordedEvent[] = [
        {
          id: 'evt_1',
          type: 'click',
          timestamp: Date.now(),
          selector: '#button',
          alternativeSelectors: [],
          tagName: 'button',
          pageUrl: 'https://example.com',
        },
      ];

      listener.addEvents(events);
      expect(listener.getEvents()).toHaveLength(1);
    });

    it('clears events', () => {
      listener.addEvents([{
        id: 'evt_1',
        type: 'click',
        timestamp: Date.now(),
        selector: '#button',
        alternativeSelectors: [],
        tagName: 'button',
        pageUrl: 'https://example.com',
      }]);

      listener.clearEvents();
      expect(listener.getEvents()).toHaveLength(0);
    });
  });

  describe('config management', () => {
    it('updates config', () => {
      listener.updateConfig({ captureHover: true });
      expect(listener.getConfig().captureHover).toBe(true);
    });
  });
});

// ============================================================================
// Script Generation Tests
// ============================================================================

describe('Script Generation', () => {
  describe('createRecordingScript', () => {
    it('includes WebSocket connection logic', () => {
      const script = createRecordingScript('ws://localhost:9876');
      expect(script).toContain('new WebSocket');
      expect(script).toContain('ws://localhost:9876');
    });

    it('includes event listeners', () => {
      const script = createRecordingScript('ws://localhost:9876');
      expect(script).toContain('addEventListener');
      expect(script).toContain('click');
      expect(script).toContain('input');
      expect(script).toContain('submit');
    });

    it('includes selector generator', () => {
      const script = createRecordingScript('ws://localhost:9876');
      expect(script).toContain('SelectorGenerator');
      expect(script).toContain('data-testid');
    });

    it('respects config options', () => {
      const script = createRecordingScript('ws://localhost:9876', {
        captureHover: true,
        captureScroll: true,
      });
      expect(script).toContain('captureHover');
      expect(script).toContain('captureScroll');
    });
  });

  describe('createSelectorGeneratorScript', () => {
    it('returns valid JavaScript', () => {
      const script = createSelectorGeneratorScript();
      expect(typeof script).toBe('string');
      expect(script).toContain('SelectorGenerator');
    });

    it('includes all selector strategies', () => {
      const script = createSelectorGeneratorScript();
      expect(script).toContain('data-testid');
      expect(script).toContain('aria-label');
      expect(script).toContain('nth-of-type');
    });
  });
});

// ============================================================================
// RecordingServer Tests
// ============================================================================

describe('RecordingServer', () => {
  let server: RecordingServer;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('start and stop', () => {
    it('starts and stops without error', async () => {
      server = new RecordingServer({ port: 9999 });
      await server.start();

      expect(server.getUrl()).toBe('ws://localhost:9999');
      expect(server.getClientCount()).toBe(0);

      await server.stop();
    });
  });

  describe('getStatus', () => {
    it('returns initial status', async () => {
      server = new RecordingServer({ port: 9998 });
      await server.start();

      const status = server.getStatus();
      expect(status.connected).toBe(false);
      expect(status.sessionId).toBeNull();
      expect(status.eventCount).toBe(0);
    });
  });

  describe('event handlers', () => {
    it('calls onConnect when client connects', async () => {
      const onConnect = vi.fn();
      server = new RecordingServer({ port: 9997 }, { onConnect });
      await server.start();

      // Connect a client
      const client = new WebSocket('ws://localhost:9997');
      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      // Wait for connection to be processed
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onConnect).toHaveBeenCalled();
      expect(server.getClientCount()).toBe(1);

      client.close();
    });

    it('calls onEvents when events are received', async () => {
      const onEvents = vi.fn();
      server = new RecordingServer({ port: 9996 }, { onEvents });
      await server.start();

      const client = new WebSocket('ws://localhost:9996');
      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      // Send events
      const events: RecordedEvent[] = [{
        id: 'evt_1',
        type: 'click',
        timestamp: Date.now(),
        selector: '#button',
        alternativeSelectors: [],
        tagName: 'button',
        pageUrl: 'https://example.com',
      }];

      client.send(JSON.stringify({
        type: 'events',
        payload: events,
        timestamp: Date.now(),
      }));

      // Wait for message to be processed
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onEvents).toHaveBeenCalled();
      expect(server.getStatus().eventCount).toBe(1);

      client.close();
    });

    it('calls onDisconnect when client disconnects', async () => {
      const onDisconnect = vi.fn();
      server = new RecordingServer({ port: 9995 }, { onDisconnect });
      await server.start();

      const client = new WebSocket('ws://localhost:9995');
      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      client.close();

      // Wait for disconnect to be processed
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onDisconnect).toHaveBeenCalled();
      expect(server.getClientCount()).toBe(0);
    });
  });

  describe('broadcastConfig', () => {
    it('sends config to connected clients', async () => {
      server = new RecordingServer({ port: 9994 });
      await server.start();

      const client = new WebSocket('ws://localhost:9994');
      const receivedMessages: unknown[] = [];

      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      server.broadcastConfig({ captureHover: true });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const configMessage = receivedMessages.find(
        (m: unknown) => (m as { type: string }).type === 'config'
      );
      expect(configMessage).toBeDefined();

      client.close();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Recording Integration', () => {
  it('full recording workflow', async () => {
    const manager = new SessionManager();
    const events: RecordedEvent[] = [];

    // Create server with event handler
    const server = new RecordingServer({ port: 9993 }, {
      onEvents: (evts) => events.push(...evts),
    });
    await server.start();

    // Create session
    const sessionId = manager.createSession({
      startUrl: 'https://example.com',
      name: 'Integration test',
    });

    // Simulate events coming from browser
    const testEvents: RecordedEvent[] = [
      {
        id: 'evt_1',
        type: 'click',
        timestamp: Date.now(),
        selector: '#login-button',
        alternativeSelectors: [
          { value: '[data-testid="login"]', strategy: 'data-testid', confidence: 1.0 },
        ],
        tagName: 'button',
        text: 'Login',
        pageUrl: 'https://example.com',
      },
      {
        id: 'evt_2',
        type: 'input',
        timestamp: Date.now() + 100,
        selector: '#username',
        alternativeSelectors: [],
        tagName: 'input',
        value: 'testuser',
        pageUrl: 'https://example.com/login',
      },
    ];

    // Add events to manager
    manager.addEvents(sessionId, testEvents);

    // End session
    manager.endSession(sessionId);

    // Verify session
    const session = manager.getSession(sessionId);
    expect(session?.events).toHaveLength(2);
    expect(session?.endTime).not.toBeNull();

    // Get stats
    const stats = manager.getSessionStats(sessionId);
    expect(stats?.eventCount).toBe(2);
    expect(stats?.eventTypes['click']).toBe(1);
    expect(stats?.eventTypes['input']).toBe(1);
    expect(stats?.uniquePages).toContain('https://example.com');
    expect(stats?.uniquePages).toContain('https://example.com/login');

    await server.stop();
  });
});
