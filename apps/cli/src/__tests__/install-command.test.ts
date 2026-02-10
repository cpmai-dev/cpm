import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RegistryPackage, PackageManifest } from "../types.js";

// Mock dependencies before imports
vi.mock("../utils/registry.js", () => ({
  registry: {
    getPackage: vi.fn(),
  },
}));

vi.mock("../utils/downloader.js", () => ({
  downloadPackage: vi.fn(),
  cleanupTempDir: vi.fn(),
}));

vi.mock("../adapters/index.js", () => ({
  getAdapter: vi.fn(),
  getAllAdapters: vi.fn(() => []),
}));

vi.mock("../utils/cpm-config.js", () => ({
  getDefaultPlatform: vi.fn(),
  readCpmConfig: vi.fn(() => ({})),
  writeCpmConfig: vi.fn(),
  getCpmConfigDir: vi.fn(() => "/tmp"),
  getCpmConfigPath: vi.fn(() => "/tmp/config.json"),
  isValidConfigKey: vi.fn(),
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
  formatCreatedFiles: vi.fn(() => []),
  formatRemovedFiles: vi.fn(() => []),
  formatUsageHints: vi.fn(() => []),
  formatSeparator: vi.fn(() => "---"),
  formatPackageEntry: vi.fn(() => []),
  formatPackageMetadata: vi.fn(() => ""),
  getTypeColor: vi.fn(() => (s: string) => s),
  SEMANTIC_COLORS: {
    dim: (s: string) => s,
    highlight: (s: string) => s,
    success: (s: string) => s,
    error: (s: string) => s,
    warning: (s: string) => s,
    bold: (s: string) => s,
    info: (s: string) => s,
    version: (s: string) => s,
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

import { installCommand } from "../commands/install.js";
import { registry } from "../utils/registry.js";
import { downloadPackage, cleanupTempDir } from "../utils/downloader.js";
import { getAdapter } from "../adapters/index.js";
import { getDefaultPlatform } from "../utils/cpm-config.js";
import { logger } from "../utils/logger.js";

const mockRegistry = vi.mocked(registry);
const mockDownload = vi.mocked(downloadPackage);
const mockCleanup = vi.mocked(cleanupTempDir);
const mockGetAdapter = vi.mocked(getAdapter);
const mockGetDefault = vi.mocked(getDefaultPlatform);

const testPkg: RegistryPackage = {
  name: "@cpm/test-rules",
  version: "1.0.0",
  description: "Test rules",
  author: "tester",
  type: "rules",
  platforms: ["claude-code", "cursor"],
};

const testManifest: PackageManifest = {
  name: "@cpm/test-rules",
  version: "1.0.0",
  description: "Test rules",
  type: "rules",
  universal: { rules: "Use strict mode" },
};

describe("installCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDefault.mockResolvedValue("claude-code");
  });

  it("should reject invalid package name", async () => {
    await installCommand("../malicious", {});
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining("Invalid package name"),
    );
  });

  it("should error when no platform specified and no default", async () => {
    mockGetDefault.mockResolvedValue(undefined);
    await installCommand("test-rules", {});
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      "No platform specified.",
    );
  });

  it("should error for invalid platform", async () => {
    await installCommand("test-rules", { platform: "nonexistent" });
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining("Invalid platform"),
    );
  });

  it("should show not found when package missing from registry", async () => {
    mockRegistry.getPackage.mockResolvedValue(null);
    await installCommand("test-rules", {});
    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining("not found"),
    );
  });

  it("should show error when download fails", async () => {
    mockRegistry.getPackage.mockResolvedValue(testPkg);
    mockDownload.mockResolvedValue({
      success: false,
      error: "Network error",
    });

    await installCommand("test-rules", {});
    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining("Failed to download"),
    );
  });

  it("should install successfully", async () => {
    mockRegistry.getPackage.mockResolvedValue(testPkg);
    mockDownload.mockResolvedValue({
      success: true,
      manifest: testManifest,
      tempDir: "/tmp/test",
    });
    mockGetAdapter.mockReturnValue({
      platform: "claude-code",
      displayName: "Claude Code",
      install: vi.fn().mockResolvedValue({
        success: true,
        platform: "claude-code",
        filesWritten: ["/home/.claude/rules/test.md"],
      }),
      uninstall: vi.fn(),
      listInstalled: vi.fn(),
      ensureDirs: vi.fn(),
      isAvailable: vi.fn(),
    });

    await installCommand("test-rules", {});
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it("should always clean up temp directory", async () => {
    mockRegistry.getPackage.mockResolvedValue(testPkg);
    mockDownload.mockResolvedValue({
      success: true,
      manifest: testManifest,
      tempDir: "/tmp/cleanup-test",
    });
    mockGetAdapter.mockReturnValue({
      platform: "claude-code",
      displayName: "Claude Code",
      install: vi.fn().mockRejectedValue(new Error("Install failed")),
      uninstall: vi.fn(),
      listInstalled: vi.fn(),
      ensureDirs: vi.fn(),
      isAvailable: vi.fn(),
    });

    await installCommand("test-rules", {});
    expect(mockCleanup).toHaveBeenCalledWith("/tmp/cleanup-test");
  });

  it("should warn about platform incompatibility", async () => {
    const skillPkg: RegistryPackage = {
      ...testPkg,
      type: "skill",
      platforms: ["claude-code"],
    };
    mockRegistry.getPackage.mockResolvedValue(skillPkg);
    mockDownload.mockResolvedValue({
      success: true,
      manifest: {
        ...testManifest,
        type: "skill",
        skill: { command: "/test", description: "Test" },
      } as PackageManifest,
      tempDir: "/tmp/test",
    });
    mockGetAdapter.mockReturnValue({
      platform: "cursor",
      displayName: "Cursor",
      install: vi.fn().mockResolvedValue({
        success: true,
        platform: "cursor",
        filesWritten: [],
      }),
      uninstall: vi.fn(),
      listInstalled: vi.fn(),
      ensureDirs: vi.fn(),
      isAvailable: vi.fn(),
    });

    await installCommand("test-skill", { platform: "cursor" });
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("May not work on"),
    );
  });
});
