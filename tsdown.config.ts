import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/plugin.ts", "src/cli.ts"],
  format: "esm",
  platform: "node",
  outDir: "dist",
  dts: true,
  clean: true,
  exports: {
    bin: "src/cli.ts",
    packageJson: true,
  },
});
