import type { Page, Request } from "playwright";

import { resolvePageReadyConfig } from "./config.js";
import type {
  PageReadyConfig,
  PageReadyResult,
  PageSnapshot,
  NetworkState,
  DomState,
  HydrationState,
  AnimationState,
  NormalizedConfig,
  PageReadyWindow,
} from "./types.js";

/**
 * Wait for page to be ready for interaction.
 *
 * This is the main entry point for page ready detection. It monitors:
 * - Network activity (waiting for requests to settle)
 * - DOM stability (waiting for mutations to stop)
 * - SPA hydration (detecting element drop/recovery patterns)
 * - Animations (waiting for CSS/JS animations to complete)
 *
 * @param page - Playwright Page object
 * @param config - Optional configuration (defaults are sensible for most sites)
 * @returns Promise<PageReadyResult> with ready state and diagnostics
 */
export async function waitForPageReady(
  page: Page,
  config: PageReadyConfig = {}
): Promise<PageReadyResult> {
  const startTime = Date.now();
  const cfg = normalizeConfig(resolvePageReadyConfig(config));
  const debug = config.debug ?? false;

  if (debug) {
    console.debug(
      `[PageReady] Starting page ready detection (maxWait: ${cfg.timing.maxWaitMs}ms)`
    );
  }

  // State initialization
  const network: NetworkState = {
    pendingRequests: new Set(),
    firstQuietTime: null,
  };
  const dom: DomState = {
    lastMutationTime: startTime,
    minElementsReachedOnce: false,
  };
  const hydration: HydrationState = {
    peakCount: 0,
    lowestCount: Infinity,
    currentCount: 0,
    sawDrop: false,
    recovered: false,
    dropDetectedAt: null,
    recoveredAt: null,
    recoveryTarget: 0,
    lastChangeAt: null,
    settled: true,
  };
  const animation: AnimationState = {
    runningCount: 0,
    infiniteCount: 0,
    firstInfiniteTime: null,
    firstFiniteTime: null,
  };

  // Gate results
  let networkReady = false,
    domReady = false,
    hydrationComplete = false,
    animationsReady = false;

  // Cleanup tracking
  let cleanupNetwork: (() => void) | null = null;
  let observerInitialized = false;

  try {
    // Setup network listeners
    cleanupNetwork = setupNetworkListeners(page, cfg, network);
    if (network.pendingRequests.size <= cfg.network.maxPendingRequests) {
      network.firstQuietTime = Date.now();
    }

    // Setup DOM mutation observer
    dom.lastMutationTime = await initMutationObserver(page);
    observerInitialized = true;

    // Main loop
    let lastDebugLog = 0;
    while (true) {
      const now = Date.now();
      const elapsed = now - startTime;

      // Gate 0: Timeout
      if (elapsed >= cfg.timing.maxWaitMs) {
        const snapshot =
          config.captureSnapshotOnTimeout || config.debug
            ? await captureSnapshot(page, debug)
            : undefined;
        return buildResult(
          "timeout",
          false,
          startTime,
          network,
          dom,
          hydration,
          animation,
          networkReady,
          domReady,
          hydrationComplete,
          animationsReady,
          snapshot
        );
      }

      // Single browser roundtrip for all page signals
      const snap = await getPageSnapshot(page, cfg, config.debug);

      // Update state from snapshot only if successful
      if (snap.ok) {
        dom.lastMutationTime = snap.lastMutationTime;
        animation.runningCount = snap.runningAnimationCount;
        animation.infiniteCount = snap.infiniteAnimationCount;
        updateHydrationState(hydration, snap.interactiveCount, cfg, now, debug);
      }

      // Gate 1: Network quiet
      networkReady = checkNetworkReady(cfg, network, now);

      // Gate 2: DOM stable + min elements reached once (sticky)
      // Requires successful snapshot - can't trust DOM state if blind
      if (snap.ok && hydration.currentCount >= cfg.dom.minInteractiveElements) {
        dom.minElementsReachedOnce = true;
      }
      domReady =
        snap.ok &&
        (cfg.dom.enabled
          ? dom.minElementsReachedOnce &&
            now - dom.lastMutationTime >= cfg.dom.stableMs
          : true);

      // Gate 3: Hydration complete (or not an SPA)
      // Requires successful snapshot
      hydrationComplete =
        snap.ok && checkHydrationComplete(cfg, hydration, now, debug);

      // Gate 4: Animations ready (or timed out)
      // Requires successful snapshot
      animationsReady =
        snap.ok && checkAnimationsReady(cfg, animation, now, debug);

      // Debug logging every 500ms
      if (debug && now - lastDebugLog >= 500) {
        lastDebugLog = now;
        const quietMs = network.firstQuietTime
          ? now - network.firstQuietTime
          : 0;
        const stableMs = now - dom.lastMutationTime;
        console.debug(
          `[PageReady] [${elapsed}ms] ` +
            `snap:${snap.ok ? "OK" : "NO"} ` +
            `net:${networkReady ? "OK" : "NO"}(pending=${network.pendingRequests.size},quiet=${quietMs}ms) ` +
            `dom:${domReady ? "OK" : "NO"}(stable=${stableMs}ms) ` +
            `hydration:${hydrationComplete ? "OK" : "NO"}(count=${hydration.currentCount},peak=${hydration.peakCount},settled=${hydration.settled}) ` +
            `anim:${animationsReady ? "OK" : "NO"}(running=${animation.runningCount},infinite=${animation.infiniteCount})` +
            (snap.debug
              ? ` content:(text=${snap.debug.textLength},nodes=${snap.debug.nodeCount})`
              : "")
        );
      }

      // All gates passed?
      if (networkReady && domReady && hydrationComplete && animationsReady) {
        if (cfg.timing.settlePeriodMs > 0) {
          await sleep(cfg.timing.settlePeriodMs);
        }
        const snapshot = config.captureSnapshot
          ? await captureSnapshot(page, debug)
          : undefined;
        return buildResult(
          "all_conditions_met",
          true,
          startTime,
          network,
          dom,
          hydration,
          animation,
          true,
          true,
          true,
          true,
          snapshot
        );
      }

      await sleep(cfg.timing.checkIntervalMs);
    }
  } catch (error) {
    if (debug) {
      console.error(`[PageReady] Page ready detection failed: ${error}`);
    }
    return buildResult(
      "error",
      false,
      startTime,
      network,
      dom,
      hydration,
      animation,
      networkReady,
      domReady,
      hydrationComplete,
      animationsReady
    );
  } finally {
    cleanupNetwork?.();
    if (observerInitialized) {
      await cleanupObserver(page).catch(() => {});
    }
  }
}

