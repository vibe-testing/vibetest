import { describe, it, expect } from "bun:test";
import { spawnSync } from "child_process";

describe("CLI", () => {
  it("shows help with --help flag", () => {
    const result = spawnSync("bun", ["run", "src/index.ts", "--help"], {
      encoding: "utf-8",
    });
    expect(result.stdout).toContain("vibetest");
    expect(result.stdout).toContain("explore");
    expect(result.stdout).toContain("generate");
    expect(result.stdout).toContain("diff");
  });

  it("shows version with --version flag", () => {
    const result = spawnSync("bun", ["run", "src/index.ts", "--version"], {
      encoding: "utf-8",
    });
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it("explore command shows help", () => {
    const result = spawnSync("bun", ["run", "src/index.ts", "explore", "--help"], {
      encoding: "utf-8",
    });
    expect(result.stdout).toContain("<url>");
    expect(result.stdout).toContain("--depth");
    expect(result.stdout).toContain("--output");
  });
});
