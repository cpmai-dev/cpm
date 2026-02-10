import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { scanDirectory } from "../adapters/scanning.js";

describe("scanDirectory", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpm-scan-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("should return empty array for nonexistent directory", async () => {
    const items = await scanDirectory(
      path.join(tmpDir, "nonexistent"),
      "rules",
    );
    expect(items).toEqual([]);
  });

  it("should scan directories and return installed packages", async () => {
    await fs.ensureDir(path.join(tmpDir, "pkg-a"));
    await fs.ensureDir(path.join(tmpDir, "pkg-b"));

    const items = await scanDirectory(tmpDir, "rules", "claude-code");

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.folderName).sort()).toEqual(["pkg-a", "pkg-b"]);
    expect(items[0].type).toBe("rules");
    expect(items[0].platform).toBe("claude-code");
  });

  it("should read metadata from .cpm.json if present", async () => {
    const pkgDir = path.join(tmpDir, "my-pkg");
    await fs.ensureDir(pkgDir);
    await fs.writeJson(path.join(pkgDir, ".cpm.json"), {
      name: "@cpm/my-package",
      version: "2.0.0",
    });

    const items = await scanDirectory(tmpDir, "rules");

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("@cpm/my-package");
    expect(items[0].version).toBe("2.0.0");
  });

  it("should skip symlinks in scanned directory", async () => {
    const realDir = path.join(tmpDir, "real-pkg");
    await fs.ensureDir(realDir);

    const symlinkPath = path.join(tmpDir, "symlink-pkg");
    await fs.symlink(realDir, symlinkPath);

    const items = await scanDirectory(tmpDir, "rules");

    expect(items).toHaveLength(1);
    expect(items[0].folderName).toBe("real-pkg");
  });

  it("should skip files (non-directories)", async () => {
    await fs.ensureDir(path.join(tmpDir, "pkg-a"));
    await fs.writeFile(path.join(tmpDir, "stray-file.txt"), "not a package");

    const items = await scanDirectory(tmpDir, "rules");

    expect(items).toHaveLength(1);
    expect(items[0].folderName).toBe("pkg-a");
  });
});
