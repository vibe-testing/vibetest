import { DirectedGraph } from "graphology";
import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
  PageNodeAttributes,
  ElementNodeAttributes,
  NavigationEdgeAttributes,
  ElementRelationEdge,
  NetworkRequestNodeAttributes,
  NetworkMessageNodeAttributes,
  CustomEventNodeAttributes,
  StateSnapshotNodeAttributes,
  InteractionEdge,
  ExplorationGraphData,
  GraphAnalytics,
} from "./types";
import {
  GraphNodeType,
  ElementEdgeType,
  InteractionEdgeType,
  TransitionType,
  NavigationStatus,
} from "./types";

export class ExplorationGraph {
  private graph: DirectedGraph<GraphNodeAttributes, GraphEdgeAttributes>;
  private workspaceId: string = "";
  private startUrl: string = "";
  private maxDepth: number = 3;
  private maxPages: number = 100;
  private createdAt: Date;

  constructor() {
    this.graph = new DirectedGraph<GraphNodeAttributes, GraphEdgeAttributes>();
    this.createdAt = new Date();
  }

  initialize(
    workspaceId: string,
    startUrl: string,
    opts: {
      maxDepth?: number;
      maxPages?: number;
    } = {}
  ): void {
    const { maxDepth = 3, maxPages = 100 } = opts;
    this.workspaceId = workspaceId;
    this.startUrl = startUrl;
    this.maxDepth = maxDepth;
    this.maxPages = maxPages;
    this.createdAt = new Date();
  }

  // ==========================================================================
  // PAGE NODE METHODS
  // ==========================================================================

  addPageNode(
    nodeId: string,
    attributes: Omit<PageNodeAttributes, "id" | "elementsCount" | "nodeType">
  ): boolean {
    if (this.graph.hasNode(nodeId)) {
      return false;
    }

    const fullAttributes: PageNodeAttributes = {
      ...attributes,
      nodeType: GraphNodeType.PAGE,
      id: nodeId,
      elementsCount: 0,
    };

    this.graph.addNode(nodeId, fullAttributes);
    return true;
  }

  updatePageNode(
    nodeId: string,
    updates: Partial<PageNodeAttributes>
  ): boolean {
    if (!this.graph.hasNode(nodeId)) {
      return false;
    }

    const currentAttributes = this.graph.getNodeAttributes(nodeId);
    const updatedAttributes = { ...currentAttributes, ...updates };

    this.graph.mergeNodeAttributes(nodeId, updatedAttributes);
    return true;
  }

  removePageNode(nodeId: string): boolean {
    if (!this.graph.hasNode(nodeId)) {
      return false;
    }

    this.graph.dropNode(nodeId);
    return true;
  }

  hasPageNode(nodeId: string): boolean {
    return this.graph.hasNode(nodeId);
  }

  getPageNode(nodeId: string): PageNodeAttributes | undefined {
    if (!this.graph.hasNode(nodeId)) {
      return undefined;
    }

    const attributes = this.graph.getNodeAttributes(nodeId);

    if (
      "nodeType" in attributes &&
      attributes.nodeType === GraphNodeType.PAGE
    ) {
      return attributes;
    }

    return undefined;
  }

  getAllPageNodes(): Array<{ id: string; attributes: PageNodeAttributes }> {
    const pageNodes: Array<{ id: string; attributes: PageNodeAttributes }> = [];

    this.graph.forEachNode((nodeId, attributes) => {
      if (
        "nodeType" in attributes &&
        attributes.nodeType === GraphNodeType.PAGE
      ) {
        pageNodes.push({
          id: nodeId,
          attributes: attributes,
        });
      }
    });

    return pageNodes;
  }

  // ==========================================================================
  // NAVIGATION EDGE METHODS
  // ==========================================================================

  addNavigationEdge(
    edgeId: string,
    fromNodeId: string,
    toNodeId: string,
    attributes: Omit<NavigationEdgeAttributes, "id" | "fromPageId" | "toPageId">
  ): boolean {
    if (!this.graph.hasNode(fromNodeId) || !this.graph.hasNode(toNodeId)) {
      return false;
    }

    if (this.graph.hasEdge(fromNodeId, toNodeId)) {
      return false;
    }

    const fullAttributes: NavigationEdgeAttributes = {
      ...attributes,
      id: edgeId,
      fromPageId: fromNodeId,
      toPageId: toNodeId,
    };

    this.graph.addEdge(fromNodeId, toNodeId, fullAttributes);
    return true;
  }

