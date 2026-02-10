import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../utils/registry.js", () => ({
  registry: {
    search: vi.fn(),
  },
}));

const mockSpinner = {
  update: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
  stop: vi.fn(),
  warn: vi.fn(),
};

vi.mock("../commands/ui/index.js", () => ({
  createSpinner: vi.fn(() => mockSpinner),
  formatPackageEntry: vi.fn(() => ["  line1"]),
  formatSeparator: vi.fn(() => "---"),
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

import { searchCommand } from "../commands/search.js";
import { registry } from "../utils/registry.js";
import { logger } from "../utils/logger.js";

const mockSearch = vi.mocked(registry.search);

describe("searchCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display results on successful search", async () => {
    mockSearch.mockResolvedValue({
      packages: [
        {
          name: "@cpm/test",
          version: "1.0.0",
          description: "Test",
          author: "tester",
        },
      ],
      total: 1,
    });

    await searchCommand("test", {});

    expect(mockSpinner.stop).toHaveBeenCalled();
    expect(vi.mocked(logger.log)).toHaveBeenCalledWith(
      expect.stringContaining("1 package(s)"),
    );
  });

  it("should show no results message", async () => {
    mockSearch.mockResolvedValue({ packages: [], total: 0 });

    await searchCommand("nonexistent", {});

    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("No packages found"),
    );
  });

  it("should pass type filter to registry", async () => {
    mockSearch.mockResolvedValue({ packages: [], total: 0 });

    await searchCommand("test", { type: "rules" });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "rules" }),
    );
  });

  it("should pass platform filter to registry", async () => {
    mockSearch.mockResolvedValue({ packages: [], total: 0 });

    await searchCommand("test", { platform: "cursor" });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ platform: "cursor" }),
    );
  });

  it("should mention platform in no-results message when filtered", async () => {
    mockSearch.mockResolvedValue({ packages: [], total: 0 });

    await searchCommand("test", { platform: "cursor" });

    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("cursor"),
    );
  });

  it("should handle registry errors", async () => {
    mockSearch.mockRejectedValue(new Error("Network error"));

    await searchCommand("test", {});

    expect(mockSpinner.fail).toHaveBeenCalledWith("Search failed");
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith("Network error");
  });
});
