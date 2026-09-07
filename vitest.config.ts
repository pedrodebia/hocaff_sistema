import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Os testes conversam com um Supabase de verdade. As chaves vêm do .env.local.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  test: {
    environment: "node",
    include: ["testes/**/*.test.ts"],
    // Cada arquivo mexe no mesmo banco. Em paralelo, um teste veria o cenário
    // que outro está montando e a contagem de linhas deixaria de significar algo.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
