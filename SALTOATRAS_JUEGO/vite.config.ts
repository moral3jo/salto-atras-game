import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  // El arte vive en la carpeta hermana SALTOATRAS_ARTE.
  server: { host: true, port: 5182, strictPort: true, fs: { allow: [".", "../SALTOATRAS_ARTE"] } },
  preview: { port: 5182, strictPort: true },
});
