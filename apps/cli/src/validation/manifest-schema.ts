/**
 * Manifest Schema Validation
 *
 * Runtime validation for parsed cpm.yaml manifests using Zod.
 * Catches malformed manifests early with clear error messages
 * instead of letting them crash during installation.
 */

import { z } from "zod/v4";
import { PACKAGE_TYPES } from "../constants.js";
import type { PackageManifest } from "../types.js";

const packageTypeEnum = z.enum(PACKAGE_TYPES);

const baseFields = {
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  type: packageTypeEnum,
  author: z
    .union([z.string(), z.object({ name: z.string() }).passthrough()])
    .optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
};

const universalSchema = z
  .object({
    rules: z.string().optional(),
    globs: z.array(z.string()).optional(),
    prompt: z.string().optional(),
  })
  .optional();

const rulesSchema = z.object({
  ...baseFields,
  type: z.literal("rules"),
  universal: universalSchema,
});

const skillSchema = z.object({
  ...baseFields,
  type: z.literal("skill"),
  skill: z.object({
    command: z.string().min(1),
    description: z.string().min(1),
  }),
  universal: universalSchema,
});

const mcpSchema = z.object({
  ...baseFields,
  type: z.literal("mcp"),
  mcp: z.object({
    transport: z.enum(["stdio", "http"]).optional(),
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
  }),
});

const genericSchema = z.object({
  ...baseFields,
  universal: universalSchema,
});

const manifestSchema = z.discriminatedUnion("type", [
  rulesSchema,
  skillSchema,
  mcpSchema,
  // agent, hook, workflow, template, bundle all share generic shape
  genericSchema.extend({ type: z.literal("agent") }),
  genericSchema.extend({ type: z.literal("hook") }),
  genericSchema.extend({ type: z.literal("workflow") }),
  genericSchema.extend({ type: z.literal("template") }),
  genericSchema.extend({ type: z.literal("bundle") }),
]);

/**
 * Validate a raw parsed YAML object as a PackageManifest.
 *
 * @param raw - The output of yaml.parse()
 * @returns Validated PackageManifest
 * @throws Error with human-readable message if validation fails
 */
export function validateManifest(raw: unknown): PackageManifest {
  const result = manifestSchema.safeParse(raw);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join(".") || "unknown";
    const message = firstIssue?.message || "Invalid manifest";
    throw new Error(`Invalid manifest: ${path} — ${message}`);
  }

  return result.data as PackageManifest;
}
