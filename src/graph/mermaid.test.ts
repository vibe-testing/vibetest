import { describe, it, expect } from "bun:test";
import { graphToMermaid } from "./mermaid";
import { ExplorationGraph, TransitionType, NavigationStatus } from "./index";

describe("Mermaid Export", () => {
  it("generates empty diagram for empty graph", () => {
    const graph = new ExplorationGraph();
    graph.initialize("ws", "https://example.com");

    const mermaid = graphToMermaid(graph);
    expect(mermaid).toContain("flowchart TD");
  });

  it("generates nodes for pages", () => {
    const graph = new ExplorationGraph();
    graph.initialize("ws", "https://example.com");
    graph.addPageNode("page-1", {
      url: "https://example.com/",
      discoveredAt: new Date(),
      depth: 0,
      isStartPage: true,
    });

    const mermaid = graphToMermaid(graph);
    expect(mermaid).toContain('page_1["example.com/"]');
  });

  it("generates edges for navigation", () => {
    const graph = new ExplorationGraph();
    graph.initialize("ws", "https://example.com");
    graph.addPageNode("page-1", {
      url: "https://example.com/",
      discoveredAt: new Date(),
      depth: 0,
      isStartPage: true,
    });
    graph.addPageNode("page-2", {
      url: "https://example.com/about",
      discoveredAt: new Date(),
      depth: 1,
      isStartPage: false,
    });
    graph.addNavigationEdge("edge-1", "page-1", "page-2", {
      transitionType: TransitionType.CLICK,
      status: NavigationStatus.SUCCESS,
      traversedAt: new Date(),
    });

    const mermaid = graphToMermaid(graph);
    expect(mermaid).toContain("page_1 -->|click| page_2");
  });

  it("sanitizes special characters in URLs", () => {
    const graph = new ExplorationGraph();
    graph.initialize("ws", "https://example.com");
    graph.addPageNode("page-1", {
      url: "https://example.com/search?q=test&page=1",
      discoveredAt: new Date(),
      depth: 0,
      isStartPage: true,
    });

    const mermaid = graphToMermaid(graph);
    // Should not break Mermaid syntax
    expect(mermaid).not.toContain("&");
    expect(mermaid).toContain("flowchart TD");
  });

  it("truncates long URLs", () => {
    const graph = new ExplorationGraph();
    graph.initialize("ws", "https://example.com");
    graph.addPageNode("page-1", {
      url: "https://example.com/very/long/path/that/goes/on/and/on/forever",
      discoveredAt: new Date(),
      depth: 0,
      isStartPage: true,
    });

    const mermaid = graphToMermaid(graph);
    // URL should be truncated with ellipsis
    expect(mermaid).toContain("...");
  });

  it("sanitizes special characters in edge labels", () => {
    const graph = new ExplorationGraph();
    graph.initialize("ws", "https://example.com");
    graph.addPageNode("page-1", {
      url: "https://example.com/",
      discoveredAt: new Date(),
      depth: 0,
      isStartPage: true,
    });
    graph.addPageNode("page-2", {
      url: "https://example.com/about",
      discoveredAt: new Date(),
      depth: 1,
      isStartPage: false,
    });
    // Use a custom transition type with special characters
    graph.addNavigationEdge("edge-1", "page-1", "page-2", {
      transitionType: "click<script>\nalert()" as TransitionType,
      status: NavigationStatus.SUCCESS,
      traversedAt: new Date(),
    });

    const mermaid = graphToMermaid(graph);
    // Should not contain special characters that break Mermaid syntax in edge label
    expect(mermaid).not.toContain("<script>");
    expect(mermaid).not.toContain("\nalert");
    // Edge label should be sanitized
    expect(mermaid).toContain("-->|clickscript alert()|");
  });
});
