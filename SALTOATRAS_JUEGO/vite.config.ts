import { defineConfig, type Plugin } from "vite";

/**
 * El arte está fuera del proyecto: Vite no se entera de que se añade, mueve o borra una
 * imagen y la lista de imágenes (un import.meta.glob) se queda vieja. Esto vigila
 * SALTOATRAS_ARTE/juego y /sonido y recarga la página cuando cambia algo.
 */
function vigilarArte(): Plugin {
  return {
    name: "vigilar-arte",
    configureServer(server) {
      server.watcher.add([`${server.config.root}/../SALTOATRAS_ARTE/juego`, `${server.config.root}/../SALTOATRAS_ARTE/sonido`]);
      const recargar = (ruta: string) => {
        const r = ruta.replaceAll("\\", "/").toLowerCase();
        const arte = r.includes("saltoatras_arte/juego/") && r.endsWith(".png");
        const sonido = r.includes("saltoatras_arte/sonido/") && /\.(mp3|ogg|wav)$/.test(r);
        if (!arte && !sonido) return;
        const datos = [...server.moduleGraph.idToModuleMap.values()].find((m) => m.file?.endsWith("src/motor/datos.ts"));
        if (datos) server.moduleGraph.invalidateModule(datos);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", recargar).on("unlink", recargar);
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [vigilarArte()],
  // El arte vive en la carpeta hermana SALTOATRAS_ARTE.
  server: { host: true, port: 5182, strictPort: true, fs: { allow: [".", "../SALTOATRAS_ARTE"] } },
  preview: { port: 5182, strictPort: true },
});
