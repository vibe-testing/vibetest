import type { Request } from "playwright";

/**
 * Valid strategy preset values.
 */
export const PAGE_READY_STRATEGIES = [
  "default",
  "static",
  "spa",
  "ssr",
  "canvas",
  "custom",
] as const;

export type PageReadyStrategy = (typeof PAGE_READY_STRATEGIES)[number];

/**
 * Network idle detection configuration.
 */
export interface NetworkReadyConfig {
  /**
   * Whether to wait for network idle.
   * @default true
   */
  enabled?: boolean;

  /**
   * How long network must be quiet before considering ready (ms).
   * @default 500
   */
  quietPeriodMs?: number;

  /**
   * Maximum pending requests to still consider network "idle".
   * Useful for sites with long-polling or websocket connections.
   * @default 2
   */
  maxPendingRequests?: number;

  /**
   * URL patterns to ignore in network tracking (as strings for JSON serialization).
   * Common patterns: analytics, tracking pixels, websockets.
   */
  ignorePatterns?: string[];
}

/**
 * DOM stability detection configuration.
 */
export interface DomReadyConfig {
  /**
   * Whether to wait for DOM stability.
   * @default true
   */
  enabled?: boolean;

  /**
   * How long DOM must be stable (no mutations) before considering ready (ms).
   * @default 300
   */
  stableMs?: number;

  /**
   * Minimum number of interactive elements required before considering ready.
   * Helps ensure page has meaningful content.
   * @default 1
   */
  minInteractiveElements?: number;

  /**
   * CSS selector for interactive elements to count.
   * @default "a[href], button, input, select, textarea, [role='button'], [role='link'], [onclick]"
   */
  interactiveSelector?: string;
}

/**
 * Client-side hydration detection configuration.
 *
 * Detects hydration-like patterns by watching for element count changes:
 * elements appear -> count drops significantly -> count recovers.
 *
 * Works well for most SPA frameworks but may need tuning for edge cases.
 * Disable for static sites or canvas-based apps.
 */
export interface HydrationReadyConfig {
  /**
   * Whether to detect and wait for client-side hydration.
   * When enabled, the service tracks if elements temporarily disappear
   * (indicating React/Vue hydration) and waits for recovery.
   * @default true
   */
  enabled?: boolean;

  /**
   * How long to wait for hydration to complete after detecting it started (ms).
   * If elements don't recover within this time, proceed anyway.
   * @default 10000
   */
  recoveryTimeoutMs?: number;

  /**
   * Threshold for detecting hydration start.
   * If interactive element count drops below this percentage of peak count,
   * consider hydration to have started.
   * @default 0.5 (50% drop triggers hydration detection)
   */
  dropThreshold?: number;

  /**
   * Minimum element count that must recover for hydration to be considered complete.
   * If peak was 20 elements and this is 0.7, we need at least 14 elements back.
   * @default 0.7 (70% of peak)
   */
  recoveryThreshold?: number;

  /**
   * How long to wait after rapid element count changes before considering settled (ms).
   * Separate from dom.stableMs to allow independent tuning.
   * @default 300
   */
  settleMs?: number;
}

/**
 * Animation completion detection configuration.
 */
export interface AnimationReadyConfig {
  /**
   * Whether to wait for animations to complete.
   * @default true
   */
  enabled?: boolean;

  /**
   * Grace period for infinite/looping animations (ms).
   * After this time, infinite animations are ignored.
   * @default 1000
   */
  infiniteGracePeriodMs?: number;

  /**
   * Maximum time to wait for any single animation (ms).
   * Prevents getting stuck on very long animations.
   * @default 5000
   */
  maxAnimationWaitMs?: number;
}

/**
 * Overall timing configuration.
 */
export interface TimingConfig {
  /**
   * Maximum total time to wait for page ready (ms).
   * @default 20000
   */
  maxWaitMs?: number;

  /**
   * How often to check conditions (ms).
   * Lower values = more responsive but more CPU usage.
   * @default 50
   */
  checkIntervalMs?: number;

  /**
   * Additional wait after all conditions are met (ms).
   * Useful for sites that have post-render animations or lazy content.
   * @default 200
   */
  settlePeriodMs?: number;
}

/**
 * Complete page ready configuration.
 * All fields are optional - sensible defaults are applied.
 */
export interface PageReadyConfig {
  /**
   * Pre-defined strategy preset. If specified, applies appropriate defaults
   * for the site type. Individual settings can still override preset values.
   * @default 'default'
   */
  strategy?: PageReadyStrategy;

  /**
   * Network idle detection settings.
   */
  network?: NetworkReadyConfig;

  /**
   * DOM stability detection settings.
   */
  dom?: DomReadyConfig;

  /**
   * Client-side hydration detection settings.
   */
  hydration?: HydrationReadyConfig;

  /**
   * Animation completion detection settings.
   */
  animations?: AnimationReadyConfig;

  /**
   * Overall timing settings.
   */
  timing?: TimingConfig;

