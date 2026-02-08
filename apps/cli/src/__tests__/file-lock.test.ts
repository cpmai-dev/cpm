import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { acquireLock, withFileLock } from "../utils/file-lock.js";

describe("file-lock", () => {
  let tmpDir: string;
  let testFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpm-lock-test-"));
    testFile = path.join(tmpDir, "test.json");
    await fs.writeJson(testFile, { test: true });
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe("acquireLock", () => {
    it("should create a .lock file", async () => {
      const release = await acquireLock(testFile);
      const lockPath = `${testFile}.lock`;

      expect(await fs.pathExists(lockPath)).toBe(true);

      await release();
      expect(await fs.pathExists(lockPath)).toBe(false);
    });

    it("should release lock on cleanup", async () => {
      const release = await acquireLock(testFile);
      await release();

      // Should be able to acquire again
      const release2 = await acquireLock(testFile);
      await release2();
    });

    it("should handle stale locks", async () => {
      const lockPath = `${testFile}.lock`;
      // Create a stale lock (timestamp from 20 seconds ago)
      await fs.writeFile(lockPath, String(Date.now() - 20_000));

      // Should acquire despite stale lock
      const release = await acquireLock(testFile);
      await release();
    });
  });

  describe("withFileLock", () => {
    it("should execute function while holding lock", async () => {
      const result = await withFileLock(testFile, async () => {
        const lockPath = `${testFile}.lock`;
        expect(await fs.pathExists(lockPath)).toBe(true);
        return 42;
      });

      expect(result).toBe(42);
      expect(await fs.pathExists(`${testFile}.lock`)).toBe(false);
    });

    it("should release lock even on error", async () => {
      await expect(
        withFileLock(testFile, async () => {
          throw new Error("test error");
        }),
      ).rejects.toThrow("test error");

      expect(await fs.pathExists(`${testFile}.lock`)).toBe(false);
    });

    it("should protect concurrent reads and writes", async () => {
      // Write initial config
      await fs.writeJson(testFile, { count: 0 });

      // Run two concurrent lock-protected operations
      await Promise.all([
        withFileLock(testFile, async () => {
          const data = await fs.readJson(testFile);
          await new Promise((r) => setTimeout(r, 10));
          await fs.writeJson(testFile, { count: data.count + 1 });
        }),
        withFileLock(testFile, async () => {
          const data = await fs.readJson(testFile);
          await new Promise((r) => setTimeout(r, 10));
          await fs.writeJson(testFile, { count: data.count + 1 });
        }),
      ]);

      const final = await fs.readJson(testFile);
      expect(final.count).toBe(2);
    });
  });
});
