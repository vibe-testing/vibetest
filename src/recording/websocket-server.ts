/**
 * VibeTesting CLI - WebSocket Server
 *
 * WebSocket server for real-time communication between browser and CLI.
 * Handles event streaming, heartbeat, and session management.
 *
 * @license MIT
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type {
  RecordedEvent,
  RecordingMessage,
  RecordingStatus,
  RecordingConfig,
} from './types.js';

/**
 * Options for the recording WebSocket server.
 */
export interface RecordingServerOptions {
  /** Port to listen on (default: 9876) */
  port?: number;
  /** HTTP server to attach to (alternative to port) */
  server?: Server;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Connection timeout in ms (default: 60000) */
  connectionTimeout?: number;
}

/**
 * Event handler types for the recording server.
 */
export interface RecordingServerEvents {
  /** Called when events are received from the browser */
  onEvents?: (events: RecordedEvent[], sessionId: string) => void;
  /** Called when a new session starts */
  onSessionStart?: (sessionId: string) => void;
  /** Called when a session stops */
  onSessionStop?: (sessionId: string) => void;
  /** Called when a client connects */
  onConnect?: (clientId: string) => void;
  /** Called when a client disconnects */
  onDisconnect?: (clientId: string) => void;
  /** Called on error */
  onError?: (error: Error, clientId?: string) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RecordingServerOptions, 'server'>> = {
  port: 9876,
  heartbeatInterval: 30000,
  connectionTimeout: 60000,
};

const MAX_ERRORS = 100;

/**
 * RecordingServer manages WebSocket connections for browser recording.
 *
 * @example
 * ```typescript
 * const server = new RecordingServer({
 *   port: 9876,
 *   onEvents: (events) => console.log('Received', events.length, 'events'),
 * });
 *
 * await server.start();
 * console.log('Server URL:', server.getUrl());
 *
 * // When done
 * await server.stop();
 * ```
 */
export class RecordingServer {
  private wss: WebSocketServer | null = null;
  private options: Required<Omit<RecordingServerOptions, 'server'>> & { server?: Server };
  private events: RecordingServerEvents;
  private clients: Map<string, WebSocket> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private sessionId: string | null = null;
  private eventCount: number = 0;
  private lastEventTime: number | null = null;
  private errors: string[] = [];

  constructor(options: RecordingServerOptions = {}, events: RecordingServerEvents = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.events = events;
  }

  /**
   * Adds an error message to the error log with size limiting.
   */
  private addError(message: string): void {
    if (this.errors.length >= MAX_ERRORS) {
      this.errors.shift(); // Remove oldest error
    }
    this.errors.push(message);
  }

  /**
   * Starts the WebSocket server.
   *
   * @returns Promise that resolves when the server is ready
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.options.server) {
          this.wss = new WebSocketServer({ server: this.options.server });
        } else {
          this.wss = new WebSocketServer({ port: this.options.port });
        }

        this.wss.on('connection', this.handleConnection.bind(this));

        this.wss.on('error', (error) => {
          this.addError(error.message);
          this.events.onError?.(error);
          reject(error);
        });

        this.wss.on('listening', () => {
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stops the WebSocket server.
   *
   * @returns Promise that resolves when the server is stopped
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Clear all heartbeat timers
      for (const timer of this.heartbeatTimers.values()) {
        clearInterval(timer);
      }
      this.heartbeatTimers.clear();

      // Close all client connections
      for (const [clientId, ws] of this.clients) {
        try {
          ws.close(1000, 'Server shutting down');
        } catch {
          // Ignore close errors
        }
        this.events.onDisconnect?.(clientId);
      }
      this.clients.clear();

      // Close server
      if (this.wss) {
        this.wss.close(() => {
          this.wss = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Gets the WebSocket URL for clients to connect to.
   *
   * @returns WebSocket URL string
   */
  getUrl(): string {
    return `ws://localhost:${this.options.port}`;
  }

  /**
   * Gets the current recording status.
   *
   * @returns RecordingStatus object
   */
  getStatus(): RecordingStatus {
    return {
      connected: this.clients.size > 0,
      sessionId: this.sessionId,
      eventCount: this.eventCount,
      lastEventTime: this.lastEventTime,
      errors: [...this.errors],
    };
  }

