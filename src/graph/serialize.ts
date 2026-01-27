import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { ExplorationGraph } from "./exploration-graph";

export const DEFAULT_GRAPH_PATH = ".vibetest/app-graph.json";

export async function saveGraph(
  graph: ExplorationGraph,
  filePath: string = DEFAULT_GRAPH_PATH
): Promise<void> {
  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true });

  // Serialize and write
  const json = graph.toJSON();
  await writeFile(filePath, json, "utf-8");
}

export async function loadGraph(
  filePath: string = DEFAULT_GRAPH_PATH
): Promise<ExplorationGraph> {
  const json = await readFile(filePath, "utf-8");
  const graph = new ExplorationGraph();
  graph.fromJSON(json);
  return graph;
}