/**
 * Normalize config: pre-compile regexes, clamp values.
 */
function normalizeConfig(cfg: ReturnType<typeof resolvePageReadyConfig>): NormalizedConfig {
  const compiledIgnorePatterns: RegExp[] = [];
  for (const p of cfg.network.ignorePatterns) {
    try {
      compiledIgnorePatterns.push(new RegExp(p, "i"));
    } catch (e) {
      console.warn(`[PageReady] Invalid network ignore pattern "${p}": ${e}`);
    }
  }
  return { ...cfg, compiledIgnorePatterns };
}

/**
 * Single browser evaluate that returns all page signals.
 */
async function getPageSnapshot(
  page: Page,
  cfg: NormalizedConfig,
  includeDebug?: boolean
): Promise<PageSnapshot> {
  try {
    return await page.evaluate(
      ({ selector, includeDebug }) => {
        const win = window as unknown as PageReadyWindow;
        const body = document.body;

        // Interactive count with fallback for canvas/WebGL apps
        let interactiveCount = document.querySelectorAll(selector).length;
        if (interactiveCount === 0 && body) {
          const textLength = body.innerText.trim().length;
          const mediaCount = body.querySelectorAll(
            "canvas, svg, video, img"
          ).length;
          if (textLength > 100 || mediaCount > 0) interactiveCount = 1;
        }

        // Animation counts
        let runningAnimationCount = 0,
          infiniteAnimationCount = 0;
        for (const anim of document.getAnimations()) {
          if (anim.playState === "running") {
            runningAnimationCount++;
            const effect = anim.effect;
            if (effect && "getTiming" in effect) {
              const timing = (effect as KeyframeEffect).getTiming();
              if (timing.iterations === Infinity) infiniteAnimationCount++;
            }
          }
        }

        // Debug metrics
        const debug =
          includeDebug && body
            ? {
                textLength: body.innerText.length,
                nodeCount: body.querySelectorAll("*").length,
                bodyHeight: body.getBoundingClientRect().height,
              }
            : undefined;

        return {
          ok: true,
          interactiveCount,
          lastMutationTime: win.__pageReadyLastMutation ?? Date.now(),
          runningAnimationCount,
          infiniteAnimationCount,
          debug,
        };
      },
      { selector: cfg.dom.interactiveSelector, includeDebug }
    );
  } catch {
    // Return failed snapshot - caller must not use these values for gate checks
    return {
      ok: false,
      interactiveCount: 0,
      lastMutationTime: 0,
      runningAnimationCount: 0,
      infiniteAnimationCount: 0,
    };
  }
}

