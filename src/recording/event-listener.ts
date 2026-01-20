/**
 * VibeTesting CLI - Browser Event Listener
 *
 * Captures user interactions in the browser and sends them to the CLI.
 * This module provides both a class for Node.js usage and an injectable script.
 *
 * @license MIT
 */

import type {
  RecordedEvent,
  RecordingConfig,
} from './types.js';
import { createSelectorGeneratorScript } from './selector-generator.js';

/**
 * Default recording configuration.
 */
const DEFAULT_CONFIG: Required<RecordingConfig> = {
  captureEvents: [
    'click',
    'dblclick',
    'input',
    'change',
    'select',
    'check',
    'uncheck',
    'submit',
    'focus',
    'blur',
  ],
  captureHover: false,
  captureScroll: false,
  scrollDebounce: 150,
  captureKeyboard: false,
  selectorStrategies: ['data-testid', 'id', 'aria-label', 'placeholder', 'css'],
  ignoreSelectors: [],
  bufferSize: 10,
  bufferTimeout: 1000,
};

/**
 * Creates the injectable recording script that captures browser events.
 * This script is injected into pages to record user interactions.
 *
 * @param wsUrl - WebSocket URL to send events to
 * @param config - Recording configuration
 * @returns JavaScript code to inject into the page
 */
