/**
 * VibeTesting CLI - Graph Types
 *
 * Complete type definitions for the exploration graph.
 * No framework dependencies (NestJS, TypeORM, etc.) - pure TypeScript.
 *
 * @license MIT
 */

// =============================================================================
// NODE TYPES
// =============================================================================

export enum GraphNodeType {
  PAGE = 'PAGE',
  ELEMENT = 'ELEMENT',
  NETWORK_REQUEST = 'NETWORK_REQUEST',
  NETWORK_MESSAGE = 'NETWORK_MESSAGE',
  CUSTOM_EVENT = 'CUSTOM_EVENT',
  STATE_SNAPSHOT = 'STATE_SNAPSHOT',
}

export enum ElementType {
  BUTTON = 'button',
  LINK = 'link',
  INPUT = 'input',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  TEXTAREA = 'textarea',
  FORM = 'form',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  IFRAME = 'iframe',
  OTHER = 'other',
}

export enum InputFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  NUMBER = 'number',
  TEL = 'tel',
  URL = 'url',
  SEARCH = 'search',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime-local',
  FILE = 'file',
  HIDDEN = 'hidden',
  OTHER = 'other',
}

export interface PageNodeAttributes {
  nodeType: GraphNodeType.PAGE;
  id: string;
  url: string;
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  discoveredAt: Date;
  lastVisited?: Date;
  depth: number;
  isStartPage: boolean;
  pageSize?: number;
  loadTime?: number;
  statusCode?: number;
  elementsCount: number;
}

export interface ElementNodeAttributes {
  nodeType: GraphNodeType.ELEMENT;
  id: string;
  pageId: string;
  selector: string;
  type: ElementType;
  inputType?: InputFieldType;
  attributes?: Record<string, unknown>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  importance: number;
  isInteractable: boolean;
  isVisible: boolean;
  text?: string;
  href?: string;
  tagName: string;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
}

export interface NetworkRequestNodeAttributes {
  nodeType: GraphNodeType.NETWORK_REQUEST;
  id: string;
  triggerElementId?: string;
  triggerPageId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTimeMs?: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface NetworkMessageNodeAttributes {
  nodeType: GraphNodeType.NETWORK_MESSAGE;
  id: string;
  pageId: string;
  protocol: 'websocket' | 'sse' | 'webrtc';
  direction: 'incoming' | 'outgoing';
  messageType?: string;
  payload?: string;
  connectionUrl?: string;
  receivedAt: Date;
}

export interface CustomEventNodeAttributes {
  nodeType: GraphNodeType.CUSTOM_EVENT;
  id: string;
  pageId: string;
  triggerElementId?: string;
  eventName: string;
  eventDetail?: Record<string, unknown>;
  bubbles: boolean;
  cancelable: boolean;
  dispatchedAt: Date;
}

export interface StateSnapshotNodeAttributes {
  nodeType: GraphNodeType.STATE_SNAPSHOT;
  id: string;
  pageId: string;
  domHash: string;
  visibleText?: string;
  formValues?: Record<string, string>;
  previousSnapshotId?: string;
  changedElements?: string[];
  capturedAt: Date;
}

export type GraphNodeAttributes =
  | PageNodeAttributes
  | ElementNodeAttributes
  | NetworkRequestNodeAttributes
  | NetworkMessageNodeAttributes
  | CustomEventNodeAttributes
  | StateSnapshotNodeAttributes;

// =============================================================================
// EDGE TYPES
// =============================================================================

export enum ElementEdgeType {
  CONTAINS = 'CONTAINS',
  TRIGGERS = 'TRIGGERS',
  SUBMITS_TO = 'SUBMITS_TO',
  NAVIGATES_TO = 'NAVIGATES_TO',
  SIBLING_OF = 'SIBLING_OF',
}

export enum InteractionEdgeType {
  EMITS = 'EMITS',
  REQUESTS = 'REQUESTS',
  RECEIVES = 'RECEIVES',
  MUTATES = 'MUTATES',
  CAUSES = 'CAUSES',
}

export enum TransitionType {
  CLICK = 'click',
  FORM_SUBMIT = 'form_submit',
  NAVIGATION = 'navigation',
  REDIRECT = 'redirect',
  AJAX = 'ajax',
  PROGRAMMATIC = 'programmatic',
  LINK_CLICK = 'link_click',
  BUTTON_CLICK = 'button_click',
  BACK_NAVIGATION = 'back_navigation',
  FORWARD_NAVIGATION = 'forward_navigation',
  REFRESH = 'refresh',
  UNKNOWN = 'unknown',
}

export enum NavigationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  BLOCKED = 'blocked',
  PENDING = 'pending',
}