/**
 * Setup network request listeners.
 */
function setupNetworkListeners(
  page: Page,
  cfg: NormalizedConfig,
  state: NetworkState
): () => void {
  const shouldIgnore = (url: string) =>
    cfg.compiledIgnorePatterns.some((p) => p.test(url));

  const onRequest = (req: Request) => {
    if (!shouldIgnore(req.url())) {
      state.pendingRequests.add(req);
      state.firstQuietTime = null;
    }
  };

  const onDone = (req: Request) => {
    if (state.pendingRequests.delete(req)) {
      if (state.pendingRequests.size <= cfg.network.maxPendingRequests) {
        state.firstQuietTime ??= Date.now();
      }
    }
  };

  page.on("request", onRequest);
  page.on("requestfinished", onDone);
  page.on("requestfailed", onDone);

  return () => {
    page.off("request", onRequest);
    page.off("requestfinished", onDone);
    page.off("requestfailed", onDone);
  };
}

/**
 * Initialize DOM mutation observer.
 */
async function initMutationObserver(page: Page): Promise<number> {
  return page.evaluate(() => {
    const win = window as unknown as PageReadyWindow;
    const now = Date.now();
    win.__pageReadyLastMutation = now;

    const observer = new MutationObserver(() => {
      (window as unknown as PageReadyWindow).__pageReadyLastMutation =
        Date.now();
    });

    const target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }
    win.__pageReadyObserver = observer;
    return now;
  });
}

/**
 * Cleanup DOM mutation observer.
 */
async function cleanupObserver(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as unknown as PageReadyWindow;
    win.__pageReadyObserver?.disconnect();
    delete win.__pageReadyObserver;
    delete win.__pageReadyLastMutation;
  });
}

/**
 * Update hydration state from new element count.
 */
function updateHydrationState(
  state: HydrationState,
  count: number,
  cfg: NormalizedConfig,
  now: number,
  debug: boolean
): void {
  // First sample initializes peak
  if (state.peakCount === 0 && count > 0) {
    state.peakCount = count;
    state.lowestCount = count;
    state.recoveryTarget = Math.floor(count * cfg.hydration.recoveryThreshold);
  }

  // Track rate of change for settle detection
  const changeRate = Math.abs(count - state.currentCount);
  const threshold = Math.max(3, state.peakCount * 0.2);

  if (changeRate > threshold) {
    state.lastChangeAt = now;
    state.settled = false;
  } else if (state.lastChangeAt !== null) {
    state.settled = now - state.lastChangeAt >= cfg.hydration.settleMs;
  } else {
    state.settled = true;
  }

  state.currentCount = count;

  // Update peak before drop detected
  if (!state.sawDrop && count > state.peakCount) {
    state.peakCount = count;
    state.recoveryTarget = Math.floor(count * cfg.hydration.recoveryThreshold);
  }

  state.lowestCount = Math.min(state.lowestCount, count);

  // Detect drop
  if (!state.sawDrop && state.peakCount > 0) {
    if (count / state.peakCount < cfg.hydration.dropThreshold) {
      state.sawDrop = true;
      state.dropDetectedAt = now;
      if (debug) {
        console.debug(
          `[PageReady] Hydration drop: ${state.peakCount} -> ${count}`
        );
      }
    }
  }

  // Detect recovery
  if (state.sawDrop && !state.recovered) {
    if (
      count >= state.recoveryTarget &&
      count > state.lowestCount &&
      count >= cfg.dom.minInteractiveElements
    ) {
      state.recovered = true;
      state.recoveredAt = now;
      if (debug) {
        console.debug(`[PageReady] Hydration recovery: ${count} elements`);
      }
    }
  }
}