export function createRecordingScript(
  wsUrl: string,
  config: RecordingConfig = {}
): string {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const selectorScript = createSelectorGeneratorScript();

  return `
${selectorScript}

(function() {
  if (window.__vibetest_recorder) return;

  const config = ${JSON.stringify(mergedConfig)};
  const wsUrl = ${JSON.stringify(wsUrl)};

  let ws = null;
  let eventBuffer = [];
  let bufferTimer = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;
  let scrollTimer = null;
  let lastScrollTime = 0;

  // Generate unique event IDs
  function generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  // Connect to WebSocket server
  function connect() {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = function() {
        console.log('[VibeTesting] Connected to recording server');
        reconnectAttempts = 0;
        flushBuffer();

        // Send start message
        sendMessage({ type: 'start', timestamp: Date.now() });
      };

      ws.onclose = function() {
        console.log('[VibeTesting] Disconnected from recording server');
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connect, reconnectDelay * reconnectAttempts);
        }
      };

      ws.onerror = function(error) {
        console.error('[VibeTesting] WebSocket error:', error);
      };

      ws.onmessage = function(event) {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'config') {
            Object.assign(config, message.payload);
          }
        } catch (e) {
          console.error('[VibeTesting] Failed to parse message:', e);
        }
      };
    } catch (error) {
      console.error('[VibeTesting] Failed to connect:', error);
    }
  }

  // Send message through WebSocket
  function sendMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Buffer and send events
  function bufferEvent(event) {
    eventBuffer.push(event);

    if (eventBuffer.length >= config.bufferSize) {
      flushBuffer();
    } else if (!bufferTimer) {
      bufferTimer = setTimeout(flushBuffer, config.bufferTimeout);
    }
  }

  function flushBuffer() {
    if (bufferTimer) {
      clearTimeout(bufferTimer);
      bufferTimer = null;
    }

    if (eventBuffer.length > 0) {
      sendMessage({
        type: 'events',
        payload: eventBuffer,
        timestamp: Date.now()
      });
      eventBuffer = [];
    }
  }

  // Get selector generator
  function getSelector(element) {
    const generator = window.__vibetest_selector_generator;
    if (!generator) return { primary: '', alternatives: [] };

    const selectors = generator.generateSelectors(element);
    return {
      primary: selectors[0]?.value || '',
      alternatives: selectors
    };
  }

  // Check if element matches ignore patterns
  function shouldIgnore(element) {
    const selector = element.tagName.toLowerCase();
    for (const pattern of config.ignoreSelectors) {
      try {
        if (new RegExp(pattern).test(selector)) return true;
        if (element.matches && element.matches(pattern)) return true;
      } catch {}
    }
    return false;
  }

  // Extract element attributes
  function getAttributes(element) {
    const attrs = {};
    const important = ['name', 'type', 'role', 'href', 'src', 'value', 'checked', 'disabled'];
    for (const attr of important) {
      const value = element.getAttribute(attr);
      if (value !== null) attrs[attr] = value;
    }
    return Object.keys(attrs).length > 0 ? attrs : undefined;
  }

  // Create recorded event from DOM event
  function createRecordedEvent(domEvent, actionType) {
    const element = domEvent.target;
    if (!element || !(element instanceof Element)) return null;
    if (shouldIgnore(element)) return null;

    const { primary, alternatives } = getSelector(element);
    if (!primary) return null;

    const event = {
      id: generateEventId(),
      type: actionType,
      timestamp: Date.now(),
      selector: primary,
      alternativeSelectors: alternatives,
      tagName: element.tagName.toLowerCase(),
      pageUrl: window.location.href,
      pageTitle: document.title
    };

    // Add value for input events
    if (['input', 'change', 'select'].includes(actionType)) {
      if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox' || element.type === 'radio') {
          event.value = element.checked ? 'true' : 'false';
        } else if (element.type !== 'password') {
          event.value = element.value;
        }
      } else if (element instanceof HTMLSelectElement) {
        event.value = element.value;
      } else if (element instanceof HTMLTextAreaElement) {
        event.value = element.value;
      }
    }

    // Add text content
    const text = element.textContent?.trim();
    if (text && text.length <= 100) {
      event.text = text;
    }

    // Add coordinates for click events
    if (['click', 'dblclick'].includes(actionType)) {
      event.coordinates = {
        x: domEvent.pageX,
        y: domEvent.pageY,
        clientX: domEvent.clientX,
        clientY: domEvent.clientY
      };
    }

    // Add key info for keyboard events
    if (['keydown', 'keyup'].includes(actionType)) {
      event.key = domEvent.key;
      event.keyCode = domEvent.keyCode;
    }

    // Add attributes
    event.attributes = getAttributes(element);

    return event;
  }

  // Event handlers
  function handleClick(e) {
    if (!config.captureEvents.includes('click')) return;
    const event = createRecordedEvent(e, 'click');
    if (event) bufferEvent(event);
  }

  function handleDblClick(e) {
    if (!config.captureEvents.includes('dblclick')) return;
    const event = createRecordedEvent(e, 'dblclick');
    if (event) bufferEvent(event);
  }

  function handleInput(e) {
    if (!config.captureEvents.includes('input')) return;
    const event = createRecordedEvent(e, 'input');
    if (event) bufferEvent(event);
  }

  function handleChange(e) {
    if (!config.captureEvents.includes('change')) return;

    const element = e.target;
    let actionType = 'change';

    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') {
        actionType = element.checked ? 'check' : 'uncheck';
      } else if (element.type === 'radio') {
        actionType = 'check';
      }
    } else if (element instanceof HTMLSelectElement) {
      actionType = 'select';
    }

    const event = createRecordedEvent(e, actionType);
    if (event) bufferEvent(event);
  }

  function handleSubmit(e) {
    if (!config.captureEvents.includes('submit')) return;
    const event = createRecordedEvent(e, 'submit');
    if (event) bufferEvent(event);
  }

  function handleFocus(e) {
    if (!config.captureEvents.includes('focus')) return;
    const event = createRecordedEvent(e, 'focus');
    if (event) bufferEvent(event);
  }

  function handleBlur(e) {
    if (!config.captureEvents.includes('blur')) return;
    const event = createRecordedEvent(e, 'blur');
    if (event) bufferEvent(event);
  }

  function handleKeyDown(e) {
    if (!config.captureKeyboard) return;
    // Only capture special keys, not regular typing
    if (['Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const event = createRecordedEvent(e, 'keydown');
      if (event) bufferEvent(event);
    }
  }

  function handleScroll() {
    if (!config.captureScroll) return;

    const now = Date.now();
    if (now - lastScrollTime < config.scrollDebounce) return;
    lastScrollTime = now;

    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      const event = {
        id: generateEventId(),
        type: 'scroll',
        timestamp: Date.now(),
        selector: 'window',
        alternativeSelectors: [],
        tagName: 'window',
        pageUrl: window.location.href,
        pageTitle: document.title,
        scrollPosition: {
          scrollX: window.scrollX,
          scrollY: window.scrollY
        }
      };
      bufferEvent(event);
    }, config.scrollDebounce);
  }

  function handleMouseOver(e) {
    if (!config.captureHover) return;
    const event = createRecordedEvent(e, 'hover');
    if (event) bufferEvent(event);
  }

  // Set up event listeners
  document.addEventListener('click', handleClick, true);
  document.addEventListener('dblclick', handleDblClick, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('submit', handleSubmit, true);
  document.addEventListener('focusin', handleFocus, true);
  document.addEventListener('focusout', handleBlur, true);
  document.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('scroll', handleScroll, { passive: true });
  if (config.captureHover) {
    document.addEventListener('mouseover', handleMouseOver, true);
  }

  // Handle page navigation
  window.addEventListener('beforeunload', function() {
    flushBuffer();
    sendMessage({ type: 'stop', timestamp: Date.now() });
  });

  // Handle SPA navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function() {
    const result = originalPushState.apply(this, arguments);
    bufferEvent({
      id: generateEventId(),
      type: 'navigation',
      timestamp: Date.now(),
      selector: 'history.pushState',
      alternativeSelectors: [],
      tagName: 'navigation',
      pageUrl: window.location.href,
      pageTitle: document.title
    });
    return result;
  };

  history.replaceState = function() {
    const result = originalReplaceState.apply(this, arguments);
    bufferEvent({
      id: generateEventId(),
      type: 'navigation',
      timestamp: Date.now(),
      selector: 'history.replaceState',
      alternativeSelectors: [],
      tagName: 'navigation',
      pageUrl: window.location.href,
      pageTitle: document.title
    });
    return result;
  };

  window.addEventListener('popstate', function() {
    bufferEvent({
      id: generateEventId(),
      type: 'navigation',
      timestamp: Date.now(),
      selector: 'popstate',
      alternativeSelectors: [],
      tagName: 'navigation',
      pageUrl: window.location.href,
      pageTitle: document.title
    });
  });

  // Store recorder reference
  window.__vibetest_recorder = {
    flush: flushBuffer,
    stop: function() {
      flushBuffer();
      sendMessage({ type: 'stop', timestamp: Date.now() });
      if (ws) ws.close();
    },
    getEventCount: function() {
      return eventBuffer.length;
    }
  };

  // Connect to server
  connect();

  console.log('[VibeTesting] Recording initialized');
})();
`;
}

/**
 * EventListener class for managing recording in a Playwright context.
 * This provides a higher-level API for the CLI to control recording.
 */
export class EventListener {
  private config: Required<RecordingConfig>;
  private events: RecordedEvent[] = [];

  constructor(config: RecordingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Gets the injectable script for recording.
   *
   * @param wsUrl - WebSocket URL to send events to
   * @returns JavaScript code to inject
   */
  getRecordingScript(wsUrl: string): string {
    return createRecordingScript(wsUrl, this.config);
  }

  /**
   * Adds recorded events to the internal buffer.
   *
   * @param events - Events to add
   */
  addEvents(events: RecordedEvent[]): void {
    this.events.push(...events);
  }

  /**
   * Gets all recorded events.
   *
   * @returns Array of recorded events
   */
  getEvents(): RecordedEvent[] {
    return [...this.events];
  }

  /**
   * Clears all recorded events.
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Gets the current recording configuration.
   */
  getConfig(): Required<RecordingConfig> {
    return { ...this.config };
  }

  /**
   * Updates the recording configuration.
   *
   * @param config - New configuration values
   */
  updateConfig(config: Partial<RecordingConfig>): void {
    Object.assign(this.config, config);
  }
}