  /**
   * Sends a configuration update to all connected clients.
   *
   * @param config - New configuration
   */
  broadcastConfig(config: RecordingConfig): void {
    const message: RecordingMessage = {
      type: 'config',
      payload: config,
      timestamp: Date.now(),
    };
    this.broadcast(message);
  }

  /**
   * Sends a stop signal to all connected clients.
   */
  broadcastStop(): void {
    const message: RecordingMessage = {
      type: 'stop',
      timestamp: Date.now(),
    };
    this.broadcast(message);
  }

  /**
   * Gets the number of connected clients.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Handles a new WebSocket connection.
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = this.generateClientId();
    this.clients.set(clientId, ws);
    this.events.onConnect?.(clientId);

    // Set up heartbeat
    this.setupHeartbeat(clientId, ws);

    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as RecordingMessage;
        this.handleMessage(message, clientId);
      } catch (error) {
        this.addError(`Failed to parse message: ${error}`);
        this.events.onError?.(error as Error, clientId);
      }
    });

    // Handle close
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      this.addError(error.message);
      this.events.onError?.(error, clientId);
    });

    // Send acknowledgment
    this.send(ws, { type: 'ack', timestamp: Date.now() });
  }

  /**
   * Handles incoming messages from clients.
   */
  private handleMessage(message: RecordingMessage, clientId: string): void {
    switch (message.type) {
      case 'start':
        this.sessionId = message.sessionId || this.generateSessionId();
        this.events.onSessionStart?.(this.sessionId);
        break;

      case 'stop':
        if (this.sessionId) {
          this.events.onSessionStop?.(this.sessionId);
          this.sessionId = null;
        }
        break;

      case 'event':
        if (message.payload && !Array.isArray(message.payload)) {
          const event = message.payload as RecordedEvent;
          this.eventCount++;
          this.lastEventTime = event.timestamp;
          this.events.onEvents?.([event], this.sessionId || 'unknown');
        }
        break;

      case 'events':
        if (message.payload && Array.isArray(message.payload)) {
          const events = message.payload as RecordedEvent[];
          this.eventCount += events.length;
          if (events.length > 0) {
            this.lastEventTime = events[events.length - 1]!.timestamp;
          }
          this.events.onEvents?.(events, this.sessionId || 'unknown');
        }
        break;

      case 'heartbeat': {
        // Reset connection timeout
        const client = this.clients.get(clientId);
        if (client) {
          this.setupHeartbeat(clientId, client);
        }
        break;
      }

      default:
        // Unknown message type - log but don't error
        break;
    }

    // Send acknowledgment for data messages
    if (['event', 'events'].includes(message.type)) {
      const ws = this.clients.get(clientId);
      if (ws) {
        const ackMessage: RecordingMessage = {
          type: 'ack',
          timestamp: Date.now(),
        };
        if (this.sessionId) ackMessage.sessionId = this.sessionId;
        this.send(ws, ackMessage);
      }
    }
  }

  /**
   * Handles client disconnection.
   */
  private handleDisconnect(clientId: string): void {
    // Clear heartbeat timer
    const timer = this.heartbeatTimers.get(clientId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(clientId);
    }

    // Remove client
    this.clients.delete(clientId);
    this.events.onDisconnect?.(clientId);
  }

  /**
   * Sets up heartbeat for a client connection.
   */
  private setupHeartbeat(clientId: string, ws: WebSocket): void {
    // Clear existing timer
    const existingTimer = this.heartbeatTimers.get(clientId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Create new heartbeat timer
    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, { type: 'heartbeat', timestamp: Date.now() });
      } else {
        this.handleDisconnect(clientId);
      }
    }, this.options.heartbeatInterval);

    this.heartbeatTimers.set(clientId, timer);
  }

  /**
   * Sends a message to a specific client.
   */
  private send(ws: WebSocket, message: RecordingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcasts a message to all connected clients.
   */
  private broadcast(message: RecordingMessage): void {
    for (const ws of this.clients.values()) {
      this.send(ws, message);
    }
  }

  /**
   * Generates a unique client ID.
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generates a unique session ID.
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
