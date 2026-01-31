import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // Bundle workspace packages into the output
  noExternal: ["@cpm/registry-client", "@cpm/types"],
});
