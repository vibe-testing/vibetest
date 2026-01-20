/**
 * VibeTesting CLI - Recording Types
 *
 * Type definitions for browser event recording.
 *
 * @license MIT
 */

/**
 * Types of user actions that can be recorded.
 */
export type RecordedActionType =
  | 'click'
  | 'dblclick'
  | 'input'
  | 'change'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'submit'
  | 'focus'
  | 'blur'
  | 'keydown'
  | 'keyup'
  | 'scroll'
  | 'navigation'
  | 'hover';

/**
 * Selector strategies ranked by stability.
 */
export type SelectorStrategy =
  | 'data-testid'
  | 'id'
  | 'aria-label'
  | 'placeholder'
  | 'text'
  | 'css'
  | 'xpath';

/**
 * A generated selector with its strategy and confidence.
 */
export interface GeneratedSelector {
  value: string;
  strategy: SelectorStrategy;
  confidence: number; // 0-1, higher = more stable
}

/**
 * A recorded user interaction event.
 */
export interface RecordedEvent {
  /** Unique event identifier */
  id: string;

  /** Type of action performed */
  type: RecordedActionType;

  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Primary selector for the target element */
  selector: string;

  /** Alternative selectors ranked by stability */
  alternativeSelectors: GeneratedSelector[];

  /** Tag name of the target element */
  tagName: string;

  /** Value associated with the action (input value, selected option, etc.) */
  value?: string;

  /** Text content of the element */
  text?: string;

  /** Key pressed (for keyboard events) */
  key?: string;

  /** Key code (for keyboard events) */
  keyCode?: number;

  /** URL of the page where the event occurred */
  pageUrl: string;

  /** Title of the page */
  pageTitle?: string;

  /** Coordinates where the event occurred */
  coordinates?: {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  };

  /** Scroll position (for scroll events) */
  scrollPosition?: {
    scrollX: number;
    scrollY: number;
  };

  /** Additional element attributes */
  attributes?: Record<string, string>;

  /** Whether the element is inside a frame */
  frameIndex?: number;
}

/**
 * A recording session containing multiple events.
 */
export interface RecordingSession {
  /** Unique session identifier */
  id: string;

  /** Human-readable session name */
  name?: string;

  /** Starting URL of the recording */
  startUrl: string;

  /** All recorded events in chronological order */
  events: RecordedEvent[];

  /** When the recording started */
  startTime: number;

  /** When the recording ended (null if still recording) */
  endTime: number | null;

  /** Browser and environment information */
  metadata: RecordingMetadata;
}

/**
 * Metadata about the recording environment.
 */
export interface RecordingMetadata {
  /** Browser name and version */
  browser?: string;

  /** User agent string */
  userAgent?: string;

  /** Viewport dimensions */
  viewport?: {
    width: number;
    height: number;
  };

  /** CLI version */
  cliVersion: string;

  /** Recording format version */
  formatVersion: string;
}

/**
 * A complete recording with multiple flows.
 */
export interface Recording {
  /** Unique recording identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this recording captures */
  description?: string;

  /** All recorded sessions/flows */
  sessions: RecordingSession[];

  /** Tags for categorization */
  tags?: string[];

  /** When the recording was created */
  createdAt: number;

  /** When the recording was last modified */
  updatedAt: number;
}

/**
 * Configuration for the recording system.
 */
export interface RecordingConfig {
  /** Events to capture (default: all) */
  captureEvents?: RecordedActionType[];

  /** Whether to capture hover events (can be noisy) */
  captureHover?: boolean;

  /** Whether to capture scroll events */
  captureScroll?: boolean;

  /** Minimum time between scroll events (debounce) in ms */
  scrollDebounce?: number;

  /** Whether to capture keyboard events */
  captureKeyboard?: boolean;

  /** Selector strategies to use, in priority order */
  selectorStrategies?: SelectorStrategy[];

  /** Custom selectors to ignore (regex patterns) */
  ignoreSelectors?: string[];

  /** Maximum events to buffer before sending */
  bufferSize?: number;

  /** Maximum time to buffer events before sending (ms) */
  bufferTimeout?: number;
}

/**
 * WebSocket message types for recording communication.
 */
export type RecordingMessageType =
  | 'event'
  | 'events'
  | 'heartbeat'
  | 'start'
  | 'stop'
  | 'config'
  | 'error'
  | 'ack';

/**
 * A WebSocket message for recording.
 */
export interface RecordingMessage {
  type: RecordingMessageType;
  payload?: RecordedEvent | RecordedEvent[] | RecordingConfig | string;
  timestamp: number;
  sessionId?: string;
}

/**
 * Status of the recording connection.
 */
export interface RecordingStatus {
  connected: boolean;
  sessionId: string | null;
  eventCount: number;
  lastEventTime: number | null;
  errors: string[];
}