  updateNavigationEdge(
    fromNodeId: string,
    toNodeId: string,
    updates: Partial<NavigationEdgeAttributes>
  ): boolean {
    if (!this.graph.hasEdge(fromNodeId, toNodeId)) {
      return false;
    }

    const currentAttributes = this.graph.getEdgeAttributes(
      fromNodeId,
      toNodeId
    );
    const updatedAttributes = { ...currentAttributes, ...updates };

    this.graph.mergeEdgeAttributes(fromNodeId, toNodeId, updatedAttributes);
    return true;
  }

  removeNavigationEdge(fromNodeId: string, toNodeId: string): boolean {
    if (!this.graph.hasEdge(fromNodeId, toNodeId)) {
      return false;
    }

    this.graph.dropEdge(fromNodeId, toNodeId);
    return true;
  }

  hasNavigationEdge(fromNodeId: string, toNodeId: string): boolean {
    return this.graph.hasEdge(fromNodeId, toNodeId);
  }

  getNavigationEdge(
    fromNodeId: string,
    toNodeId: string
  ): NavigationEdgeAttributes | undefined {
    if (!this.graph.hasEdge(fromNodeId, toNodeId)) {
      return undefined;
    }

    const attributes = this.graph.getEdgeAttributes(fromNodeId, toNodeId);

    if ("transitionType" in attributes && "status" in attributes) {
      return attributes;
    }

    return undefined;
  }

  getAllNavigationEdges(): Array<{
    id: string;
    source: string;
    target: string;
    attributes: NavigationEdgeAttributes;
  }> {
    const navigationEdges: Array<{
      id: string;
      source: string;
      target: string;
      attributes: NavigationEdgeAttributes;
    }> = [];

    this.graph.forEachEdge((edgeId, attributes, source, target) => {
      if ("transitionType" in attributes && "status" in attributes) {
        navigationEdges.push({
          id: edgeId,
          source,
          target,
          attributes: attributes,
        });
      }
    });

    return navigationEdges;
  }

  // ==========================================================================
  // ELEMENT NODE METHODS
  // ==========================================================================

  addElementToPage(
    pageId: string,
    elementId: string,
    attributes: Omit<ElementNodeAttributes, "id" | "pageId" | "nodeType">
  ): boolean {
    if (!this.graph.hasNode(pageId)) {
      return false;
    }

    const elementNodeKey = `element:${elementId}`;

    if (this.graph.hasNode(elementNodeKey)) {
      return false;
    }

    const fullAttributes: ElementNodeAttributes = {
      ...attributes,
      nodeType: GraphNodeType.ELEMENT,
      id: elementId,
      pageId,
    };

    this.graph.addNode(elementNodeKey, fullAttributes);

    const edgeAttributes: ElementRelationEdge = {
      type: ElementEdgeType.CONTAINS,
    };

    this.graph.addEdge(pageId, elementNodeKey, edgeAttributes);

    const pageNode = this.graph.getNodeAttributes(pageId) as PageNodeAttributes;
    const currentCount = pageNode.elementsCount || 0;
    this.graph.mergeNodeAttributes(pageId, {
      elementsCount: currentCount + 1,
    });

    return true;
  }

  removeElementFromPage(pageId: string, elementId: string): boolean {
    if (!this.graph.hasNode(pageId)) {
      return false;
    }

    const elementNodeKey = `element:${elementId}`;

    if (!this.graph.hasNode(elementNodeKey)) {
      return false;
    }

    this.graph.dropNode(elementNodeKey);

    const pageNode = this.graph.getNodeAttributes(pageId) as PageNodeAttributes;
    const currentCount = pageNode.elementsCount || 0;
    this.graph.mergeNodeAttributes(pageId, {
      elementsCount: Math.max(0, currentCount - 1),
    });

    return true;
  }