  /**
   * Whether to capture an HTML snapshot when page is ready.
   * The snapshot can be used for element detection to avoid race conditions.
   * @default false
   */
  captureSnapshot?: boolean;

  /**
   * Whether to capture an HTML snapshot on timeout (useful for debugging).
   * Only applies when ready=false due to timeout.
   * @default false
   */
  captureSnapshotOnTimeout?: boolean;

  /**
   * Enable verbose debug logging every 500ms.
   * Useful for troubleshooting why page isn't becoming ready.
   * @default false
   */
  debug?: boolean;
}

/**
 * Fully resolved configuration with all defaults applied.
 * Used internally by waitForPageReady.
 */
export interface ResolvedPageReadyConfig {
  /** Network idle detection settings (all fields required). */
  network: Required<NetworkReadyConfig>;

  /** DOM stability detection settings (all fields required). */
  dom: Required<DomReadyConfig>;

  /** Client-side hydration detection settings (all fields required). */
  hydration: Required<HydrationReadyConfig>;

  /** Animation completion detection settings (all fields required). */
  animations: Required<AnimationReadyConfig>;

  /** Overall timing settings (all fields required). */
  timing: Required<TimingConfig>;
}

/**
 * Result of page ready detection.
 */
export interface PageReadyResult {
  /** Whether the page is considered ready for interaction. */
  ready: boolean;

  /** Total time spent waiting (ms). */
  timeMs: number;

  /** Why detection finished: all gates passed, timeout reached, or error occurred. */
  reason: "all_conditions_met" | "timeout" | "error";

  /** Status of each readiness gate. */
  conditions: {
    /** Network requests settled below threshold for quiet period. */
    networkReady: boolean;
    /** DOM mutations stopped and minimum elements present. */
    domReady: boolean;
    /** SPA hydration completed (or not detected). */
    hydrationComplete: boolean;
    /** Animations finished (or timed out). */
    animationsReady: boolean;
  };

  /** Final metric values at detection completion. */
  metrics: {
    /** Number of in-flight network requests. */
    pendingRequestCount: number;
    /** Number of interactive elements found. */
    interactiveElementCount: number;
    /** Number of currently running animations. */
    runningAnimationCount: number;
  };

  /** Whether a hydration pattern (element drop + recovery) was detected. */
  hydrationDetected: boolean;

  /** HTML snapshot if captureSnapshot was enabled. */
  snapshot?: string;

  /** Detailed timing info for debugging. Only populated when debug=true. */
  debugInfo?: {
    /** How long network has been quiet (ms). */
    networkQuietSinceMs: number;
    /** How long DOM has been stable (ms). */
    domStableSinceMs: number;
    /** Timestamp when hydration drop was detected, or null. */
    hydrationStartedAtMs: number | null;
    /** Timestamp when hydration recovery was detected, or null. */
    hydrationRecoveredAtMs: number | null;
    /** Maximum interactive element count observed. */
    peakInteractiveCount: number;
    /** Minimum interactive element count observed. */
    lowestInteractiveCount: number;
    /** Element count needed for hydration recovery. */
    recoveryTarget: number;
  };
}

/**
 * Single snapshot of all page signals - one browser roundtrip per tick.
 */
export interface PageSnapshot {
  /** Whether the snapshot was successfully retrieved from browser */
  ok: boolean;
  interactiveCount: number;
  lastMutationTime: number;
  runningAnimationCount: number;
  infiniteAnimationCount: number;
  /** Debug metrics (only populated when debug=true) */
  debug?: { textLength: number; nodeCount: number; bodyHeight: number };
}

/**
 * Network state (Node-side only, uses Playwright events).
 */
export interface NetworkState {
  pendingRequests: Set<Request>;
  firstQuietTime: number | null;
}

/**
 * DOM state (Node-side tracking).
 */
export interface DomState {
  lastMutationTime: number;
  minElementsReachedOnce: boolean;
}

/**
 * Hydration state - simplified to essential fields only.
 */
export interface HydrationState {
  peakCount: number;
  lowestCount: number;
  currentCount: number;
  sawDrop: boolean;
  recovered: boolean;
  dropDetectedAt: number | null;
  recoveredAt: number | null;
  recoveryTarget: number;
  lastChangeAt: number | null;
  settled: boolean;
}

/**
 * Animation state.
 */
export interface AnimationState {
  runningCount: number;
  infiniteCount: number;
  firstInfiniteTime: number | null;
  firstFiniteTime: number | null;
}

/**
 * Normalized config with pre-compiled regexes.
 */
export interface NormalizedConfig extends ResolvedPageReadyConfig {
  /** Pre-compiled network ignore patterns (invalid patterns filtered out) */
  compiledIgnorePatterns: RegExp[];
}

/**
 * Extended Window interface for browser-side state.
 */
export interface PageReadyWindow extends Window {
  __pageReadyLastMutation?: number;
  __pageReadyObserver?: MutationObserver;
}
