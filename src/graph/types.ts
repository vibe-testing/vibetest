/**
 * Core graph types for exploration graph
 */

// ==========================================================================
// ENUMS
// ==========================================================================

export enum TransitionType {
  CLICK = "click",
  FORM_SUBMIT = "form_submit",
  NAVIGATION = "navigation",
  REDIRECT = "redirect",
  AJAX = "ajax",
  PROGRAMMATIC = "programmatic",
}

export enum NavigationStatus {
  SUCCESS = "success",
  FAILED = "failed",
  TIMEOUT = "timeout",
  BLOCKED = "blocked",
}

export enum ElementType {
  BUTTON = "button",
  LINK = "link",
  INPUT = "input",
  SELECT = "select",
  CHECKBOX = "checkbox",
  RADIO = "radio",
  TEXTAREA = "textarea",
  FORM = "form",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  IFRAME = "iframe",
  OTHER = "other",
}

export enum GraphNodeType {
  PAGE = "PAGE",
  ELEMENT = "ELEMENT",
  NETWORK_REQUEST = "NETWORK_REQUEST",
  NETWORK_MESSAGE = "NETWORK_MESSAGE",
  CUSTOM_EVENT = "CUSTOM_EVENT",
  STATE_SNAPSHOT = "STATE_SNAPSHOT",
}

export enum ElementEdgeType {
  CONTAINS = "CONTAINS",
  TRIGGERS = "TRIGGERS",
  SUBMITS_TO = "SUBMITS_TO",
  NAVIGATES_TO = "NAVIGATES_TO",
  SIBLING_OF = "SIBLING_OF",
}

export enum InteractionEdgeType {
  EMITS = "EMITS",
  REQUESTS = "REQUESTS",
  RECEIVES = "RECEIVES",
  MUTATES = "MUTATES",
  CAUSES = "CAUSES",
}

// ==========================================================================
// NODE ATTRIBUTES
// ==========================================================================

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
  attributes?: Record<string, unknown>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  importance: number;
  isInteractable: boolean;
  text?: string;
  href?: string;
  tagName: string;
}

export interface NetworkRequestNodeAttributes {
  nodeType: GraphNodeType.NETWORK_REQUEST;
  id: string;
  triggerElementId?: string;
  triggerPageId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
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
  protocol: "websocket" | "sse" | "webrtc";
  direction: "incoming" | "outgoing";
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

// ==========================================================================
// EDGE ATTRIBUTES
// ==========================================================================

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

// ==========================================================================
// GRAPH DATA STRUCTURES
// ==========================================================================

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
  metadata: {
    workspaceId: string;
    startUrl: string;
    maxDepth: number;
    maxPages: number;
    createdAt: Date;
    lastUpdated: Date;
  };
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
