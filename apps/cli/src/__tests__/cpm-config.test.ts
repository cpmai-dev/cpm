import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";

// Mock the config dir to use a temp directory
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

import {
  readCpmConfig,
  writeCpmConfig,
  getDefaultPlatform,
  getCpmConfigPath,
  isValidConfigKey,
} from "../utils/cpm-config.js";

describe("cpm-config", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpm-config-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe("readCpmConfig", () => {
    it("should return empty config when file does not exist", async () => {
      const config = await readCpmConfig();
      expect(config).toEqual({});
    });

    it("should read valid config", async () => {
      const configDir = path.join(tmpDir, ".cpm");
      await fs.ensureDir(configDir);
      await fs.writeJson(path.join(configDir, "config.json"), {
        defaultPlatform: "cursor",
      });

      const config = await readCpmConfig();
      expect(config.defaultPlatform).toBe("cursor");
    });

    it("should only carry forward known string fields", async () => {
      const configDir = path.join(tmpDir, ".cpm");
      await fs.ensureDir(configDir);
      await fs.writeJson(path.join(configDir, "config.json"), {
        defaultPlatform: "claude-code",
        unknownField: "should-be-stripped",
        malicious: { nested: true },
      });

      const config = await readCpmConfig();
      expect(config).toEqual({ defaultPlatform: "claude-code" });
      expect((config as Record<string, unknown>).unknownField).toBeUndefined();
      expect((config as Record<string, unknown>).malicious).toBeUndefined();
    });

    it("should reject non-string defaultPlatform", async () => {
      const configDir = path.join(tmpDir, ".cpm");
      await fs.ensureDir(configDir);
      await fs.writeJson(path.join(configDir, "config.json"), {
        defaultPlatform: 42,
      });

      const config = await readCpmConfig();
      expect(config).toEqual({});
    });

    it("should return empty config on corrupted JSON", async () => {
      const configDir = path.join(tmpDir, ".cpm");
      await fs.ensureDir(configDir);
      await fs.writeFile(
        path.join(configDir, "config.json"),
        "not valid json!!!",
      );

      const config = await readCpmConfig();
      expect(config).toEqual({});
    });
  });

  describe("writeCpmConfig", () => {
    it("should create config dir and write JSON", async () => {
      await writeCpmConfig({ defaultPlatform: "cursor" });

      const configPath = getCpmConfigPath();
      expect(await fs.pathExists(configPath)).toBe(true);

      const raw = await fs.readJson(configPath);
      expect(raw.defaultPlatform).toBe("cursor");
    });

    it("should overwrite existing config immutably", async () => {
      await writeCpmConfig({ defaultPlatform: "claude-code" });
      await writeCpmConfig({ defaultPlatform: "cursor" });

      const configPath = getCpmConfigPath();
      const raw = await fs.readJson(configPath);
      expect(raw.defaultPlatform).toBe("cursor");
    });
  });

  describe("getDefaultPlatform", () => {
    it("should return undefined when no config exists", async () => {
      const platform = await getDefaultPlatform();
      expect(platform).toBeUndefined();
    });

    it("should return valid platform from config", async () => {
      await writeCpmConfig({ defaultPlatform: "cursor" });

      const platform = await getDefaultPlatform();
      expect(platform).toBe("cursor");
    });

    it("should return undefined for invalid platform in config", async () => {
      const configDir = path.join(tmpDir, ".cpm");
      await fs.ensureDir(configDir);
      await fs.writeJson(path.join(configDir, "config.json"), {
        defaultPlatform: "nonexistent-ide",
      });

      const platform = await getDefaultPlatform();
      expect(platform).toBeUndefined();
    });
  });

  describe("isValidConfigKey", () => {
    it("should accept 'platform'", () => {
      expect(isValidConfigKey("platform")).toBe(true);
    });

    it("should reject unknown keys", () => {
      expect(isValidConfigKey("unknown")).toBe(false);
      expect(isValidConfigKey("")).toBe(false);
      expect(isValidConfigKey("defaultPlatform")).toBe(false);
    });
  });
});
