import type {
  PageReadyConfig,
  PageReadyStrategy,
  ResolvedPageReadyConfig,
} from "./types.js";

/**
 * Default configuration values.
 * These are sensible defaults that work well for most sites.
 */
export const DEFAULT_PAGE_READY_CONFIG: ResolvedPageReadyConfig = {
  network: {
    enabled: true,
    quietPeriodMs: 500,
    maxPendingRequests: 2, // Allow some persistent connections (websockets, long-polling)
    ignorePatterns: [
      // Analytics & tracking
      "google-analytics\\.com",
      "googletagmanager\\.com",
      "hotjar\\.com",
      "facebook\\.net/.+/fbevents",
      "analytics",
      "tracking",
      // Persistent connections
      "sockjs-node",
      "/websocket",
    ],
  },
  dom: {
    enabled: true,
    stableMs: 300,
    minInteractiveElements: 1,
    interactiveSelector:
      "a[href], button, input, select, textarea, [role='button'], [role='link'], [onclick]",
  },
  hydration: {
    enabled: true,
    recoveryTimeoutMs: 10000,
    dropThreshold: 0.5,
    recoveryThreshold: 0.7,
    settleMs: 300,
  },
  animations: {
    enabled: true,
    infiniteGracePeriodMs: 1000,
    maxAnimationWaitMs: 5000,
  },
  timing: {
    maxWaitMs: 20000,
    checkIntervalMs: 50,
    settlePeriodMs: 200, // Extra settle time after all conditions met
  },
};

/**
 * Strategy presets for common site types.
 * These are merged with DEFAULT_PAGE_READY_CONFIG, then user overrides.
 */
export const STRATEGY_PRESETS: Record<
  Exclude<PageReadyStrategy, "default" | "custom">,
  Partial<PageReadyConfig>
> = {
  /**
   * Fast static sites with no client-side rendering.
   * Quick detection, hydration disabled.
   */
  static: {
    hydration: { enabled: false },
    timing: { maxWaitMs: 10000, checkIntervalMs: 100 },
    network: { quietPeriodMs: 300 },
  },

  /**
   * React/Vue/Angular Single Page Applications.
   * More aggressive hydration detection, longer waits.
   */
  spa: {
    hydration: {
      enabled: true,
      dropThreshold: 0.6,
      recoveryThreshold: 0.75,
      recoveryTimeoutMs: 15000,
    },
    timing: { maxWaitMs: 25000, checkIntervalMs: 30 },
    dom: { stableMs: 400 },
  },

  /**
   * Next.js/Remix/Nuxt SSR + hydration sites.
   * Longer recovery timeout, more network patience.
   */
  ssr: {
    hydration: {
      enabled: true,
      recoveryTimeoutMs: 15000,
      dropThreshold: 0.5,
      recoveryThreshold: 0.8,
    },
    timing: { maxWaitMs: 30000, settlePeriodMs: 300 },
    network: { quietPeriodMs: 600, maxPendingRequests: 2 },
  },

  /**
   * Canvas/WebGL/custom element apps.
   * Disable hydration, use fallback content detection.
   */
  canvas: {
    dom: { minInteractiveElements: 0 },
    hydration: { enabled: false },
    timing: { maxWaitMs: 15000 },
    network: { quietPeriodMs: 400 },
  },
};

/**
 * Resolve partial config into fully resolved config with all defaults.
 *
 * Resolution order (later overrides earlier):
 * 1. DEFAULT_PAGE_READY_CONFIG
 * 2. Strategy preset (if strategy specified and not 'default'/'custom')
 * 3. User-provided config overrides
 * 4. Validation/clamping of numeric values
 *
 * Uses spread operator for type-safety - if new fields are added to interfaces,
 * TypeScript will catch missing fields in DEFAULT_PAGE_READY_CONFIG.
 */
export function resolvePageReadyConfig(
  config: PageReadyConfig = {}
): ResolvedPageReadyConfig {
  const defaults = DEFAULT_PAGE_READY_CONFIG;

  // Get strategy preset if specified
  const strategy = config.strategy ?? "default";
  const preset =
    strategy !== "default" && strategy !== "custom"
      ? STRATEGY_PRESETS[strategy]
      : {};

  // Merge: defaults <- preset <- user config
  const merged: ResolvedPageReadyConfig = {
    network: {
      ...defaults.network,
      ...preset.network,
      ...config.network,
    },
    dom: {
      ...defaults.dom,
      ...preset.dom,
      ...config.dom,
    },
    hydration: {
      ...defaults.hydration,
      ...preset.hydration,
      ...config.hydration,
    },
    animations: {
      ...defaults.animations,
      ...preset.animations,
      ...config.animations,
    },
    timing: {
      ...defaults.timing,
      ...preset.timing,
      ...config.timing,
    },
  };

  // Validate and clamp values to sane ranges
  return validateConfig(merged);
}

/**
 * Validate and clamp config values to prevent nonsensical configurations.
 */
function validateConfig(cfg: ResolvedPageReadyConfig): ResolvedPageReadyConfig {
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  return {
    network: {
      ...cfg.network,
      quietPeriodMs: clamp(cfg.network.quietPeriodMs, 0, 60000),
      maxPendingRequests: clamp(cfg.network.maxPendingRequests, 0, 100),
    },
    dom: {
      ...cfg.dom,
      stableMs: clamp(cfg.dom.stableMs, 0, 60000),
      minInteractiveElements: clamp(cfg.dom.minInteractiveElements, 0, 1000),
    },
    hydration: {
      ...cfg.hydration,
      dropThreshold: clamp(cfg.hydration.dropThreshold, 0.01, 0.99),
      recoveryThreshold: clamp(cfg.hydration.recoveryThreshold, 0.01, 1.0),
      recoveryTimeoutMs: clamp(cfg.hydration.recoveryTimeoutMs, 0, 120000),
      settleMs: clamp(cfg.hydration.settleMs, 0, 60000),
    },
    animations: {
      ...cfg.animations,
      infiniteGracePeriodMs: clamp(
        cfg.animations.infiniteGracePeriodMs,
        0,
        60000
      ),
      maxAnimationWaitMs: clamp(cfg.animations.maxAnimationWaitMs, 0, 60000),
    },
    timing: {
      ...cfg.timing,
      maxWaitMs: clamp(cfg.timing.maxWaitMs, 100, 300000),
      checkIntervalMs: clamp(cfg.timing.checkIntervalMs, 10, 5000),
      settlePeriodMs: clamp(cfg.timing.settlePeriodMs, 0, 60000),
    },
  };
}
