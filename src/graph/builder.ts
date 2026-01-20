/**
 * Graph Builder
 *
 * Builds the exploration graph from page visits and element detections.
 * Uses graphology's DirectedGraph for efficient graph operations.
 *
 * @license MIT
 */

import { DirectedGraph } from 'graphology';
import type {
  ExplorationGraphData,
  GraphNodeAttributes,
  GraphEdgeAttributes,
  PageNodeAttributes,
  ElementNodeAttributes,
  NavigationEdgeAttributes,
  ElementType,
  InputFieldType,
  TransitionType,
  NavigationStatus,
  ElementEdgeType,
} from './types.js';
import { GraphNodeType } from './types.js';

/**
 * Bounding box dimensions for an element.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Options for adding a page to the graph.
 */
export interface AddPageOptions {
  /** Page title from document.title */
  title?: string;
  /** Depth from the start page (0 = start page) */
  depth: number;
  /** Whether this is the initial start page */
  isStartPage?: boolean;
  /** HTTP status code returned by the page */
  statusCode?: number;
  /** Time taken to load the page in milliseconds */
  loadTime?: number;
}

/**
 * Options for adding an element to the graph.
 */
export interface AddElementOptions {
  /** CSS selector for the element */
  selector: string;
  /** Type of element (button, link, input, etc.) */
  type: ElementType;
  /** Input field type for input elements */
  inputType?: InputFieldType;
  /** HTML tag name */
  tagName: string;
  /** Text content of the element */
  text?: string;
  /** href attribute for links */
  href?: string;
  /** name attribute */
  name?: string;
  /** placeholder attribute */
  placeholder?: string;
  /** aria-label attribute */
  ariaLabel?: string;
  /** Importance score (0-1) */
  importance: number;
  /** Whether the element can be interacted with */
  isInteractable: boolean;
  /** Whether the element is visible in the viewport */
  isVisible: boolean;
  /** Element's bounding box coordinates */
  boundingBox?: BoundingBox;
}

/**
 * Options for adding a navigation edge between pages.
 */
export interface AddNavigationOptions {
  /** Element that triggered the navigation */
  triggerElementId?: string;
  /** Type of transition (click, form_submit, etc.) */
  transitionType: TransitionType;
  /** Status of the navigation */
  status: NavigationStatus;
  /** Response time in milliseconds */
  responseTimeMs?: number;
}

/**
 * GraphBuilder - Constructs and manages the exploration graph.
 *
 * The graph consists of:
 * - Page nodes: Represent visited web pages
 * - Element nodes: Represent interactive elements on pages (keyed as `element:{id}`)
 * - Navigation edges: Represent transitions between pages
 * - Contains edges: Connect pages to their elements
 *
 * @example
 * ```typescript
 * const builder = new GraphBuilder();
 * builder.initialize('https://example.com', { maxDepth: 3, maxPages: 50 });
 *
 * builder.addPage('page-1', 'https://example.com', { depth: 0, isStartPage: true });
 * builder.addElement('page-1', 'btn-1', {
 *   selector: 'button.submit',
 *   type: ElementType.BUTTON,
 *   tagName: 'button',
 *   importance: 0.8,
 *   isInteractable: true,
 *   isVisible: true,
 * });
 *
 * const data = builder.serialize();
 * ```
 */
export class GraphBuilder {
  /** The underlying graphology directed graph */
  private graph: DirectedGraph<GraphNodeAttributes, GraphEdgeAttributes>;

  /** The starting URL for exploration */
  private startUrl: string = '';

  /** Maximum depth to explore from start page */
  private maxDepth: number = 3;

  /** Maximum number of pages to explore */
  private maxPages: number = 100;

  /** Timestamp when the graph was created */
  private createdAt: Date;

  /**
   * Creates a new GraphBuilder instance.
   */
  constructor() {
    this.graph = new DirectedGraph();
    this.createdAt = new Date();
  }

  /**
   * Initializes the graph builder with exploration parameters.
   *
   * @param startUrl - The URL to start exploration from
   * @param options - Optional configuration for exploration limits
   * @param options.maxDepth - Maximum depth to explore (default: 3)
   * @param options.maxPages - Maximum pages to explore (default: 100)
   */
  initialize(
    startUrl: string,
    options?: { maxDepth?: number; maxPages?: number }
  ): void {
    this.startUrl = startUrl;
    this.maxDepth = options?.maxDepth ?? 3;
    this.maxPages = options?.maxPages ?? 100;
    this.createdAt = new Date();
  }

  /**
   * Adds a page node to the graph.
   *
   * @param id - Unique identifier for the page
   * @param url - The page URL
   * @param options - Page attributes
   * @returns true if the page was added, false if it already exists
   */
  addPage(id: string, url: string, options: AddPageOptions): boolean {
    if (this.graph.hasNode(id)) {
      return false;
    }

    const attributes: PageNodeAttributes = {
      nodeType: GraphNodeType.PAGE,
      id,
      url,
      depth: options.depth,
      isStartPage: options.isStartPage ?? false,
      discoveredAt: new Date(),
      elementsCount: 0,
    };

    // Only add optional properties if they have values
    if (options.title !== undefined) {
      attributes.title = options.title;
    }
    if (options.statusCode !== undefined) {
      attributes.statusCode = options.statusCode;
    }
    if (options.loadTime !== undefined) {
      attributes.loadTime = options.loadTime;
    }

    this.graph.addNode(id, attributes);
    return true;
  }