  getPageElements(pageId: string): ElementNodeAttributes[] {
    if (!this.graph.hasNode(pageId)) {
      return [];
    }

    const outNeighbors = this.graph.outNeighbors(pageId);
    const elements: ElementNodeAttributes[] = [];

    for (const neighborKey of outNeighbors) {
      const edge = this.graph.getEdgeAttributes(pageId, neighborKey);

      if ("type" in edge && edge.type === ElementEdgeType.CONTAINS) {
        const nodeAttrs = this.graph.getNodeAttributes(neighborKey);

        if (
          "nodeType" in nodeAttrs &&
          nodeAttrs.nodeType === GraphNodeType.ELEMENT
        ) {
          elements.push(nodeAttrs);
        }
      }
    }

    return elements;
  }

  getElement(
    pageId: string,
    elementId: string
  ): ElementNodeAttributes | undefined {
    const elementNodeKey = `element:${elementId}`;

    if (!this.graph.hasNode(elementNodeKey)) {
      return undefined;
    }

    const nodeAttrs = this.graph.getNodeAttributes(elementNodeKey);

    if (
      "nodeType" in nodeAttrs &&
      nodeAttrs.nodeType === GraphNodeType.ELEMENT &&
      nodeAttrs.pageId === pageId
    ) {
      return nodeAttrs;
    }

    return undefined;
  }

  addElementRelationship(
    fromElementId: string,
    toElementId: string,
    edgeType: ElementEdgeType
  ): boolean {
    const fromNodeKey = `element:${fromElementId}`;
    const toNodeKey = `element:${toElementId}`;

    if (!this.graph.hasNode(fromNodeKey)) {
      return false;
    }

    if (!this.graph.hasNode(toNodeKey)) {
      return false;
    }

    if (this.graph.hasEdge(fromNodeKey, toNodeKey)) {
      return false;
    }

    const edgeAttributes: ElementRelationEdge = {
      type: edgeType,
    };

    this.graph.addEdge(fromNodeKey, toNodeKey, edgeAttributes);
    return true;
  }

  // ==========================================================================
  // INTERACTION TRACKING NODE METHODS
  // ==========================================================================

  addNetworkRequestNode(
    nodeId: string,
    attributes: Omit<NetworkRequestNodeAttributes, "id" | "nodeType">
  ): boolean {
    const nodeKey = `request:${nodeId}`;

    if (this.graph.hasNode(nodeKey)) {
      return false;
    }

    const fullAttributes: NetworkRequestNodeAttributes = {
      ...attributes,
      nodeType: GraphNodeType.NETWORK_REQUEST,
      id: nodeId,
    };

    this.graph.addNode(nodeKey, fullAttributes);
    return true;
  }

  addNetworkMessageNode(
    nodeId: string,
    attributes: Omit<NetworkMessageNodeAttributes, "id" | "nodeType">
  ): boolean {
    const nodeKey = `message:${nodeId}`;

    if (this.graph.hasNode(nodeKey)) {
      return false;
    }

    const fullAttributes: NetworkMessageNodeAttributes = {
      ...attributes,
      nodeType: GraphNodeType.NETWORK_MESSAGE,
      id: nodeId,
    };

    this.graph.addNode(nodeKey, fullAttributes);
    return true;
  }

  addCustomEventNode(
    nodeId: string,
    attributes: Omit<CustomEventNodeAttributes, "id" | "nodeType">
  ): boolean {
    const nodeKey = `event:${nodeId}`;

    if (this.graph.hasNode(nodeKey)) {
      return false;
    }

    const fullAttributes: CustomEventNodeAttributes = {
      ...attributes,
      nodeType: GraphNodeType.CUSTOM_EVENT,
      id: nodeId,
    };

    this.graph.addNode(nodeKey, fullAttributes);
    return true;
  }

  addStateSnapshotNode(
    nodeId: string,
    attributes: Omit<StateSnapshotNodeAttributes, "id" | "nodeType">
  ): boolean {
    const nodeKey = `state:${nodeId}`;

    if (this.graph.hasNode(nodeKey)) {
      return false;
    }

    const fullAttributes: StateSnapshotNodeAttributes = {
      ...attributes,
      nodeType: GraphNodeType.STATE_SNAPSHOT,
      id: nodeId,
    };

    this.graph.addNode(nodeKey, fullAttributes);
    return true;
  }

