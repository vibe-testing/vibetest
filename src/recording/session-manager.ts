/**
 * VibeTesting CLI - Recording Session Manager
 *
 * Manages recording sessions, collects events, and exports recorded flows.
 *
 * @license MIT
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  RecordedEvent,
  RecordingSession,
  Recording,
} from './types.js';

/**
 * Options for creating a new recording session.
 */
export interface SessionOptions {
  /** Human-readable session name */
  name?: string;
  /** Starting URL */
  startUrl: string;
  /** Browser information */
  browser?: string;
  /** User agent string */
  userAgent?: string;
  /** Viewport dimensions */
  viewport?: { width: number; height: number };
}

/**
 * Options for exporting a recording.
 */
export interface ExportOptions {
  /** Output file path */
  outputPath: string;
  /** Pretty print JSON (default: true) */
  prettyPrint?: boolean;
  /** Include metadata (default: true) */
  includeMetadata?: boolean;
}

const CLI_VERSION = '0.1.0';
const FORMAT_VERSION = '1.0.0';

/**
 * SessionManager handles recording sessions and event collection.
 *
 * @example
 * ```typescript
 * const manager = new SessionManager();
 *
 * // Start a new session
 * const sessionId = manager.createSession({
 *   startUrl: 'https://example.com',
 *   name: 'Login flow'
 * });
 *
 * // Add events as they come in
 * manager.addEvents(sessionId, events);
 *
 * // End the session
 * manager.endSession(sessionId);
 *
 * // Export the recording
 * manager.exportSession(sessionId, { outputPath: './recording.json' });
 * ```
 */
export class SessionManager {
  private sessions: Map<string, RecordingSession> = new Map();
  private activeSessionId: string | null = null;

  /**
   * Creates a new recording session.
   *
   * @param options - Session creation options
   * @returns The new session ID
   */
  createSession(options: SessionOptions): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const metadata: RecordingSession['metadata'] = {
      cliVersion: CLI_VERSION,
      formatVersion: FORMAT_VERSION,
    };
    if (options.browser) metadata.browser = options.browser;
    if (options.userAgent) metadata.userAgent = options.userAgent;
    if (options.viewport) metadata.viewport = options.viewport;

    const session: RecordingSession = {
      id: sessionId,
      startUrl: options.startUrl,
      events: [],
      startTime: now,
      endTime: null,
      metadata,
    };
    if (options.name) session.name = options.name;

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;

    return sessionId;
  }

  /**
   * Gets the currently active session ID.
   *
   * @returns Active session ID or null
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  /**
   * Gets a session by ID.
   *
   * @param sessionId - The session ID
   * @returns The session or undefined
   */
  getSession(sessionId: string): RecordingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Gets all sessions.
   *
   * @returns Array of all sessions
   */
  getAllSessions(): RecordingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Adds events to a session.
   *
   * @param sessionId - The session ID
   * @param events - Events to add
   * @returns true if events were added successfully
   */
  addEvents(sessionId: string, events: RecordedEvent[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Filter out duplicate events by ID
    const existingIds = new Set(session.events.map((e) => e.id));
    const newEvents = events.filter((e) => !existingIds.has(e.id));

    session.events.push(...newEvents);

    // Sort events by timestamp
    session.events.sort((a, b) => a.timestamp - b.timestamp);

    return true;
  }

  /**
   * Adds events to the active session.
   *
   * @param events - Events to add
   * @returns true if events were added successfully
   */
  addEventsToActiveSession(events: RecordedEvent[]): boolean {
    if (!this.activeSessionId) return false;
    return this.addEvents(this.activeSessionId, events);
  }

  /**
   * Ends a session, setting its end time.
   *
   * @param sessionId - The session ID
   * @returns true if the session was ended successfully
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.endTime = Date.now();

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    return true;
  }

  /**
   * Deletes a session.
   *
   * @param sessionId - The session ID
   * @returns true if the session was deleted
   */
  deleteSession(sessionId: string): boolean {
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
    return this.sessions.delete(sessionId);
  }

  /**
   * Gets statistics for a session.
   *
   * @param sessionId - The session ID
   * @returns Session statistics or null
   */
  getSessionStats(sessionId: string): {
    eventCount: number;
    duration: number | null;
    eventTypes: Record<string, number>;
    uniquePages: string[];
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const eventTypes: Record<string, number> = {};
    const pages = new Set<string>();

    for (const event of session.events) {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      pages.add(event.pageUrl);
    }

    const duration = session.endTime
      ? session.endTime - session.startTime
      : null;

    return {
      eventCount: session.events.length,
      duration,
      eventTypes,
      uniquePages: Array.from(pages),
    };
  }

  /**
   * Exports a session to a JSON file.
   *
   * @param sessionId - The session ID
   * @param options - Export options
   * @returns The path to the exported file
   */
  exportSession(sessionId: string, options: ExportOptions): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const outputPath = path.resolve(options.outputPath);
    const outputDir = path.dirname(outputPath);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Prepare export data
    const exportData = options.includeMetadata !== false
      ? session
      : { ...session, metadata: undefined };

    // Write file
    const json = options.prettyPrint !== false
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    fs.writeFileSync(outputPath, json, 'utf-8');

    return outputPath;
  }

  /**
   * Exports multiple sessions as a single recording.
   *
   * @param name - Recording name
   * @param sessionIds - Session IDs to include
   * @param options - Export options
   * @returns The path to the exported file
   */
  exportRecording(
    name: string,
    sessionIds: string[],
    options: ExportOptions & { description?: string; tags?: string[] }
  ): string {
    const sessions = sessionIds
      .map((id) => this.sessions.get(id))
      .filter((s): s is RecordingSession => s !== undefined);

    if (sessions.length === 0) {
      throw new Error('No valid sessions found');
    }

    const now = Date.now();
    const recording: Recording = {
      id: this.generateRecordingId(),
      name,
      sessions,
      createdAt: now,
      updatedAt: now,
    };
    if (options.description) recording.description = options.description;
    if (options.tags) recording.tags = options.tags;

    const outputPath = path.resolve(options.outputPath);
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const json = options.prettyPrint !== false
      ? JSON.stringify(recording, null, 2)
      : JSON.stringify(recording);

    fs.writeFileSync(outputPath, json, 'utf-8');

    return outputPath;
  }

  /**
   * Imports a session from a JSON file.
   *
   * @param filePath - Path to the JSON file
   * @returns The imported session ID
   */
  importSession(filePath: string): string {
    const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
    const data = JSON.parse(content);

    // Handle both single session and recording formats
    if ('sessions' in data && Array.isArray(data.sessions)) {
      // Recording format - import all sessions
      const recording = data as Recording;
      const sessionIds: string[] = [];

      for (const session of recording.sessions) {
        const newId = this.generateSessionId();
        const importedSession: RecordingSession = {
          ...session,
          id: newId,
        };
        this.sessions.set(newId, importedSession);
        sessionIds.push(newId);
      }

      return sessionIds[0] || '';
    } else {
      // Single session format
      const session = data as RecordingSession;
      const newId = this.generateSessionId();
      const importedSession: RecordingSession = {
        ...session,
        id: newId,
      };
      this.sessions.set(newId, importedSession);
      return newId;
    }
  }

  /**
   * Clears all sessions.
   */
  clearAll(): void {
    this.sessions.clear();
    this.activeSessionId = null;
  }

  /**
   * Generates a unique session ID.
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generates a unique recording ID.
   */
  private generateRecordingId(): string {
    return `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
