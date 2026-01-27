import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { saveGraph, loadGraph, DEFAULT_GRAPH_PATH } from "./serialize";
import { ExplorationGraph } from "./exploration-graph";
import { mkdir, rm, exists } from "fs/promises";
import { join } from "path";

describe("Graph Serialization", () => {
  const testDir = ".test-vibetest";
  const testPath = join(testDir, "app-graph.json");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("saves and loads a graph", async () => {
    const graph = new ExplorationGraph();
    graph.initialize("workspace-1", "https://example.com", { maxDepth: 2 });
    graph.addPageNode("page-1", {
      url: "https://example.com",
      discoveredAt: new Date(),
      depth: 0,
      isStartPage: true,
    });

    await saveGraph(graph, testPath);
    expect(await exists(testPath)).toBe(true);

    const loaded = await loadGraph(testPath);
    expect(loaded.getPageNode("page-1")).toBeDefined();
    expect(loaded.getMetadata().startUrl).toBe("https://example.com");
  });

  it("creates parent directories when saving", async () => {
    const graph = new ExplorationGraph();
    graph.initialize("ws", "https://test.com");

    const deepPath = join(testDir, "a", "b", "c", "graph.json");
    await saveGraph(graph, deepPath);
    expect(await exists(deepPath)).toBe(true);
  });

  it("throws on file not found", async () => {
    await expect(loadGraph("/nonexistent/path.json")).rejects.toThrow();
  });

  it("exports default path constant", () => {
    expect(DEFAULT_GRAPH_PATH).toBe(".vibetest/app-graph.json");
  });
});
