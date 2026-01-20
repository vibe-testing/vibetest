import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, writeFile, rm, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import {
  findGitRoot,
  loadConfig,
  tryLoadEnvFile,
} from "./config-loader.service";

describe("config-loader.service", () => {
  describe("findGitRoot", () => {
    let originalCwd: string;
    let tempDir: string;

    beforeEach(async () => {
      originalCwd = process.cwd();
      tempDir = await mkdtemp(join(tmpdir(), "vibetest-test-"));
    });

    afterEach(async () => {
      process.chdir(originalCwd);
      await rm(tempDir, { recursive: true, force: true });
    });

    it("should return the directory containing .git", async () => {
      await mkdir(join(tempDir, ".git"));
      process.chdir(tempDir);

      const result = findGitRoot();

      expect(result).toBe(tempDir);
    });

    it("should find .git in parent directory", async () => {
      await mkdir(join(tempDir, ".git"));
      const subDir = join(tempDir, "src", "components");
      await mkdir(subDir, { recursive: true });
      process.chdir(subDir);

      const result = findGitRoot();

      expect(result).toBe(tempDir);
    });

    it("should return null when no .git found", async () => {
      process.chdir(tempDir);

      const result = findGitRoot();

      expect(result).toBeNull();
    });
  });

  describe("tryLoadEnvFile", () => {
    let tempDir: string;
    const originalEnv: Record<string, string | undefined> = {};

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "vibetest-test-"));
      // Save env vars we'll be modifying
      originalEnv.TEST_VAR = process.env.TEST_VAR;
      originalEnv.EXISTING_VAR = process.env.EXISTING_VAR;
      originalEnv.QUOTED_VAR = process.env.QUOTED_VAR;
      // Clear them
      delete process.env.TEST_VAR;
      delete process.env.EXISTING_VAR;
      delete process.env.QUOTED_VAR;
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
      // Restore original env
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });

    it("should load environment variables from file", async () => {
      const envFile = join(tempDir, ".env");
      await writeFile(envFile, "TEST_VAR=hello_world");

      await tryLoadEnvFile(envFile);

      expect(process.env.TEST_VAR).toBe("hello_world");
    });

    it("should skip comments", async () => {
      const envFile = join(tempDir, ".env");
      await writeFile(envFile, "# This is a comment\nTEST_VAR=value");

      await tryLoadEnvFile(envFile);

      expect(process.env.TEST_VAR).toBe("value");
    });

    it("should skip empty lines", async () => {
      const envFile = join(tempDir, ".env");
      await writeFile(envFile, "\n\nTEST_VAR=value\n\n");

      await tryLoadEnvFile(envFile);

      expect(process.env.TEST_VAR).toBe("value");
    });

    it("should not overwrite existing env vars", async () => {
      process.env.EXISTING_VAR = "original";
      const envFile = join(tempDir, ".env");
      await writeFile(envFile, "EXISTING_VAR=new_value");

      await tryLoadEnvFile(envFile);

      expect(process.env.EXISTING_VAR).toBe("original");
    });

    it("should strip quotes from values", async () => {
      const envFile = join(tempDir, ".env");
      await writeFile(envFile, 'QUOTED_VAR="quoted_value"');

      await tryLoadEnvFile(envFile);

      expect(process.env.QUOTED_VAR).toBe("quoted_value");
    });

    it("should handle single quotes", async () => {
      const envFile = join(tempDir, ".env");
      await writeFile(envFile, "QUOTED_VAR='single_quoted'");

      await tryLoadEnvFile(envFile);

      expect(process.env.QUOTED_VAR).toBe("single_quoted");
    });

    it("should do nothing for non-existent file", async () => {
      const envFile = join(tempDir, "nonexistent.env");

      await tryLoadEnvFile(envFile);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should skip lines without equals sign", async () => {
      const envFile = join(tempDir, ".env");
      await writeFile(envFile, "INVALID_LINE\nTEST_VAR=valid");

      await tryLoadEnvFile(envFile);

      expect(process.env.TEST_VAR).toBe("valid");
      expect(process.env.INVALID_LINE).toBeUndefined();
    });

    it("should handle values with equals signs", async () => {
      const envFile = join(tempDir, ".env");
      await writeFile(envFile, "TEST_VAR=value=with=equals");

      await tryLoadEnvFile(envFile);

      expect(process.env.TEST_VAR).toBe("value=with=equals");
    });
  });

  describe("loadConfig", () => {
    const originalEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      // Save and clear relevant env vars
      const keysToSave = [
        "VIBETEST_LLM_PROVIDER",
        "VIBETEST_MODEL",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
      ];
      for (const key of keysToSave) {
        originalEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(() => {
      // Restore original env
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });

    it("should return default anthropic provider when no env set", async () => {
      const config = await loadConfig();

      expect(config.llmProvider).toBe("anthropic");
    });

    it("should use VIBETEST_LLM_PROVIDER from env", async () => {
      process.env.VIBETEST_LLM_PROVIDER = "openai";

      const config = await loadConfig();

      expect(config.llmProvider).toBe("openai");
    });

    it("should load API keys from env", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.OPENAI_API_KEY = "sk-openai-test";

      const config = await loadConfig();

      expect(config.anthropicApiKey).toBe("sk-ant-test");
      expect(config.openaiApiKey).toBe("sk-openai-test");
    });

    it("should load model from env", async () => {
      process.env.VIBETEST_MODEL = "claude-opus-4-20250514";

      const config = await loadConfig();

      expect(config.model).toBe("claude-opus-4-20250514");
    });

    it("should return undefined for unset optional fields", async () => {
      const config = await loadConfig();

      expect(config.model).toBeUndefined();
      expect(config.anthropicApiKey).toBeUndefined();
      expect(config.openaiApiKey).toBeUndefined();
    });
  });
});