  // ==========================================================================
  // INTERACTION EDGE METHODS
  // ==========================================================================

  linkElementToRequest(elementId: string, requestId: string): boolean {
    const elementNodeKey = `element:${elementId}`;
    const requestNodeKey = `request:${requestId}`;

    if (!this.graph.hasNode(elementNodeKey)) {
      return false;
    }

    if (!this.graph.hasNode(requestNodeKey)) {
      return false;
    }

    if (this.graph.hasEdge(elementNodeKey, requestNodeKey)) {
      return false;
    }

    const edgeAttributes: InteractionEdge = {
      type: InteractionEdgeType.REQUESTS,
      timestamp: new Date(),
    };

    this.graph.addEdge(elementNodeKey, requestNodeKey, edgeAttributes);
    return true;
  }

  linkElementToEvent(elementId: string, eventId: string): boolean {
    const elementNodeKey = `element:${elementId}`;
    const eventNodeKey = `event:${eventId}`;

    if (!this.graph.hasNode(elementNodeKey)) {
      return false;
    }

    if (!this.graph.hasNode(eventNodeKey)) {
      return false;
    }

    if (this.graph.hasEdge(elementNodeKey, eventNodeKey)) {
      return false;
    }

    const edgeAttributes: InteractionEdge = {
      type: InteractionEdgeType.EMITS,
      timestamp: new Date(),
    };

    this.graph.addEdge(elementNodeKey, eventNodeKey, edgeAttributes);
    return true;
  }

  linkPageToMessage(pageId: string, messageId: string): boolean {
    const messageNodeKey = `message:${messageId}`;

    if (!this.graph.hasNode(pageId)) {
      return false;
    }

    if (!this.graph.hasNode(messageNodeKey)) {
      return false;
    }

    if (this.graph.hasEdge(pageId, messageNodeKey)) {
      return false;
    }

    const edgeAttributes: InteractionEdge = {
      type: InteractionEdgeType.RECEIVES,
      timestamp: new Date(),
    };

    this.graph.addEdge(pageId, messageNodeKey, edgeAttributes);
    return true;
  }

  linkRequestToState(requestId: string, stateId: string): boolean {
    const requestNodeKey = `request:${requestId}`;
    const stateNodeKey = `state:${stateId}`;

    if (!this.graph.hasNode(requestNodeKey)) {
      return false;
    }

    if (!this.graph.hasNode(stateNodeKey)) {
      return false;
    }

    if (this.graph.hasEdge(requestNodeKey, stateNodeKey)) {
      return false;
    }

    const edgeAttributes: InteractionEdge = {
      type: InteractionEdgeType.CAUSES,
      timestamp: new Date(),
    };

    this.graph.addEdge(requestNodeKey, stateNodeKey, edgeAttributes);
    return true;
  }

  linkInteractionToState(elementId: string, stateId: string): boolean {
    const elementNodeKey = `element:${elementId}`;
    const stateNodeKey = `state:${stateId}`;

    if (!this.graph.hasNode(elementNodeKey)) {
      return false;
    }

    if (!this.graph.hasNode(stateNodeKey)) {
      return false;
    }

    if (this.graph.hasEdge(elementNodeKey, stateNodeKey)) {
      return false;
    }

    const edgeAttributes: InteractionEdge = {
      type: InteractionEdgeType.MUTATES,
      timestamp: new Date(),
    };

    this.graph.addEdge(elementNodeKey, stateNodeKey, edgeAttributes);
    return true;
  }

  // ==========================================================================
  // INTERACTION QUERY METHODS
  // ==========================================================================

  getPageNetworkRequests(pageId: string): NetworkRequestNodeAttributes[] {
    const requests: NetworkRequestNodeAttributes[] = [];

    this.graph.forEachNode((nodeId, attributes) => {
      if (
        "nodeType" in attributes &&
        attributes.nodeType === GraphNodeType.NETWORK_REQUEST &&
        attributes.triggerPageId === pageId
      ) {
        requests.push(attributes);
      }
    });

    return requests;
  }

