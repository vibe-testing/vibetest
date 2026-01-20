/**
 * VibeTesting CLI - Recording Module
 *
 * Browser event recording and session management.
 *
 * @license MIT
 */

// Types
export type {
  RecordedActionType,
  SelectorStrategy,
  GeneratedSelector,
  RecordedEvent,
  RecordingSession,
  RecordingMetadata,
  Recording,
  RecordingConfig,
  RecordingMessageType,
  RecordingMessage,
  RecordingStatus,
} from './types.js';

// Selector generation
export {
  SelectorGenerator,
  createSelectorGeneratorScript,
} from './selector-generator.js';
export type { SelectorGeneratorConfig } from './selector-generator.js';

// Event listener
export { EventListener, createRecordingScript } from './event-listener.js';

// WebSocket server
export { RecordingServer } from './websocket-server.js';
export type {
  RecordingServerOptions,
  RecordingServerEvents,
} from './websocket-server.js';

// Session management
export { SessionManager } from './session-manager.js';
export type { SessionOptions, ExportOptions } from './session-manager.js';
