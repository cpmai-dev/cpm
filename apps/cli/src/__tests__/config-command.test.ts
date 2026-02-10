import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";

let tmpDir: string;

vi.mock("os", async () => {
  const actual = await vi.importActual("os");
  return {
    ...actual,
    default: {
      ...(actual as typeof os),
      homedir: () => tmpDir,
    },
  };
});

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

import { configCommand } from "../commands/config.js";
import { logger } from "../utils/logger.js";

describe("configCommand", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpm-cfg-cmd-test-"));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe("set platform", () => {
    it("should save valid platform to config", async () => {
      await configCommand("set", "platform", "cursor");

      expect(vi.mocked(logger.success)).toHaveBeenCalledWith(
        expect.stringContaining("cursor"),
      );

      const configPath = path.join(tmpDir, ".cpm", "config.json");
      const config = await fs.readJson(configPath);
      expect(config.defaultPlatform).toBe("cursor");
    });

    it("should reject invalid platform", async () => {
      await configCommand("set", "platform", "nonexistent");

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining("Invalid platform"),
      );
    });

    it("should error when value is missing", async () => {
      await configCommand("set", "platform");

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining("Missing value"),
      );
    });
  });

  describe("get platform", () => {
    it("should show configured platform", async () => {
      const configDir = path.join(tmpDir, ".cpm");
      await fs.ensureDir(configDir);
      await fs.writeJson(path.join(configDir, "config.json"), {
        defaultPlatform: "claude-code",
      });

      await configCommand("get", "platform");

      expect(vi.mocked(logger.log)).toHaveBeenCalledWith("claude-code");
    });

    it("should warn when no platform configured", async () => {
      await configCommand("get", "platform");

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        "No default platform configured",
      );
    });

    it("should warn when stored platform is no longer valid", async () => {
      const configDir = path.join(tmpDir, ".cpm");
      await fs.ensureDir(configDir);
      await fs.writeJson(path.join(configDir, "config.json"), {
        defaultPlatform: "deprecated-ide",
      });

      await configCommand("get", "platform");

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining("no longer valid"),
      );
    });
  });

  describe("invalid inputs", () => {
    it("should reject unknown config key", async () => {
      await configCommand("set", "unknown-key", "value");

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining("Unknown config key"),
      );
    });

    it("should reject unknown action", async () => {
      await configCommand("delete", "platform");

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining("Unknown action"),
      );
    });
  });
});
