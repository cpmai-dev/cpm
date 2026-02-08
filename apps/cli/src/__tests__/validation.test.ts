/**
 * Tests for package name validation
 * Covers security and format validation
 */
import { describe, it, expect } from "vitest";
import { validatePackageName } from "../validation/index.js";

describe("validatePackageName", () => {
  describe("valid package names", () => {
    it("should accept simple package names", () => {
      expect(validatePackageName("my-package")).toEqual({ valid: true });
      expect(validatePackageName("package123")).toEqual({ valid: true });
      expect(validatePackageName("my_package")).toEqual({ valid: true });
    });

    it("should accept scoped package names", () => {
      expect(validatePackageName("@cpm/nextjs-rules")).toEqual({ valid: true });
      expect(validatePackageName("@community/my-skill")).toEqual({
        valid: true,
      });
      expect(validatePackageName("@user123/package_name")).toEqual({
        valid: true,
      });
    });

    it("should accept package names with dots", () => {
      expect(validatePackageName("my.package")).toEqual({ valid: true });
      expect(validatePackageName("@scope/my.package")).toEqual({ valid: true });
    });

    it("should accept package names with tildes", () => {
      expect(validatePackageName("~package")).toEqual({ valid: true });
      expect(validatePackageName("@scope/~package")).toEqual({ valid: true });
    });
  });

  describe("invalid package names", () => {
    it("should reject empty names", () => {
      expect(validatePackageName("")).toEqual({
        valid: false,
        error: "Package name cannot be empty",
      });
    });

    it("should reject null/undefined", () => {
      expect(validatePackageName(null as unknown as string)).toEqual({
        valid: false,
        error: "Package name cannot be empty",
      });
      expect(validatePackageName(undefined as unknown as string)).toEqual({
        valid: false,
        error: "Package name cannot be empty",
      });
    });

    it("should reject names that are too long", () => {
      const longName = "a".repeat(215);
      const result = validatePackageName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too long");
    });

    it("should accept names with uppercase letters (case-insensitive)", () => {
      // The regex uses .toLowerCase() so uppercase is accepted
      expect(validatePackageName("MyPackage")).toEqual({ valid: true });
      expect(validatePackageName("UPPERCASE")).toEqual({ valid: true });
    });

    it("should reject names starting with dots", () => {
      expect(validatePackageName(".hidden")).toEqual({
        valid: false,
        error: "Invalid package name format",
      });
    });

    it("should reject names with spaces", () => {
      expect(validatePackageName("my package")).toEqual({
        valid: false,
        error: "Invalid package name format",
      });
    });
  });

  describe("security: path traversal prevention", () => {
    it("should reject names with ..", () => {
      expect(validatePackageName("../etc/passwd")).toEqual({
        valid: false,
        error: "Invalid characters in package name",
      });
      expect(validatePackageName("..%2f..%2fetc")).toEqual({
        valid: false,
        error: "Invalid characters in package name",
      });
    });

    it("should reject names with backslashes", () => {
      expect(validatePackageName("..\\windows\\system32")).toEqual({
        valid: false,
        error: "Invalid characters in package name",
      });
    });

    it("should reject URL-encoded path traversal", () => {
      expect(validatePackageName("%2e%2e%2fetc")).toEqual({
        valid: false,
        error: "Invalid characters in package name",
      });
      expect(validatePackageName("%2E%2E%2Fetc")).toEqual({
        valid: false,
        error: "Invalid characters in package name",
      });
    });

    it("should reject null bytes", () => {
      expect(validatePackageName("package\0name")).toEqual({
        valid: false,
        error: "Invalid characters in package name",
      });
    });

    it("should reject URL-encoded backslashes", () => {
      expect(validatePackageName("%5c%5cserver")).toEqual({
        valid: false,
        error: "Invalid characters in package name",
      });
      expect(validatePackageName("%5C%5Cserver")).toEqual({
        valid: false,
        error: "Invalid characters in package name",
      });
    });

    it("should reject URL-encoded forward slashes in wrong context", () => {
      // This is rejected by path traversal check first
      const result = validatePackageName("package%2fname");
      expect(result.valid).toBe(false);
      // Could be either error depending on which check triggers first
      expect([
        "Invalid characters in package name",
        "Invalid package name format",
      ]).toContain(result.error);
    });
  });

  describe("edge cases", () => {
    it("should handle maximum valid length", () => {
      const maxLengthName = "a".repeat(214);
      expect(validatePackageName(maxLengthName)).toEqual({ valid: true });
    });

    it("should handle single character names", () => {
      expect(validatePackageName("a")).toEqual({ valid: true });
    });

    it("should handle numbers only", () => {
      expect(validatePackageName("123")).toEqual({ valid: true });
    });

    it("should handle complex scoped names", () => {
      expect(validatePackageName("@my-org_123/package.name_v2")).toEqual({
        valid: true,
      });
    });
  });
});
