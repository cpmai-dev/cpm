import { describe, it, expect } from "vitest";
import { validateManifest } from "../validation/manifest-schema.js";

describe("validateManifest", () => {
  const validRules = {
    name: "@cpm/test",
    version: "1.0.0",
    description: "Test rules",
    type: "rules",
    universal: { rules: "Use strict mode" },
  };

  const validMcp = {
    name: "@cpm/test-mcp",
    version: "1.0.0",
    description: "Test MCP",
    type: "mcp",
    mcp: { command: "npx", args: ["-y", "test-server"] },
  };

  const validSkill = {
    name: "@cpm/test-skill",
    version: "1.0.0",
    description: "Test skill",
    type: "skill",
    skill: { command: "/test", description: "Run tests" },
  };

  it("should accept valid rules manifest", () => {
    const result = validateManifest(validRules);
    expect(result.name).toBe("@cpm/test");
    expect(result.type).toBe("rules");
  });

  it("should accept valid MCP manifest", () => {
    const result = validateManifest(validMcp);
    expect(result.type).toBe("mcp");
  });

  it("should accept valid skill manifest", () => {
    const result = validateManifest(validSkill);
    expect(result.type).toBe("skill");
  });

  it("should accept agent, hook, workflow, template, bundle types", () => {
    for (const type of ["agent", "hook", "workflow", "template", "bundle"]) {
      const manifest = {
        name: `@cpm/test-${type}`,
        version: "1.0.0",
        description: `Test ${type}`,
        type,
      };
      const result = validateManifest(manifest);
      expect(result.type).toBe(type);
    }
  });

  it("should reject missing name", () => {
    const bad = { ...validRules, name: undefined };
    expect(() => validateManifest(bad)).toThrow("Invalid manifest");
  });

  it("should reject non-string name", () => {
    const bad = { ...validRules, name: 123 };
    expect(() => validateManifest(bad)).toThrow("Invalid manifest");
  });

  it("should reject missing version", () => {
    const bad = { ...validRules, version: undefined };
    expect(() => validateManifest(bad)).toThrow("Invalid manifest");
  });

  it("should reject missing description", () => {
    const bad = { ...validRules, description: undefined };
    expect(() => validateManifest(bad)).toThrow("Invalid manifest");
  });

  it("should reject invalid type", () => {
    const bad = { ...validRules, type: "invalid-type" };
    expect(() => validateManifest(bad)).toThrow("Invalid manifest");
  });

  it("should reject missing type", () => {
    const bad = { name: "@cpm/test", version: "1.0.0", description: "Test" };
    expect(() => validateManifest(bad)).toThrow("Invalid manifest");
  });

  it("should reject MCP without mcp.command", () => {
    const bad = { ...validMcp, mcp: { args: ["-y"] } };
    expect(() => validateManifest(bad)).toThrow("Invalid manifest");
  });

  it("should reject skill without skill.command", () => {
    const bad = { ...validSkill, skill: { description: "Test" } };
    expect(() => validateManifest(bad)).toThrow("Invalid manifest");
  });

  it("should reject null input", () => {
    expect(() => validateManifest(null)).toThrow("Invalid manifest");
  });

  it("should reject string input", () => {
    expect(() => validateManifest("not an object")).toThrow("Invalid manifest");
  });
});