  /**
   * Adds an element node to the graph and creates a CONTAINS edge from its page.
   *
   * Elements are stored with a key format of `element:{elementId}`.
   * The page's elementsCount is automatically incremented.
   *
   * @param pageId - The ID of the page containing this element
   * @param elementId - Unique identifier for the element
   * @param options - Element attributes
   * @returns true if the element was added, false if page doesn't exist or element already exists
   */
  addElement(
    pageId: string,
    elementId: string,
    options: AddElementOptions
  ): boolean {
    // Verify the page exists
    if (!this.graph.hasNode(pageId)) {
      return false;
    }

    // Create element node key
    const nodeKey = `element:${elementId}`;

    // Check if element already exists
    if (this.graph.hasNode(nodeKey)) {
      return false;
    }

    // Create element attributes with required properties
    const attributes: ElementNodeAttributes = {
      nodeType: GraphNodeType.ELEMENT,
      id: elementId,
      pageId,
      selector: options.selector,
      type: options.type,
      tagName: options.tagName,
      importance: options.importance,
      isInteractable: options.isInteractable,
      isVisible: options.isVisible,
    };

    // Only add optional properties if they have values
    if (options.inputType !== undefined) {
      attributes.inputType = options.inputType;
    }
    if (options.text !== undefined) {
      attributes.text = options.text;
    }
    if (options.href !== undefined) {
      attributes.href = options.href;
    }
    if (options.name !== undefined) {
      attributes.name = options.name;
    }
    if (options.placeholder !== undefined) {
      attributes.placeholder = options.placeholder;
    }
    if (options.ariaLabel !== undefined) {
      attributes.ariaLabel = options.ariaLabel;
    }
    if (options.boundingBox !== undefined) {
      attributes.boundingBox = options.boundingBox;
    }

    // Add element node
    this.graph.addNode(nodeKey, attributes);

    // Add CONTAINS edge from page to element
    const containsEdge: { type: ElementEdgeType } = {
      type: 'CONTAINS' as ElementEdgeType,
    };
    this.graph.addEdge(pageId, nodeKey, containsEdge as GraphEdgeAttributes);

    // Update element count on page
    const pageAttrs = this.graph.getNodeAttributes(pageId) as PageNodeAttributes;
    this.graph.mergeNodeAttributes(pageId, {
      elementsCount: (pageAttrs.elementsCount || 0) + 1,
    });

    return true;
  }

  /**
   * Adds a navigation edge between two pages.
   *
   * @param fromPageId - The source page ID
   * @param toPageId - The target page ID
   * @param options - Navigation attributes
   * @returns true if the navigation was added, false if pages don't exist or edge already exists
   */
  addNavigation(
    fromPageId: string,
    toPageId: string,
    options: AddNavigationOptions
  ): boolean {
    // Verify both pages exist
    if (!this.graph.hasNode(fromPageId) || !this.graph.hasNode(toPageId)) {
      return false;
    }

    // Check if edge already exists
    if (this.graph.hasEdge(fromPageId, toPageId)) {
      return false;
    }

    // Create navigation edge attributes with required properties
    const attributes: NavigationEdgeAttributes = {
      id: `${fromPageId}->${toPageId}`,
      fromPageId,
      toPageId,
      transitionType: options.transitionType,
      status: options.status,
      traversedAt: new Date(),
    };

    // Only add optional properties if they have values
    if (options.triggerElementId !== undefined) {
      attributes.triggerElementId = options.triggerElementId;
    }
    if (options.responseTimeMs !== undefined) {
      attributes.responseTimeMs = options.responseTimeMs;
    }

    this.graph.addEdge(fromPageId, toPageId, attributes);
    return true;
  }

  /**
   * Checks if a page exists in the graph.
   *
   * @param id - The page ID to check
   * @returns true if the page exists
   */
  hasPage(id: string): boolean {
    return this.graph.hasNode(id);
  }

  /**
   * Gets the total number of page nodes in the graph.
   *
   * @returns The count of page nodes
   */
  getPageCount(): number {
    let count = 0;
    this.graph.forEachNode((_, attrs) => {
      if (attrs.nodeType === GraphNodeType.PAGE) {
        count++;
      }
    });
    return count;
  }

  /**
   * Gets the total number of element nodes in the graph.
   *
   * @returns The count of element nodes
   */
  getElementCount(): number {
    let count = 0;
    this.graph.forEachNode((_, attrs) => {
      if (attrs.nodeType === GraphNodeType.ELEMENT) {
        count++;
      }
    });
    return count;
  }

  /**
   * Serializes the graph to a portable data format.
   *
   * Returns the complete graph structure including:
   * - All nodes with their attributes
   * - All edges with their attributes
   * - Graph metadata (startUrl, maxDepth, maxPages, timestamps)
   *
   * @returns The serialized exploration graph data
   */
  serialize(): ExplorationGraphData {
    const nodes = this.graph.mapNodes((nodeKey, attributes) => ({
      key: nodeKey,
      attributes,
    }));

    const edges = this.graph.mapEdges(
      (edgeKey, attributes, source, target) => ({
        key: edgeKey || `${source}->${target}`,
        source,
        target,
        attributes,
      })
    );

    return {
      nodes,
      edges,
      metadata: {
        startUrl: this.startUrl,
        maxDepth: this.maxDepth,
        maxPages: this.maxPages,
        createdAt: this.createdAt,
        lastUpdated: new Date(),
        version: '1.0.0',
        cliVersion: '0.1.0',
      },
    };
  }

  /**
   * Clears all nodes and edges from the graph.
   *
   * This does not reset the initialization parameters (startUrl, maxDepth, maxPages).
   * To fully reset, create a new GraphBuilder instance.
   */
  clear(): void {
    this.graph.clear();
  }
}
