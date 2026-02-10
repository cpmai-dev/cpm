import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../adapters/index.js", () => ({
  getAllAdapters: vi.fn(),
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
  spinnerText: vi.fn((...args: string[]) => args.join(" ")),
  successText: vi.fn((...args: string[]) => args.join(" ")),
  failText: vi.fn((...args: string[]) => args.join(" ")),
  formatRemovedFiles: vi.fn(() => ["  - file.md"]),
  SEMANTIC_COLORS: {
    dim: (s: string) => s,
    highlight: (s: string) => s,
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

import { uninstallCommand } from "../commands/uninstall.js";
import { getAllAdapters } from "../adapters/index.js";

const mockGetAll = vi.mocked(getAllAdapters);

function makeAdapter(uninstallResult: {
  success: boolean;
  filesWritten: string[];
}) {
  return {
    platform: "claude-code" as const,
    displayName: "Claude Code",
    install: vi.fn(),
    uninstall: vi.fn().mockResolvedValue({
      ...uninstallResult,
      platform: "claude-code",
    }),
    listInstalled: vi.fn(),
    ensureDirs: vi.fn(),
    isAvailable: vi.fn(),
  };
}

describe("uninstallCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should uninstall successfully and show removed files", async () => {
    mockGetAll.mockReturnValue([
      makeAdapter({ success: true, filesWritten: ["/rules/test.md"] }),
    ]);

    await uninstallCommand("test-rules");

    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it("should warn when package not found on any platform", async () => {
    mockGetAll.mockReturnValue([
      makeAdapter({ success: true, filesWritten: [] }),
    ]);

    await uninstallCommand("nonexistent");

    expect(mockSpinner.warn).toHaveBeenCalledWith(
      expect.stringContaining("not found"),
    );
  });

  it("should reject invalid package name", async () => {
    // ".." sanitizes to empty string, which throws
    await uninstallCommand("..");

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining("Invalid package name"),
    );
  });

  it("should handle adapter errors gracefully", async () => {
    const adapter = makeAdapter({ success: false, filesWritten: [] });
    adapter.uninstall.mockRejectedValue(new Error("Adapter crash"));
    mockGetAll.mockReturnValue([adapter]);

    await uninstallCommand("test-rules");

    // Should not throw, should show "not found" since no files removed
    expect(mockSpinner.warn).toHaveBeenCalled();
  });
});
