import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // Load graphql and its consumers through one module graph so
    // GraphQLError instanceof checks agree (avoids ESM/CJS dual-package).
    server: { deps: { inline: [/graphql/, /@envelop/, /@whatwg-node/] } },
  },
});
