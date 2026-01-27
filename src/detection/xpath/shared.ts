/**
 * Shared XPath utility functions.
 *
 * These are the canonical implementations used by both:
 * - Server-side utilities (generator.ts)
 * - Browser-side code (browser/* bundled via Bun)
 *
 * SECURITY NOTE: escapeXPathAttribute is critical for XPath injection prevention.
 * All user-provided strings must be escaped before being embedded in XPath expressions.
 */

/**
 * Escape attribute values for use in XPath expressions.
 * Handles values containing single quotes, double quotes, or both.
 *
 * SECURITY: This function is critical for preventing XPath injection attacks.
 * User-provided values can contain quotes that would break out of the string context.
 * This function ensures values are always treated as literal strings by:
 * 1. Using double quotes for strings without double quotes
 * 2. Using single quotes for strings with double quotes but no single quotes
 * 3. Using XPath concat() for strings with both quote types
 *
 * Examples:
 * - "simple" -> '"simple"'
 * - "with'quote" -> '"with\'quote"'
 * - 'with"quote' -> "'with\"quote'"
 * - "it's \"complex\"" -> concat("it's ", '"', "complex", '"')
 */
export function escapeXPathAttribute(value: string): string {
  if (!value.includes('"')) {
    return '"' + value + '"';
  }
  if (!value.includes("'")) {
    return "'" + value + "'";
  }

  // Contains both quotes - use concat()
  // Split by double quotes and interleave with single-quoted double quote character
  const parts = value.split('"');
  const concatParts: string[] = [];
  const dblQuote = "'" + '"' + "'"; // XPath: '"' wrapped in single quotes

  for (let i = 0; i < parts.length; i++) {
    // Add non-empty string parts wrapped in double quotes
    if (parts[i].length > 0) {
      concatParts.push('"' + parts[i] + '"');
    }
    // Add the double quote character between original parts (not after the last one)
    if (i < parts.length - 1) {
      concatParts.push(dblQuote);
    }
  }

  return "concat(" + concatParts.join(", ") + ")";
}

/**
 * Safely join a scope prefix with a selector suffix.
 *
 * Handles:
 * - Empty prefix: returns `//suffix`
 * - Simple prefix (e.g., `//header`): returns `//header//suffix`
 * - Union prefix (e.g., `//div | //main`): wraps it: `(//div | //main)//suffix`
 * - Already grouped prefix (e.g., `(//main)[2]`): returns `(//main)[2]//suffix`
 */
export function scopeXPath(prefix: string, suffix: string): string {
  // Remove any leading // from suffix (strategies should not include it, but be safe)
  const cleanSuffix = suffix.replace(/^\/\//, "");

  if (!prefix) {
    return "//" + cleanSuffix;
  }

  // If prefix contains union operator and isn't already wrapped, wrap it.
  // The union operator `|` outside of strings would create operator precedence issues.
  if (prefix.includes("|") && !prefix.startsWith("(")) {
    return "(" + prefix + ")//" + cleanSuffix;
  }

  return prefix + "//" + cleanSuffix;
}

/**
 * Query parameter keys that indicate unstable/dynamic URLs.
 * Key-based detection only - value patterns cause too many false positives.
 */
export const DYNAMIC_QUERY_KEYS = [
  // Session and auth tokens
  "session",
  "token",
  "auth",
  "sid",
  "jwt",
  "bearer",
  "access_token",
  "refresh_token",
  // CSRF tokens
  "csrf",
  "_csrf",
  "_token",
  "nonce",
  "authenticity_token",
  // Timestamps and cache busters
  "_t",
  "timestamp",
  "ts",
  "_", // jQuery cache buster
  "nocache",
  "cb",
  "cachebust",
  // Note: 't' is handled specially below (only rejected with timestamp-like values)
  // OAuth/OIDC state params (change per flow)
  "state",
  "code",
  // Known tracking parameters (change per session/campaign)
  "fbclid",
  "gclid",
  "msclkid",
  "dclid",
  "_ga",
  "_gl",
  // Google/Apple/Yahoo click IDs
  "gbraid", // Google Ads (iOS)
  "wbraid", // Google Ads (web-to-app)
  "yclid", // Yandex click ID
] as const;

/**
 * Patterns for keys that are dynamic when they match (prefix patterns).
 * Separate from exact matches to handle utm_* family.
 */
export const DYNAMIC_KEY_PREFIXES = ["utm_", "_ga_", "_gl_"] as const;

/**
 * Check if a URL contains query parameters that indicate instability.
 * Uses key-based detection only - value patterns cause too many false positives.
 */
export function isDynamicUrl(
  url: string,
  customDenylist: readonly string[] = [],
): boolean {
  // No query string - not dynamic
  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) {
    return false;
  }

  const queryPart = url.slice(queryIndex + 1);
  if (!queryPart) {
    return false;
  }

  // Parse query string manually (URLSearchParams not available in all contexts)
  // Split on & and extract keys
  const params = queryPart.split("&");

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const eqIndex = param.indexOf("=");
    // Handle both "key=value" and bare "key"
    const key = eqIndex === -1 ? param : param.slice(0, eqIndex);

    // Decode key, falling back to raw key on malformed encoding
    let decodedKey: string;
    try {
      decodedKey = decodeURIComponent(key).toLowerCase();
    } catch {
      decodedKey = key.toLowerCase();
    }

    // Check exact matches
    if (
      DYNAMIC_QUERY_KEYS.includes(
        decodedKey as (typeof DYNAMIC_QUERY_KEYS)[number],
      )
    ) {
      return true;
    }

    // Check custom denylist
    if (customDenylist.some((k) => k.toLowerCase() === decodedKey)) {
      return true;
    }

    // Check prefix patterns (utm_*, etc.)
    for (let j = 0; j < DYNAMIC_KEY_PREFIXES.length; j++) {
      if (decodedKey.startsWith(DYNAMIC_KEY_PREFIXES[j])) {
        return true;
      }
    }

    // Special case: 't' param with timestamp-like value (8+ digits)
    if (decodedKey === "t" && eqIndex !== -1) {
      const value = param.slice(eqIndex + 1);
      if (/^\d{8,}$/.test(value)) {
        return true;
      }
    }
  }

  return false;
}