/**
 * Check network ready gate.
 */
function checkNetworkReady(
  cfg: NormalizedConfig,
  state: NetworkState,
  now: number
): boolean {
  if (!cfg.network.enabled) return true;
  if (state.pendingRequests.size > cfg.network.maxPendingRequests) return false;
  if (state.firstQuietTime === null) return false;
  return now - state.firstQuietTime >= cfg.network.quietPeriodMs;
}

/**
 * Check hydration complete gate.
 */
function checkHydrationComplete(
  cfg: NormalizedConfig,
  state: HydrationState,
  now: number,
  debug: boolean
): boolean {
  if (!cfg.hydration.enabled) return true;

  // No drop = not an SPA or fast hydration - just check settle
  if (!state.sawDrop) return state.settled;

  // Drop detected and recovered - check settle
  if (state.recovered) return state.settled;

  // Timeout waiting for recovery
  if (
    state.dropDetectedAt &&
    now - state.dropDetectedAt >= cfg.hydration.recoveryTimeoutMs
  ) {
    if (debug) {
      console.warn(
        `[PageReady] Hydration timeout after ${now - state.dropDetectedAt}ms`
      );
    }
    return true;
  }

  return false;
}

/**
 * Check animations ready gate.
 */
function checkAnimationsReady(
  cfg: NormalizedConfig,
  state: AnimationState,
  now: number,
  debug: boolean
): boolean {
  if (!cfg.animations.enabled) return true;

  const finiteRunning = state.runningCount - state.infiniteCount;

  if (finiteRunning === 0) {
    state.firstFiniteTime = null;
    if (state.infiniteCount === 0) return true;

    // Grace period for infinite animations
    state.firstInfiniteTime ??= now;
    return now - state.firstInfiniteTime >= cfg.animations.infiniteGracePeriodMs;
  }

  // Finite animations running - track and enforce timeout
  state.firstFiniteTime ??= now;
  state.firstInfiniteTime = null;

  if (now - state.firstFiniteTime >= cfg.animations.maxAnimationWaitMs) {
    if (debug) {
      console.warn(
        `[PageReady] Animation timeout: ${finiteRunning} finite animations still running`
      );
    }
    return true;
  }

  return false;
}

/**
 * Capture HTML snapshot.
 */
async function captureSnapshot(
  page: Page,
  debug: boolean
): Promise<string | undefined> {
  try {
    const html = await page.content();
    if (debug) {
      console.debug(`[PageReady] Captured snapshot (${html.length} bytes)`);
    }
    return html;
  } catch (e) {
    if (debug) {
      console.warn(`[PageReady] Failed to capture snapshot: ${e}`);
    }
    return undefined;
  }
}

/**
 * Build result object.
 */
function buildResult(
  reason: "all_conditions_met" | "timeout" | "error",
  ready: boolean,
  startTime: number,
  network: NetworkState,
  dom: DomState,
  hydration: HydrationState,
  animation: AnimationState,
  networkReady: boolean,
  domReady: boolean,
  hydrationComplete: boolean,
  animationsReady: boolean,
  snapshot?: string
): PageReadyResult {
  const now = Date.now();
  return {
    ready,
    timeMs: now - startTime,
    reason,
    conditions: {
      networkReady,
      domReady,
      hydrationComplete,
      animationsReady,
    },
    metrics: {
      pendingRequestCount: network.pendingRequests.size,
      interactiveElementCount: hydration.currentCount,
      runningAnimationCount: animation.runningCount,
    },
    hydrationDetected: hydration.sawDrop,
    snapshot,
    debugInfo: {
      networkQuietSinceMs: network.firstQuietTime
        ? now - network.firstQuietTime
        : 0,
      domStableSinceMs: now - dom.lastMutationTime,
      hydrationStartedAtMs: hydration.dropDetectedAt,
      hydrationRecoveredAtMs: hydration.recoveredAt,
      peakInteractiveCount: hydration.peakCount,
      lowestInteractiveCount:
        hydration.lowestCount === Infinity ? 0 : hydration.lowestCount,
      recoveryTarget: hydration.recoveryTarget,
    },
  };
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
