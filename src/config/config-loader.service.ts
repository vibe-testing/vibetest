import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

import type { VibetestConfig } from "./config.interface.js";

export function findGitRoot(): string | null {
  let dir = process.cwd();
  while (dir !== "/") {
    if (existsSync(join(dir, ".git"))) {
      return dir;
    }
    dir = join(dir, "..");
  }
  return null;
}

/**
 * Load config with XDG-compliant precedence:
 * 1. Local .env (cwd)
 * 2. Git root .env
 * 3. ~/.config/vibetest/config
 * 4. Environment variables
 */
export async function loadConfig(): Promise<VibetestConfig> {
  // Try local .env first
  await tryLoadEnvFile(join(process.cwd(), ".env"));

  // Try git root .env
  const gitRoot = findGitRoot();
  if (gitRoot) {
    await tryLoadEnvFile(join(gitRoot, ".env"));
  }

  // Try XDG config
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  await tryLoadEnvFile(join(xdgConfig, "vibetest", "config"));

  // Build config from environment
  return {
    llmProvider:
      (process.env.VIBETEST_LLM_PROVIDER as "anthropic" | "openai") ||
      "anthropic",
    model: process.env.VIBETEST_MODEL,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  };
}

export async function tryLoadEnvFile(path: string): Promise<void> {
  if (!existsSync(path)) return;

  const content = await readFile(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
