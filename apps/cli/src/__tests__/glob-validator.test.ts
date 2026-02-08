import { describe, it, expect } from "vitest";
import { validateGlob, validateGlobs } from "../security/glob-validator.js";

describe("validateGlob", () => {
  describe("valid patterns", () => {
    it("should accept standard source globs", () => {
      expect(validateGlob("src/**/*.ts")).toEqual({ valid: true });
      expect(validateGlob("**/*.tsx")).toEqual({ valid: true });
      expect(validateGlob("lib/**/*.js")).toEqual({ valid: true });
    });

    it("should accept specific file patterns", () => {
      expect(validateGlob("*.md")).toEqual({ valid: true });
      expect(validateGlob("docs/**/*.mdx")).toEqual({ valid: true });
    });
  });

  describe("blocked patterns", () => {
    it("should reject .env targeting", () => {
      const result = validateGlob("**/.env");
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error");
    });

    it("should reject .env.* variants", () => {
      expect(validateGlob("**/.env.local").valid).toBe(false);
      expect(validateGlob(".env.production").valid).toBe(false);
    });

    it("should reject credential files", () => {
      expect(validateGlob("**/credentials.json").valid).toBe(false);
      expect(validateGlob("**/credentials").valid).toBe(false);
    });

    it("should reject SSH key patterns", () => {
      expect(validateGlob("**/.ssh/id_rsa").valid).toBe(false);
      expect(validateGlob("**/id_ed25519").valid).toBe(false);
    });

    it("should reject .git internals", () => {
      expect(validateGlob(".git/config").valid).toBe(false);
      expect(validateGlob("**/.git/HEAD").valid).toBe(false);
    });

    it("should reject PEM/key files", () => {
      expect(validateGlob("**/*.pem").valid).toBe(false);
      expect(validateGlob("**/*.key").valid).toBe(false);
      expect(validateGlob("**/*.p12").valid).toBe(false);
      expect(validateGlob("**/*.pfx").valid).toBe(false);
    });

    it("should reject Claude config targeting", () => {
      expect(validateGlob("**/.claude.json").valid).toBe(false);
    });

    it("should reject npm/pypi config", () => {
      expect(validateGlob("**/.npmrc").valid).toBe(false);
      expect(validateGlob("**/.pypirc").valid).toBe(false);
    });

    it("should reject path traversal in globs", () => {
      expect(validateGlob("../../etc/passwd").valid).toBe(false);
      expect(validateGlob("src/../../secrets").valid).toBe(false);
    });

    it("should reject system paths", () => {
      expect(validateGlob("/etc/passwd").valid).toBe(false);
      expect(validateGlob("/etc/shadow").valid).toBe(false);
    });

    it("should reject secret files", () => {
      expect(validateGlob("**/.secret").valid).toBe(false);
      expect(validateGlob("**/.secrets").valid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should reject empty string", () => {
      expect(validateGlob("").valid).toBe(false);
    });

    it("should reject null bytes", () => {
      expect(validateGlob("src\0/**/*.ts").valid).toBe(false);
    });
  });
});

describe("validateGlobs", () => {
  it("should accept an array of valid globs", () => {
    expect(validateGlobs(["src/**/*.ts", "lib/**/*.js"])).toEqual({
      valid: true,
    });
  });

  it("should reject if any glob is invalid", () => {
    const result = validateGlobs(["src/**/*.ts", "**/.env"]);
    expect(result.valid).toBe(false);
    expect(result).toHaveProperty("error");
  });

  it("should accept empty array", () => {
    expect(validateGlobs([])).toEqual({ valid: true });
  });
});