  getPageNetworkMessages(pageId: string): NetworkMessageNodeAttributes[] {
    const messages: NetworkMessageNodeAttributes[] = [];

    this.graph.forEachNode((nodeId, attributes) => {
      if (
        "nodeType" in attributes &&
        attributes.nodeType === GraphNodeType.NETWORK_MESSAGE &&
        attributes.pageId === pageId
      ) {
        messages.push(attributes);
      }
    });

    return messages;
  }

  getPageCustomEvents(pageId: string): CustomEventNodeAttributes[] {
    const events: CustomEventNodeAttributes[] = [];

    this.graph.forEachNode((nodeId, attributes) => {
      if (
        "nodeType" in attributes &&
        attributes.nodeType === GraphNodeType.CUSTOM_EVENT &&
        attributes.pageId === pageId
      ) {
        events.push(attributes);
      }
    });

    return events;
  }

  getPageStateSnapshots(pageId: string): StateSnapshotNodeAttributes[] {
    const snapshots: StateSnapshotNodeAttributes[] = [];

    this.graph.forEachNode((nodeId, attributes) => {
      if (
        "nodeType" in attributes &&
        attributes.nodeType === GraphNodeType.STATE_SNAPSHOT &&
        attributes.pageId === pageId
      ) {
        snapshots.push(attributes);
      }
    });

    return snapshots;
  }

  getInteractionStats(): {
    networkRequests: number;
    networkMessages: number;
    customEvents: number;
    stateSnapshots: number;
    totalInteractions: number;
  } {
    let networkRequests = 0;
    let networkMessages = 0;
    let customEvents = 0;
    let stateSnapshots = 0;

    this.graph.forEachNode((_nodeId, attributes) => {
      if ("nodeType" in attributes) {
        switch (attributes.nodeType) {
          case GraphNodeType.NETWORK_REQUEST:
            networkRequests++;
            break;
          case GraphNodeType.NETWORK_MESSAGE:
            networkMessages++;
            break;
          case GraphNodeType.CUSTOM_EVENT:
            customEvents++;
            break;
          case GraphNodeType.STATE_SNAPSHOT:
            stateSnapshots++;
            break;
        }
      }
    });

    return {
      networkRequests,
      networkMessages,
      customEvents,
      stateSnapshots,
      totalInteractions:
        networkRequests + networkMessages + customEvents + stateSnapshots,
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  getNodeCount(): number {
    return this.graph.order;
  }

  getEdgeCount(): number {
    return this.graph.size;
  }

  getNodeNeighbors(nodeId: string): string[] {
    return this.graph.hasNode(nodeId) ? this.graph.neighbors(nodeId) : [];
  }

  getNodeSuccessors(nodeId: string): string[] {
    return this.graph.hasNode(nodeId) ? this.graph.outNeighbors(nodeId) : [];
  }

  getNodePredecessors(nodeId: string): string[] {
    return this.graph.hasNode(nodeId) ? this.graph.inNeighbors(nodeId) : [];
  }

  clear(): void {
    this.graph.clear();
  }

  clone(): ExplorationGraph {
    const cloned = new ExplorationGraph();
    cloned.graph = this.graph.copy();
    cloned.workspaceId = this.workspaceId;
    cloned.startUrl = this.startUrl;
    cloned.maxDepth = this.maxDepth;
    cloned.maxPages = this.maxPages;
    cloned.createdAt = this.createdAt;

    return cloned;
  }

  // ==========================================================================
  // SERIALIZATION METHODS
  // ==========================================================================

  serialize(): ExplorationGraphData {
    const nodes = this.graph.mapNodes((nodeId, attributes) => ({
      key: nodeId,
      attributes,
    }));

    const edges = this.graph.mapEdges((edgeId, attributes, source, target) => ({
      key: edgeId || `${source}-${target}`,
      source,
      target,
      attributes,
    }));

    return {
      nodes,
      edges,
      metadata: {
        workspaceId: this.workspaceId,
        startUrl: this.startUrl,
        maxDepth: this.maxDepth,
        maxPages: this.maxPages,
        createdAt: this.createdAt,
        lastUpdated: new Date(),
      },
    };
  }

  deserialize(data: ExplorationGraphData): void {
    this.clear();

    this.workspaceId = data.metadata.workspaceId;
    this.startUrl = data.metadata.startUrl;
    this.maxDepth = data.metadata.maxDepth;
    this.maxPages = data.metadata.maxPages;
    this.createdAt = data.metadata.createdAt;

    for (const node of data.nodes) {
      this.graph.addNode(node.key, node.attributes);
    }

    for (const edge of data.edges) {
      if (this.graph.hasNode(edge.source) && this.graph.hasNode(edge.target)) {
        this.graph.addEdge(edge.source, edge.target, edge.attributes);
      }
    }
  }

  toJSON(): string {
    return JSON.stringify(this.serialize(), null, 2);
  }

  fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as ExplorationGraphData;
      this.deserialize(data);
    } catch (error) {
      throw new Error("Invalid JSON format for exploration graph");
    }
  }

