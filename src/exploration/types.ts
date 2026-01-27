/**
 * Types for site exploration options and results.
 */

/**
 * Options for the explore() function.
 * All fields are optional with sensible defaults.
 */
export interface ExploreOptions {
  /**
   * Maximum depth to crawl from start URL.
   * @default 3
   */
  maxDepth?: number;

  /**
   * Maximum number of pages to visit.
   * @default 50
   */
  maxPages?: number;

  /**
   * Whether to run browser in headless mode.
   * @default true
   */
  headless?: boolean;

  /**
   * Viewport width in pixels.
   * @default 1280
   */
  viewportWidth?: number;

  /**
   * Viewport height in pixels.
   * @default 720
   */
  viewportHeight?: number;
}

/**
 * Progress information during exploration.
 * Passed to the optional progress callback.
 */
export interface ExploreProgress {
  /** Total number of pages discovered (visited + queued) */
  pagesDiscovered: number;

  /** Number of pages already visited */
  pagesVisited: number;

  /** URL currently being explored */
  currentUrl: string;

  /** Depth of current page from start URL */
  depth: number;
}

/**
 * Callback function for receiving exploration progress updates.
 */
export type ProgressCallback = (progress: ExploreProgress) => void;
