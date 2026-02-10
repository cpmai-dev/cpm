import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InstalledPackage } from "../types.js";

vi.mock("../adapters/index.js", () => ({
  getAllAdapters: vi.fn(),
}));

vi.mock("../commands/ui/index.js", () => ({
  getTypeColor: vi.fn(() => (s: string) => s),
  SEMANTIC_COLORS: {
    dim: (s: string) => s,
    highlight: (s: string) => s,
    success: (s: string) => s,
    error: (s: string) => s,
    warning: (s: string) => s,
  },
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    newline: vi.fn(),
    isQuiet: vi.fn(() => false),
  },
}));

// Mock chalk to avoid color escape codes in assertions
vi.mock("chalk", () => ({
  default: {
    bold: (s: string) => s,
    dim: (s: string) => s,
  },
}));

import { listCommand } from "../commands/list.js";
import { getAllAdapters } from "../adapters/index.js";
import { logger } from "../utils/logger.js";

const mockGetAll = vi.mocked(getAllAdapters);

function makeAdapter(packages: InstalledPackage[]) {
  return {
    platform: "claude-code" as const,
    displayName: "Claude Code",
    install: vi.fn(),
    uninstall: vi.fn(),
    listInstalled: vi.fn().mockResolvedValue(packages),
    ensureDirs: vi.fn(),
    isAvailable: vi.fn(),
  };
}

describe("listCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show empty message when no packages installed", async () => {
    mockGetAll.mockReturnValue([makeAdapter([])]);

    await listCommand();

    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      "No packages installed",
    );
  });

  it("should list packages from all adapters", async () => {
    const pkg1: InstalledPackage = {
      name: "@cpm/rules-a",
      folderName: "rules-a",
      type: "rules",
      version: "1.0.0",
      path: "/rules/a",
      platform: "claude-code",
    };
    const pkg2: InstalledPackage = {
      name: "@cpm/mcp-b",
      folderName: "mcp-b",
      type: "mcp",
      path: "/mcp/b",
      platform: "cursor",
    };

    mockGetAll.mockReturnValue([makeAdapter([pkg1]), makeAdapter([pkg2])]);

    await listCommand();

    expect(vi.mocked(logger.log)).toHaveBeenCalledWith(
      expect.stringContaining("2"),
    );
  });

  it("should handle errors gracefully", async () => {
    mockGetAll.mockImplementation(() => {
      throw new Error("Adapter failure");
    });

    await listCommand();

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      "Failed to list packages",
    );
  });
});