export interface NavigationEdgeAttributes {
  id: string;
  fromPageId: string;
  toPageId: string;
  triggerElementId?: string;
  transitionType: TransitionType;
  status: NavigationStatus;
  responseTimeMs?: number;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  traversedAt: Date;
  userAgent?: string;
  referrer?: string;
}

export interface ElementRelationEdge {
  type: ElementEdgeType;
  metadata?: Record<string, unknown>;
}

export interface InteractionEdge {
  type: InteractionEdgeType;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export type GraphEdgeAttributes =
  | NavigationEdgeAttributes
  | ElementRelationEdge
  | InteractionEdge;

// =============================================================================
// GRAPH DATA STRUCTURES
// =============================================================================

export interface ExplorationGraphData {
  nodes: Array<{
    key: string;
    attributes: GraphNodeAttributes;
  }>;
  edges: Array<{
    key: string;
    source: string;
    target: string;
    attributes: GraphEdgeAttributes;
  }>;
  metadata: GraphMetadata;
}

export interface GraphMetadata {
  workspaceId?: string;
  startUrl: string;
  maxDepth: number;
  maxPages: number;
  createdAt: Date;
  lastUpdated: Date;
  version?: string;
  cliVersion?: string;
}

export interface GraphAnalytics {
  totalNodes: number;
  totalEdges: number;
  averageDepth: number;
  maxDepth: number;
  leafNodes: number;
  cyclicEdges: number;
  mostConnectedPages: Array<{
    nodeId: string;
    url: string;
    inDegree: number;
    outDegree: number;
    totalDegree: number;
  }>;
  transitionTypeDistribution: Record<TransitionType, number>;
  statusDistribution: Record<NavigationStatus, number>;
  interactionStats?: {
    networkRequests: number;
    networkMessages: number;
    customEvents: number;
    stateSnapshots: number;
    totalInteractions: number;
  };
}

// =============================================================================
// GRAPH DIFF TYPES
// =============================================================================

export interface GraphDiff {
  addedNodes: Array<{ key: string; attributes: GraphNodeAttributes }>;
  removedNodes: Array<{ key: string; attributes: GraphNodeAttributes }>;
  modifiedNodes: Array<{
    key: string;
    before: GraphNodeAttributes;
    after: GraphNodeAttributes;
  }>;
  addedEdges: Array<{
    source: string;
    target: string;
    attributes: GraphEdgeAttributes;
  }>;
  removedEdges: Array<{
    source: string;
    target: string;
    attributes: GraphEdgeAttributes;
  }>;
  coverageChange: {
    before: number;
    after: number;
    delta: number;
  };
  summary: {
    newPages: string[];
    removedPages: string[];
    newElements: number;
    removedElements: number;
    uncoveredTransitions: Array<{ from: string; to: string }>;
  };
}

// =============================================================================
// TEST GENERATION TYPES
// =============================================================================

export interface GeneratedTestCase {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  steps: TestStep[];
  sourcePathIds: string[];
  confidence: number;
}

export interface TestStep {
  action: TestAction;
  target?: string;
  value?: string;
  description: string;
  assertions?: TestAssertion[];
}

export type TestAction =
  | 'navigate'
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'wait'
  | 'screenshot'
  | 'assert';

export interface TestAssertion {
  type: 'visible' | 'text' | 'url' | 'attribute' | 'count';
  target?: string;
  expected: string | number | boolean;
  operator?: 'equals' | 'contains' | 'matches' | 'greaterThan' | 'lessThan';
}

export interface CoverageAnalysis {
  totalPaths: number;
  coveredPaths: number;
  coveragePercent: number;
  uncoveredPaths: Array<{
    from: string;
    to: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  criticalPathsCovered: boolean;
  suggestions: string[];
}

// =============================================================================
// DETECTED ELEMENT (from ElementDetector)
// =============================================================================

export interface DetectedElement {
  selector: string;
  tagName: string;
  type: ElementType;
  inputType?: InputFieldType;
  text?: string;
  href?: string;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  isVisible: boolean;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

// =============================================================================
// TRANSITION RESULT (from TransitionDetector)
// =============================================================================

export interface TransitionResult {
  occurred: boolean;
  type: TransitionType;
  fromUrl: string;
  toUrl: string | null;
  triggerElement?: string;
  responseTimeMs?: number;
  error?: string;
}

// =============================================================================
// LOGGER INTERFACE (Framework-agnostic)
// =============================================================================

export interface Logger {
  log(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export class ConsoleLogger implements Logger {
  constructor(private context?: string) {}

  log(message: string, ...args: unknown[]): void {
    console.log(this.format(message), ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.debug(this.format(message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.format(message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.format(message), ...args);
  }

  private format(message: string): string {
    return this.context ? `[${this.context}] ${message}` : message;
  }
}
