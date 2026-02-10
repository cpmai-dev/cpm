import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { CursorRulesHandler } from "../adapters/handlers/cursor-rules-handler.js";
import type { PackageManifest } from "../types.js";

describe("CursorRulesHandler", () => {
  const handler = new CursorRulesHandler();
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpm-cursor-rules-"));
    projectPath = path.join(tmpDir, "project");
    await fs.ensureDir(path.join(projectPath, ".cursor", "rules"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("should have packageType 'rules'", () => {
    expect(handler.packageType).toBe("rules");
  });

  describe("install from manifest content", () => {
    it("should create .mdc file with YAML frontmatter", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/typescript-rules",
        version: "1.0.0",
        description: "TypeScript coding standards",
        type: "rules",
        universal: {
          rules: "## Always use strict mode\n- Enable strict TypeScript",
          globs: ["src/**/*.ts"],
        },
      };

      const files = await handler.install(manifest, { projectPath });

      expect(files.length).toBeGreaterThan(0);

      const mdcFile = files.find((f) => f.endsWith(".mdc"));
      expect(mdcFile).toBeDefined();

      const content = await fs.readFile(mdcFile!, "utf-8");
      expect(content).toContain("---");
      expect(content).toContain("description: TypeScript coding standards");
      expect(content).toContain('globs: ["src/**/*.ts"]');
      expect(content).toContain("alwaysApply: false");
      expect(content).toContain("## Always use strict mode");
    });

    it("should create .cpm.json metadata", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/test-rules",
        version: "2.0.0",
        description: "Test rules",
        type: "rules",
        universal: { rules: "Some rules content" },
      };

      const files = await handler.install(manifest, { projectPath });

      const metadataFile = files.find((f) => f.endsWith(".cpm.json"));
      expect(metadataFile).toBeDefined();

      const metadata = await fs.readJson(metadataFile!);
      expect(metadata.name).toBe("@cpm/test-rules");
      expect(metadata.version).toBe("2.0.0");
      expect(metadata.type).toBe("rules");
      expect(metadata.installedAt).toBeDefined();
    });

    it("should install to project-level .cursor/rules/", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/project-rules",
        version: "1.0.0",
        description: "Project rules",
        type: "rules",
        universal: { rules: "Rules here" },
      };

      const files = await handler.install(manifest, { projectPath });

      for (const file of files) {
        expect(file).toContain(".cursor");
        expect(file).toContain("rules");
      }
    });

    it("should set alwaysApply: true when no globs", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/always-apply",
        version: "1.0.0",
        description: "Always apply",
        type: "rules",
        universal: { rules: "Apply always" },
      };

      const files = await handler.install(manifest, { projectPath });
      const mdcFile = files.find((f) => f.endsWith(".mdc"));
      const content = await fs.readFile(mdcFile!, "utf-8");
      expect(content).toContain("alwaysApply: true");
    });

    it("should set alwaysApply: false when globs provided", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/glob-rules",
        version: "1.0.0",
        description: "Glob rules",
        type: "rules",
        universal: { rules: "Scoped rules", globs: ["src/**/*.ts"] },
      };

      const files = await handler.install(manifest, { projectPath });
      const mdcFile = files.find((f) => f.endsWith(".mdc"));
      const content = await fs.readFile(mdcFile!, "utf-8");
      expect(content).toContain("alwaysApply: false");
    });

    it("should escape YAML special characters in description", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/special-desc",
        version: "1.0.0",
        description: 'Rules with: colons and "quotes"',
        type: "rules",
        universal: { rules: "Some rules" },
      };

      const files = await handler.install(manifest, { projectPath });
      const mdcFile = files.find((f) => f.endsWith(".mdc"));
      const content = await fs.readFile(mdcFile!, "utf-8");
      expect(content).toContain(
        'description: "Rules with: colons and \\"quotes\\""',
      );
    });

    it("should escape newlines in description to prevent YAML injection", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/injection-test",
        version: "1.0.0",
        description: "Legit desc\nalwaysApply: false\ninjected: true",
        type: "rules",
        universal: { rules: "Rules" },
      };

      const files = await handler.install(manifest, { projectPath });
      const mdcFile = files.find((f) => f.endsWith(".mdc"));
      const content = await fs.readFile(mdcFile!, "utf-8");
      // The description should be quoted, preventing injection
      expect(content).not.toMatch(/^injected:/m);
      expect(content).toContain("\\n");
    });

    it("should use empty globs when not specified", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/no-globs",
        version: "1.0.0",
        description: "No globs",
        type: "rules",
        universal: { rules: "Some rules" },
      };

      const files = await handler.install(manifest, { projectPath });
      const mdcFile = files.find((f) => f.endsWith(".mdc"));
      const content = await fs.readFile(mdcFile!, "utf-8");
      expect(content).toContain("globs: []");
    });

    it("should escape \\r and \\t in description", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/control-chars",
        version: "1.0.0",
        description: "Has\ttabs\rand\rcarriage\treturns",
        type: "rules",
        universal: { rules: "Rules" },
      };

      const files = await handler.install(manifest, { projectPath });
      const mdcFile = files.find((f) => f.endsWith(".mdc"));
      const content = await fs.readFile(mdcFile!, "utf-8");
      expect(content).toContain("\\t");
      expect(content).toContain("\\r");
      expect(content).not.toMatch(/\t.*tabs/);
    });

    it("should reject manifests with dangerous glob patterns", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/evil-globs",
        version: "1.0.0",
        description: "Evil",
        type: "rules",
        universal: { rules: "Rules", globs: ["**/.env"] },
      };

      await expect(handler.install(manifest, { projectPath })).rejects.toThrow(
        "Glob security validation failed",
      );
    });

    it("should reject manifests with SSH key glob patterns", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/ssh-steal",
        version: "1.0.0",
        description: "SSH steal",
        type: "rules",
        universal: { rules: "Rules", globs: ["**/.ssh/id_rsa"] },
      };

      await expect(handler.install(manifest, { projectPath })).rejects.toThrow(
        "Glob security validation failed",
      );
    });
  });

  describe("install from package files", () => {
    it("should convert .md files to .mdc with frontmatter", async () => {
      const packagePath = path.join(tmpDir, "pkg");
      await fs.ensureDir(packagePath);
      await fs.writeFile(
        path.join(packagePath, "coding-standards.md"),
        "# Coding Standards\n\nUse strict mode.",
        "utf-8",
      );

      const manifest: PackageManifest = {
        name: "@cpm/file-rules",
        version: "1.0.0",
        description: "File-based rules",
        type: "rules",
        universal: { rules: "fallback", globs: ["**/*.ts"] },
      };

      const files = await handler.install(manifest, {
        projectPath,
        packagePath,
      });

      const mdcFile = files.find((f) => f.endsWith(".mdc"));
      expect(mdcFile).toBeDefined();
      expect(mdcFile).toContain("coding-standards.mdc");

      const content = await fs.readFile(mdcFile!, "utf-8");
      expect(content).toContain("---");
      expect(content).toContain("description: File-based rules");
      expect(content).toContain("# Coding Standards");
    });

    it("should skip symlinked files in package", async () => {
      const packagePath = path.join(tmpDir, "pkg-symlink");
      await fs.ensureDir(packagePath);

      // Create a real file elsewhere
      const secretFile = path.join(tmpDir, "secret.md");
      await fs.writeFile(secretFile, "# Secret content", "utf-8");

      // Create a symlink inside the package
      await fs.symlink(secretFile, path.join(packagePath, "rules.md"));

      const manifest: PackageManifest = {
        name: "@cpm/symlink-rules",
        version: "1.0.0",
        description: "Symlink package",
        type: "rules",
        universal: { rules: "fallback", globs: ["**/*.ts"] },
      };

      const files = await handler.install(manifest, {
        projectPath,
        packagePath,
      });

      // Should not have copied the symlinked file (only metadata)
      const mdcFiles = files.filter((f) => f.endsWith(".mdc"));
      expect(mdcFiles).toHaveLength(0);
    });
  });

  describe("missing content handling", () => {
    it("should warn and clean up directory when no content is found", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/empty-rules",
        version: "1.0.0",
        description: "Empty rules",
        type: "rules",
      };

      const files = await handler.install(manifest, { projectPath });

      expect(files).toHaveLength(0);

      // The directory should have been cleaned up
      const rulesDir = path.join(
        projectPath,
        ".cursor",
        "rules",
        "cpm-empty-rules",
      );
      expect(await fs.pathExists(rulesDir)).toBe(false);
    });

    it("should warn and clean up when packagePath is empty", async () => {
      const emptyPkgDir = path.join(tmpDir, "empty-pkg");
      await fs.ensureDir(emptyPkgDir);

      const manifest: PackageManifest = {
        name: "@cpm/no-files",
        version: "1.0.0",
        description: "No files",
        type: "rules",
      };

      const files = await handler.install(manifest, {
        projectPath,
        packagePath: emptyPkgDir,
      });

      expect(files).toHaveLength(0);

      const rulesDir = path.join(
        projectPath,
        ".cursor",
        "rules",
        "cpm-no-files",
      );
      expect(await fs.pathExists(rulesDir)).toBe(false);
    });
  });

  describe("uninstall", () => {
    it("should remove package directory", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/to-remove",
        version: "1.0.0",
        description: "Remove me",
        type: "rules",
        universal: { rules: "Temporary rules" },
      };

      await handler.install(manifest, { projectPath });
      const removed = await handler.uninstall("@cpm/to-remove", {
        projectPath,
      });

      expect(removed.length).toBeGreaterThan(0);

      for (const p of removed) {
        expect(await fs.pathExists(p)).toBe(false);
      }
    });

    it("should return empty array for non-existent package", async () => {
      const removed = await handler.uninstall("@cpm/nonexistent", {
        projectPath,
      });
      expect(removed).toEqual([]);
    });
  });
});
