import { ExplorationGraph } from "./exploration-graph";

const MAX_URL_LENGTH = 40;

/**
 * Sanitize a string for use in Mermaid labels.
 * Escapes quotes and removes special characters that break Mermaid syntax.
 */
function sanitizeLabel(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/[&<>]/g, "")
    .replace(/[\[\]]/g, "")
    .replace(/[\n\r]/g, " ");
}

/**
 * Extract display-friendly URL (remove protocol, truncate).
 */
function formatUrl(url: string): string {
  let display = url.replace(/^https?:\/\//, "");
  if (display.length > MAX_URL_LENGTH) {
    display = display.slice(0, MAX_URL_LENGTH - 3) + "...";
  }
  return sanitizeLabel(display);
}

/**
 * Convert node ID to valid Mermaid identifier.
 */
function toMermaidId(nodeId: string): string {
  return nodeId.replace(/-/g, "_");
}

/**
 * Convert an ExplorationGraph to Mermaid flowchart syntax.
 *
 * Pages become nodes with their URL (truncated for display).
 * Navigation edges become arrows with transition type labels.
 *
 * @param graph - The exploration graph to convert
 * @returns A string in Mermaid flowchart format
 */
export function graphToMermaid(graph: ExplorationGraph): string {
  const lines: string[] = ["flowchart TD"];

  // Add page nodes
  for (const { id, attributes } of graph.getAllPageNodes()) {
    const mermaidId = toMermaidId(id);
    const label = formatUrl(attributes.url);
    lines.push(`  ${mermaidId}["${label}"]`);
  }

  // Add navigation edges
  for (const edge of graph.getAllNavigationEdges()) {
    const fromId = toMermaidId(edge.source);
    const toId = toMermaidId(edge.target);
    const label = sanitizeLabel(edge.attributes.transitionType);
    lines.push(`  ${fromId} -->|${label}| ${toId}`);
  }

  return lines.join("\n");
}
