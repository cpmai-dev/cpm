import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { RepositorySource } from "../sources/repository-source.js";
import type { RegistryPackage } from "../types.js";

// Mock got for HTTP requests
vi.mock("got", () => ({
  default: vi.fn(),
}));

import got from "got";
const mockedGot = vi.mocked(got);

describe("RepositorySource", () => {
  const source = new RepositorySource();
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpm-repo-source-"));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("should have name 'repository' and priority 1", () => {
    expect(source.name).toBe("repository");
    expect(source.priority).toBe(1);
  });

  describe("canFetch", () => {
    it("should return true for packages with path", () => {
      const pkg: RegistryPackage = {
        name: "@cpm/test",
        version: "1.0.0",
        description: "Test",
        author: "test",
        path: "rules/cpm/test",
      };
      expect(source.canFetch(pkg)).toBe(true);
    });

    it("should return true for packages with github repository", () => {
      const pkg: RegistryPackage = {
        name: "@cpm/test",
        version: "1.0.0",
        description: "Test",
        author: "test",
        repository: "https://github.com/owner/repo",
      };
      expect(source.canFetch(pkg)).toBe(true);
    });

    it("should return false for packages without path or repository", () => {
      const pkg: RegistryPackage = {
        name: "@cpm/test",
        version: "1.0.0",
        description: "Test",
        author: "test",
      };
      expect(source.canFetch(pkg)).toBe(false);
    });
  });

  describe("content file downloading", () => {
    it("should download files referenced in rules.files", async () => {
      const manifestYaml = [
        'name: "@cpm/chrome-extension"',
        'version: "1.0.0"',
        'description: "Chrome extension rules"',
        "type: rules",
        "rules:",
        '  glob: "*.md"',
        "  files:",
        "    - chrome-extension.md",
      ].join("\n");

      const mdContent = "# Chrome Extension Rules\n\nUse Manifest V3.";

      mockedGot.mockImplementation(async (url: string | URL) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.endsWith("cpm.yaml")) {
          return { body: manifestYaml } as never;
        }
        if (urlStr.endsWith("chrome-extension.md")) {
          return { body: mdContent } as never;
        }
        throw new Error("Not found");
      });

      const pkg: RegistryPackage = {
        name: "@cpm/chrome-extension",
        version: "1.0.0",
        description: "Chrome extension rules",
        author: "cpm",
        path: "rules/cpm/chrome-extension",
      };

      const manifest = await source.fetch(pkg, { tempDir: tmpDir });

      expect(manifest).not.toBeNull();
      expect(manifest!.name).toBe("@cpm/chrome-extension");

      // Content file should be downloaded to tempDir
      const downloadedFile = path.join(tmpDir, "chrome-extension.md");
      expect(await fs.pathExists(downloadedFile)).toBe(true);
      expect(await fs.readFile(downloadedFile, "utf-8")).toBe(mdContent);
    });

    it("should handle multiple content files", async () => {
      const manifestYaml = [
        'name: "@cpm/multi-rules"',
        'version: "1.0.0"',
        'description: "Multi rules"',
        "type: rules",
        "rules:",
        "  files:",
        "    - part-one.md",
        "    - part-two.md",
      ].join("\n");

      mockedGot.mockImplementation(async (url: string | URL) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.endsWith("cpm.yaml")) {
          return { body: manifestYaml } as never;
        }
        if (urlStr.endsWith("part-one.md")) {
          return { body: "# Part One" } as never;
        }
        if (urlStr.endsWith("part-two.md")) {
          return { body: "# Part Two" } as never;
        }
        throw new Error("Not found");
      });

      const pkg: RegistryPackage = {
        name: "@cpm/multi-rules",
        version: "1.0.0",
        description: "Multi rules",
        author: "cpm",
        path: "rules/cpm/multi-rules",
      };

      await source.fetch(pkg, { tempDir: tmpDir });

      expect(await fs.pathExists(path.join(tmpDir, "part-one.md"))).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, "part-two.md"))).toBe(true);
    });

    it("should sanitize path traversal in filenames and keep files in tempDir", async () => {
      const manifestYaml = [
        'name: "@cpm/evil"',
        'version: "1.0.0"',
        'description: "Evil"',
        "type: rules",
        "rules:",
        "  files:",
        "    - ../../../etc/passwd.md",
        "    - normal.md",
      ].join("\n");

      mockedGot.mockImplementation(async (url: string | URL) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.endsWith("cpm.yaml")) {
          return { body: manifestYaml } as never;
        }
        return { body: "# Content" } as never;
      });

      const pkg: RegistryPackage = {
        name: "@cpm/evil",
        version: "1.0.0",
        description: "Evil",
        author: "evil",
        path: "rules/cpm/evil",
      };

      await source.fetch(pkg, { tempDir: tmpDir });

      // sanitizeFileName strips directory components via path.basename
      // "../../../etc/passwd.md" → "passwd.md" (safe, contained in tempDir)
      const files = await fs.readdir(tmpDir);
      for (const file of files) {
        const resolved = path.resolve(tmpDir, file);
        expect(resolved.startsWith(path.resolve(tmpDir))).toBe(true);
      }

      // Normal file should be downloaded
      expect(await fs.pathExists(path.join(tmpDir, "normal.md"))).toBe(true);
    });

    it("should reject hidden files", async () => {
      const manifestYaml = [
        'name: "@cpm/hidden"',
        'version: "1.0.0"',
        'description: "Hidden"',
        "type: rules",
        "rules:",
        "  files:",
        "    - .secret.md",
        "    - normal.md",
      ].join("\n");

      mockedGot.mockImplementation(async (url: string | URL) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.endsWith("cpm.yaml")) {
          return { body: manifestYaml } as never;
        }
        return { body: "# Content" } as never;
      });

      const pkg: RegistryPackage = {
        name: "@cpm/hidden",
        version: "1.0.0",
        description: "Hidden",
        author: "test",
        path: "rules/cpm/hidden",
      };

      await source.fetch(pkg, { tempDir: tmpDir });

      // Hidden files are rejected by sanitizeFileName
      expect(await fs.pathExists(path.join(tmpDir, ".secret.md"))).toBe(false);
      // Normal file should be downloaded
      expect(await fs.pathExists(path.join(tmpDir, "normal.md"))).toBe(true);
    });

    it("should skip non-.md files referenced in rules.files", async () => {
      const manifestYaml = [
        'name: "@cpm/mixed"',
        'version: "1.0.0"',
        'description: "Mixed"',
        "type: rules",
        "rules:",
        "  files:",
        "    - rules.md",
        "    - evil.sh",
        "    - hack.js",
      ].join("\n");

      mockedGot.mockImplementation(async (url: string | URL) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.endsWith("cpm.yaml")) {
          return { body: manifestYaml } as never;
        }
        return { body: "content" } as never;
      });

      const pkg: RegistryPackage = {
        name: "@cpm/mixed",
        version: "1.0.0",
        description: "Mixed",
        author: "test",
        path: "rules/cpm/mixed",
      };

      await source.fetch(pkg, { tempDir: tmpDir });

      expect(await fs.pathExists(path.join(tmpDir, "rules.md"))).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, "evil.sh"))).toBe(false);
      expect(await fs.pathExists(path.join(tmpDir, "hack.js"))).toBe(false);
    });

    it("should still return manifest when content file download fails", async () => {
      const manifestYaml = [
        'name: "@cpm/partial"',
        'version: "1.0.0"',
        'description: "Partial"',
        "type: rules",
        "rules:",
        "  files:",
        "    - missing.md",
      ].join("\n");

      mockedGot.mockImplementation(async (url: string | URL) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.endsWith("cpm.yaml")) {
          return { body: manifestYaml } as never;
        }
        throw new Error("404 Not Found");
      });

      const pkg: RegistryPackage = {
        name: "@cpm/partial",
        version: "1.0.0",
        description: "Partial",
        author: "test",
        path: "rules/cpm/partial",
      };

      const manifest = await source.fetch(pkg, { tempDir: tmpDir });

      // Manifest should still be returned
      expect(manifest).not.toBeNull();
      expect(manifest!.name).toBe("@cpm/partial");
      // File should not exist
      expect(await fs.pathExists(path.join(tmpDir, "missing.md"))).toBe(false);
    });

    it("should work for packages without content file references", async () => {
      const manifestYaml = [
        'name: "@cpm/inline"',
        'version: "1.0.0"',
        'description: "Inline rules"',
        "type: rules",
        "universal:",
        '  rules: "# Inline content"',
      ].join("\n");

      mockedGot.mockImplementation(async () => {
        return { body: manifestYaml } as never;
      });

      const pkg: RegistryPackage = {
        name: "@cpm/inline",
        version: "1.0.0",
        description: "Inline rules",
        author: "test",
        path: "rules/cpm/inline",
      };

      const manifest = await source.fetch(pkg, { tempDir: tmpDir });

      expect(manifest).not.toBeNull();
      expect(manifest!.name).toBe("@cpm/inline");

      // No extra files should be in tempDir
      const files = await fs.readdir(tmpDir);
      expect(files).toHaveLength(0);
    });

    it("should download content files for standalone repos", async () => {
      const manifestYaml = [
        'name: "@cpm/standalone"',
        'version: "1.0.0"',
        'description: "Standalone rules"',
        "type: rules",
        "rules:",
        "  files:",
        "    - rules.md",
      ].join("\n");

      mockedGot.mockImplementation(async (url: string | URL) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.endsWith("cpm.yaml")) {
          return { body: manifestYaml } as never;
        }
        if (urlStr.endsWith("rules.md")) {
          return { body: "# Standalone Rules" } as never;
        }
        throw new Error("Not found");
      });

      const pkg: RegistryPackage = {
        name: "@cpm/standalone",
        version: "1.0.0",
        description: "Standalone rules",
        author: "test",
        repository: "https://github.com/owner/standalone-rules",
      };

      const manifest = await source.fetch(pkg, { tempDir: tmpDir });

      expect(manifest).not.toBeNull();
      expect(await fs.pathExists(path.join(tmpDir, "rules.md"))).toBe(true);
      expect(await fs.readFile(path.join(tmpDir, "rules.md"), "utf-8")).toBe(
        "# Standalone Rules",
      );
    });
  });

  describe("path validation", () => {
    it("should reject paths with directory traversal", async () => {
      const pkg: RegistryPackage = {
        name: "@cpm/evil",
        version: "1.0.0",
        description: "Evil",
        author: "evil",
        path: "../../../etc",
      };

      const manifest = await source.fetch(pkg, { tempDir: tmpDir });
      expect(manifest).toBeNull();
    });

    it("should reject paths starting with /", async () => {
      const pkg: RegistryPackage = {
        name: "@cpm/evil",
        version: "1.0.0",
        description: "Evil",
        author: "evil",
        path: "/etc/passwd",
      };

      const manifest = await source.fetch(pkg, { tempDir: tmpDir });
      expect(manifest).toBeNull();
    });
  });
});
