/**
 * Exploration module exports.
 *
 * Provides site exploration functionality for crawling websites
 * and building ExplorationGraphs.
 */

// Main exploration function
export { explore, normalizeUrl, extractLinks, mapElementType, DEFAULT_OPTIONS } from "./explore.js";

// Types
export type {
  ExploreOptions,
  ExploreProgress,
  ProgressCallback,
} from "./types.js";