  getInternalGraph(): DirectedGraph<GraphNodeAttributes, GraphEdgeAttributes> {
    return this.graph;
  }

  getMetadata(): {
    workspaceId: string;
    startUrl: string;
    maxDepth: number;
    maxPages: number;
    createdAt: Date;
  } {
    return {
      workspaceId: this.workspaceId,
      startUrl: this.startUrl,
      maxDepth: this.maxDepth,
      maxPages: this.maxPages,
      createdAt: this.createdAt,
    };
  }

  updatePageMetadata(
    pageId: string,
    metadata: {
      category?: string;
      semanticScore?: number;
      isGatekeeper?: boolean;
      isDestructive?: boolean;
      isHighValue?: boolean;
      hasComplexValidation?: boolean;
      testPriority?: string;
    }
  ): boolean {
    if (!this.graph.hasNode(pageId)) {
      return false;
    }

    const currentAttributes = this.graph.getNodeAttributes(
      pageId
    ) as PageNodeAttributes;

    const existingMetadata = currentAttributes.metadata || {};
    const updatedMetadata = { ...existingMetadata, ...metadata };

    this.graph.mergeNodeAttributes(pageId, { metadata: updatedMetadata });
    return true;
  }

  getAnalytics(): GraphAnalytics {
    const nodes = this.getAllPageNodes();
    const edges = this.getAllNavigationEdges();

    const depths = nodes.map((node) => node.attributes.depth);
    const averageDepth =
      depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;

    const leafNodes = nodes.filter(
      (node) => this.getNodeSuccessors(node.id).length === 0
    ).length;

    const cyclicEdges = edges.filter((edge) => {
      const sourceDepth = this.getPageNode(edge.source)?.depth || 0;
      const targetDepth = this.getPageNode(edge.target)?.depth || 0;
      return targetDepth <= sourceDepth;
    }).length;

    const nodeConnections = nodes.map((node) => {
      const inDegree = this.getNodePredecessors(node.id).length;
      const outDegree = this.getNodeSuccessors(node.id).length;
      return {
        nodeId: node.id,
        url: node.attributes.url,
        inDegree,
        outDegree,
        totalDegree: inDegree + outDegree,
      };
    });

    const mostConnectedPages = nodeConnections
      .sort((a, b) => b.totalDegree - a.totalDegree)
      .slice(0, 10);

    const transitionTypeDistribution = edges.reduce(
      (acc, edge) => {
        acc[edge.attributes.transitionType] =
          (acc[edge.attributes.transitionType] || 0) + 1;
        return acc;
      },
      {} as Record<TransitionType, number>
    );

    const statusDistribution = edges.reduce(
      (acc, edge) => {
        acc[edge.attributes.status] = (acc[edge.attributes.status] || 0) + 1;
        return acc;
      },
      {} as Record<NavigationStatus, number>
    );

    const interactionStats = this.getInteractionStats();

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      averageDepth,
      maxDepth,
      leafNodes,
      cyclicEdges,
      mostConnectedPages,
      transitionTypeDistribution,
      statusDistribution,
      interactionStats,
    };
  }
}
