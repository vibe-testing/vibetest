import { describe, test, expect, beforeEach } from "bun:test";
import { ExplorationGraph } from "./exploration-graph";
import {
  TransitionType,
  NavigationStatus,
  ElementType,
  GraphNodeType,
  ElementEdgeType,
} from "./types";

describe("ExplorationGraph", () => {
  let graph: ExplorationGraph;

  beforeEach(() => {
    graph = new ExplorationGraph();
    graph.initialize("workspace-1", "https://example.com");
  });

  describe("initialize", () => {
    test("should initialize with workspace id and start url", () => {
      const newGraph = new ExplorationGraph();
      newGraph.initialize("workspace-1", "https://example.com");
      const metadata = newGraph.getMetadata();

      expect(metadata.workspaceId).toBe("workspace-1");
      expect(metadata.startUrl).toBe("https://example.com");
      expect(metadata.maxDepth).toBe(3); // default
      expect(metadata.maxPages).toBe(100); // default
      expect(metadata.createdAt).toBeInstanceOf(Date);
    });

    test("should initialize with custom options", () => {
      const newGraph = new ExplorationGraph();
      newGraph.initialize("workspace-1", "https://example.com", {
        maxDepth: 5,
        maxPages: 50,
      });
      const metadata = newGraph.getMetadata();

      expect(metadata.maxDepth).toBe(5);
      expect(metadata.maxPages).toBe(50);
    });
  });

  describe("page node management", () => {
    test("should add a page node", () => {
      const result = graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });

      expect(result).toBe(true);
      expect(graph.hasPageNode("page-1")).toBe(true);
      expect(graph.getNodeCount()).toBe(1);
    });

    test("should not add duplicate page node", () => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });

      const result = graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });

      expect(result).toBe(false);
      expect(graph.getNodeCount()).toBe(1);
    });

    test("should get page node", () => {
      const now = new Date();
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        title: "Page 1",
        discoveredAt: now,
        depth: 0,
        isStartPage: true,
      });

      const pageNode = graph.getPageNode("page-1");
      expect(pageNode).toBeDefined();
      expect(pageNode!.url).toBe("https://example.com/page1");
      expect(pageNode!.title).toBe("Page 1");
      expect(pageNode!.nodeType).toBe(GraphNodeType.PAGE);
      expect(pageNode!.elementsCount).toBe(0);
    });

    test("should update page node", () => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });

      const result = graph.updatePageNode("page-1", {
        title: "Updated Title",
        statusCode: 200,
      });

      expect(result).toBe(true);
      const pageNode = graph.getPageNode("page-1");
      expect(pageNode!.title).toBe("Updated Title");
      expect(pageNode!.statusCode).toBe(200);
    });

    test("should not update non-existent page node", () => {
      const result = graph.updatePageNode("non-existent", { title: "Test" });
      expect(result).toBe(false);
    });

    test("should remove page node", () => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });

      const result = graph.removePageNode("page-1");
      expect(result).toBe(true);
      expect(graph.hasPageNode("page-1")).toBe(false);
      expect(graph.getNodeCount()).toBe(0);
    });

    test("should not remove non-existent page node", () => {
      const result = graph.removePageNode("non-existent");
      expect(result).toBe(false);
    });

    test("should get all page nodes", () => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });
      graph.addPageNode("page-2", {
        url: "https://example.com/page2",
        discoveredAt: new Date(),
        depth: 1,
        isStartPage: false,
      });

      const pages = graph.getAllPageNodes();
      expect(pages.length).toBe(2);
      expect(pages.map((p) => p.id)).toContain("page-1");
      expect(pages.map((p) => p.id)).toContain("page-2");
    });
  });

  describe("navigation edge management", () => {
    beforeEach(() => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });
      graph.addPageNode("page-2", {
        url: "https://example.com/page2",
        discoveredAt: new Date(),
        depth: 1,
        isStartPage: false,
      });
    });

    test("should add navigation edge", () => {
      const result = graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });

      expect(result).toBe(true);
      expect(graph.hasNavigationEdge("page-1", "page-2")).toBe(true);
      expect(graph.getEdgeCount()).toBe(1);
    });

    test("should not add edge when source node does not exist", () => {
      const result = graph.addNavigationEdge(
        "edge-1",
        "non-existent",
        "page-2",
        {
          transitionType: TransitionType.CLICK,
          status: NavigationStatus.SUCCESS,
          traversedAt: new Date(),
        }
      );

      expect(result).toBe(false);
    });

    test("should not add duplicate edge", () => {
      graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });

      const result = graph.addNavigationEdge("edge-2", "page-1", "page-2", {
        transitionType: TransitionType.NAVIGATION,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });

      expect(result).toBe(false);
    });

    test("should get navigation edge", () => {
      const now = new Date();
      graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: now,
      });

      const edge = graph.getNavigationEdge("page-1", "page-2");
      expect(edge).toBeDefined();
      expect(edge!.transitionType).toBe(TransitionType.CLICK);
      expect(edge!.status).toBe(NavigationStatus.SUCCESS);
    });

    test("should update navigation edge", () => {
      graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });

      const result = graph.updateNavigationEdge("page-1", "page-2", {
        status: NavigationStatus.FAILED,
        errorMessage: "Timeout",
      });

      expect(result).toBe(true);
      const edge = graph.getNavigationEdge("page-1", "page-2");
      expect(edge!.status).toBe(NavigationStatus.FAILED);
      expect(edge!.errorMessage).toBe("Timeout");
    });

    test("should remove navigation edge", () => {
      graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });

      const result = graph.removeNavigationEdge("page-1", "page-2");
      expect(result).toBe(true);
      expect(graph.hasNavigationEdge("page-1", "page-2")).toBe(false);
    });

    test("should get all navigation edges", () => {
      graph.addPageNode("page-3", {
        url: "https://example.com/page3",
        discoveredAt: new Date(),
        depth: 1,
        isStartPage: false,
      });

      graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });
      graph.addNavigationEdge("edge-2", "page-1", "page-3", {
        transitionType: TransitionType.NAVIGATION,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });

      const edges = graph.getAllNavigationEdges();
      expect(edges.length).toBe(2);
    });
  });

  describe("element management", () => {
    beforeEach(() => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });
    });

    test("should add element to page", () => {
      const result = graph.addElementToPage("page-1", "elem-1", {
        selector: "button.submit",
        type: ElementType.BUTTON,
        importance: 0.8,
        isInteractable: true,
        tagName: "button",
      });

      expect(result).toBe(true);
      const pageNode = graph.getPageNode("page-1");
      expect(pageNode!.elementsCount).toBe(1);
    });

    test("should not add element to non-existent page", () => {
      const result = graph.addElementToPage("non-existent", "elem-1", {
        selector: "button.submit",
        type: ElementType.BUTTON,
        importance: 0.8,
        isInteractable: true,
        tagName: "button",
      });

      expect(result).toBe(false);
    });

    test("should get page elements", () => {
      graph.addElementToPage("page-1", "elem-1", {
        selector: "button.submit",
        type: ElementType.BUTTON,
        importance: 0.8,
        isInteractable: true,
        tagName: "button",
      });
      graph.addElementToPage("page-1", "elem-2", {
        selector: "a.link",
        type: ElementType.LINK,
        importance: 0.5,
        isInteractable: true,
        tagName: "a",
      });

      const elements = graph.getPageElements("page-1");
      expect(elements.length).toBe(2);
    });

    test("should get element by id", () => {
      graph.addElementToPage("page-1", "elem-1", {
        selector: "button.submit",
        type: ElementType.BUTTON,
        importance: 0.8,
        isInteractable: true,
        tagName: "button",
        text: "Submit",
      });

      const element = graph.getElement("page-1", "elem-1");
      expect(element).toBeDefined();
      expect(element!.selector).toBe("button.submit");
      expect(element!.text).toBe("Submit");
    });

    test("should remove element from page", () => {
      graph.addElementToPage("page-1", "elem-1", {
        selector: "button.submit",
        type: ElementType.BUTTON,
        importance: 0.8,
        isInteractable: true,
        tagName: "button",
      });

      const result = graph.removeElementFromPage("page-1", "elem-1");
      expect(result).toBe(true);
      expect(graph.getElement("page-1", "elem-1")).toBeUndefined();
      expect(graph.getPageNode("page-1")!.elementsCount).toBe(0);
    });
  });

  describe("element relationships", () => {
    beforeEach(() => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });
      graph.addElementToPage("page-1", "elem-1", {
        selector: "button.submit",
        type: ElementType.BUTTON,
        importance: 0.8,
        isInteractable: true,
        tagName: "button",
      });
      graph.addElementToPage("page-1", "elem-2", {
        selector: "input.name",
        type: ElementType.INPUT,
        importance: 0.5,
        isInteractable: true,
        tagName: "input",
      });
    });

    test("should add element relationship", () => {
      const result = graph.addElementRelationship(
        "elem-1",
        "elem-2",
        ElementEdgeType.SIBLING_OF
      );
      expect(result).toBe(true);
    });

    test("should not add relationship for non-existent element", () => {
      const result = graph.addElementRelationship(
        "non-existent",
        "elem-2",
        ElementEdgeType.SIBLING_OF
      );
      expect(result).toBe(false);
    });
  });

  describe("serialization", () => {
    beforeEach(() => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });
      graph.addPageNode("page-2", {
        url: "https://example.com/page2",
        discoveredAt: new Date(),
        depth: 1,
        isStartPage: false,
      });
      graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });
    });

    test("should serialize graph", () => {
      const data = graph.serialize();

      expect(data.nodes.length).toBe(2);
      expect(data.edges.length).toBe(1);
      expect(data.metadata.workspaceId).toBe("workspace-1");
      expect(data.metadata.startUrl).toBe("https://example.com");
    });

    test("should deserialize graph", () => {
      const data = graph.serialize();

      const newGraph = new ExplorationGraph();
      newGraph.deserialize(data);

      expect(newGraph.getNodeCount()).toBe(2);
      expect(newGraph.getEdgeCount()).toBe(1);
      expect(newGraph.getMetadata().workspaceId).toBe("workspace-1");
    });

    test("should convert to JSON and back", () => {
      const json = graph.toJSON();
      expect(typeof json).toBe("string");

      const newGraph = new ExplorationGraph();
      newGraph.fromJSON(json);

      expect(newGraph.getNodeCount()).toBe(2);
      expect(newGraph.getEdgeCount()).toBe(1);
    });

    test("should throw on invalid JSON", () => {
      const newGraph = new ExplorationGraph();
      expect(() => newGraph.fromJSON("invalid json")).toThrow();
    });
  });

  describe("analytics", () => {
    beforeEach(() => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });
      graph.addPageNode("page-2", {
        url: "https://example.com/page2",
        discoveredAt: new Date(),
        depth: 1,
        isStartPage: false,
      });
      graph.addPageNode("page-3", {
        url: "https://example.com/page3",
        discoveredAt: new Date(),
        depth: 2,
        isStartPage: false,
      });
      graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });
      graph.addNavigationEdge("edge-2", "page-2", "page-3", {
        transitionType: TransitionType.NAVIGATION,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });
    });

    test("should get analytics", () => {
      const analytics = graph.getAnalytics();

      expect(analytics.totalNodes).toBe(3);
      expect(analytics.totalEdges).toBe(2);
      expect(analytics.averageDepth).toBe(1); // (0 + 1 + 2) / 3 = 1
      expect(analytics.maxDepth).toBe(2);
      expect(analytics.leafNodes).toBe(1); // page-3 has no outgoing edges
      expect(analytics.transitionTypeDistribution[TransitionType.CLICK]).toBe(
        1
      );
      expect(
        analytics.transitionTypeDistribution[TransitionType.NAVIGATION]
      ).toBe(1);
    });
  });

  describe("interaction tracking", () => {
    beforeEach(() => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });
      graph.addElementToPage("page-1", "elem-1", {
        selector: "button.submit",
        type: ElementType.BUTTON,
        importance: 0.8,
        isInteractable: true,
        tagName: "button",
      });
    });

    test("should add network request node", () => {
      const result = graph.addNetworkRequestNode("req-1", {
        triggerPageId: "page-1",
        method: "POST",
        url: "https://api.example.com/submit",
        startedAt: new Date(),
      });

      expect(result).toBe(true);
    });

    test("should add network message node", () => {
      const result = graph.addNetworkMessageNode("msg-1", {
        pageId: "page-1",
        protocol: "websocket",
        direction: "incoming",
        receivedAt: new Date(),
      });

      expect(result).toBe(true);
    });

    test("should add custom event node", () => {
      const result = graph.addCustomEventNode("event-1", {
        pageId: "page-1",
        eventName: "form-submitted",
        bubbles: true,
        cancelable: false,
        dispatchedAt: new Date(),
      });

      expect(result).toBe(true);
    });

    test("should add state snapshot node", () => {
      const result = graph.addStateSnapshotNode("state-1", {
        pageId: "page-1",
        domHash: "abc123",
        capturedAt: new Date(),
      });

      expect(result).toBe(true);
    });

    test("should get interaction stats", () => {
      graph.addNetworkRequestNode("req-1", {
        triggerPageId: "page-1",
        method: "POST",
        url: "https://api.example.com/submit",
        startedAt: new Date(),
      });
      graph.addNetworkMessageNode("msg-1", {
        pageId: "page-1",
        protocol: "websocket",
        direction: "incoming",
        receivedAt: new Date(),
      });
      graph.addCustomEventNode("event-1", {
        pageId: "page-1",
        eventName: "form-submitted",
        bubbles: true,
        cancelable: false,
        dispatchedAt: new Date(),
      });
      graph.addStateSnapshotNode("state-1", {
        pageId: "page-1",
        domHash: "abc123",
        capturedAt: new Date(),
      });

      const stats = graph.getInteractionStats();
      expect(stats.networkRequests).toBe(1);
      expect(stats.networkMessages).toBe(1);
      expect(stats.customEvents).toBe(1);
      expect(stats.stateSnapshots).toBe(1);
      expect(stats.totalInteractions).toBe(4);
    });
  });

  describe("utility methods", () => {
    beforeEach(() => {
      graph.addPageNode("page-1", {
        url: "https://example.com/page1",
        discoveredAt: new Date(),
        depth: 0,
        isStartPage: true,
      });
      graph.addPageNode("page-2", {
        url: "https://example.com/page2",
        discoveredAt: new Date(),
        depth: 1,
        isStartPage: false,
      });
      graph.addNavigationEdge("edge-1", "page-1", "page-2", {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
        traversedAt: new Date(),
      });
    });

    test("should get node neighbors", () => {
      const neighbors = graph.getNodeNeighbors("page-1");
      expect(neighbors).toContain("page-2");
    });

    test("should get node successors", () => {
      const successors = graph.getNodeSuccessors("page-1");
      expect(successors).toContain("page-2");
    });

    test("should get node predecessors", () => {
      const predecessors = graph.getNodePredecessors("page-2");
      expect(predecessors).toContain("page-1");
    });

    test("should clear graph", () => {
      graph.clear();
      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
    });

    test("should clone graph", () => {
      const cloned = graph.clone();
      expect(cloned.getNodeCount()).toBe(2);
      expect(cloned.getEdgeCount()).toBe(1);
      expect(cloned.getMetadata().workspaceId).toBe("workspace-1");
    });

    test("should get internal graph", () => {
      const internalGraph = graph.getInternalGraph();
      expect(internalGraph).toBeDefined();
      expect(internalGraph.order).toBe(2); // graphology uses "order" for node count
    });
  });
});
