// Auto-repair hook for electron-builder.
// Ensures the application entrypoint exists in the actual appDir being packaged.

const fs = require("fs");
const path = require("path");

exports.default = async function beforePack(context) {
  // eslint-disable-next-line no-console
  console.log("[beforePack] Hook avviato");

  // IMPORTANT: electron-builder passes `context.appDir` as the *staging directory* that
  // will actually be packaged. Writing to packager.info.appDir (project root) would
  // not affect the ASAR contents.
  const appDir = context?.appDir || context?.packager?.info?.appDir;
  const projectDir = context?.packager?.info?.projectDir;

  // eslint-disable-next-line no-console
  console.log(`[beforePack] appDir: ${appDir}`);
  // eslint-disable-next-line no-console
  console.log(`[beforePack] projectDir: ${projectDir}`);

  if (!appDir) {
    throw new Error("[beforePack] Impossibile determinare appDir (context.appDir).");
  }

  const electronMain = path.join(appDir, "electron", "main.cjs");
  const indexJs = path.join(appDir, "index.js");

  // eslint-disable-next-line no-console
  console.log(`[beforePack] Verifica electron/main.cjs: ${electronMain}`);
  // eslint-disable-next-line no-console
  console.log(`[beforePack] Verifica index.js: ${indexJs}`);

  // Hard validation: main process must exist.
  if (!fs.existsSync(electronMain)) {
    throw new Error(
      [
        "[beforePack] File main process mancante:",
        `- Atteso: ${electronMain}`,
        `- appDir: ${appDir}`,
        projectDir ? `- projectDir: ${projectDir}` : null,
        "\nCorrezione: assicurati che la cartella 'electron/' sia inclusa nei 'files' di electron-builder.",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[beforePack] electron/main.cjs esiste: OK`);

  // ALWAYS write index.js to ensure it exists in staging directory.
  // This is critical because electron-builder may not copy it if it doesn't exist
  // at the exact moment files are gathered.
  const indexJsContent = [
    "// Electron entrypoint for packaged builds.",
    "// Using CommonJS require for compatibility with Electron packaging.",
    'require("./electron/main.cjs");',
    "",
  ].join("\n");

  fs.writeFileSync(indexJs, indexJsContent, "utf8");

  // eslint-disable-next-line no-console
  console.log(`[beforePack] index.js scritto: ${indexJs}`);

  // Verify file was created and is readable.
  if (!fs.existsSync(indexJs)) {
    throw new Error(`[beforePack] Impossibile creare index.js in: ${indexJs}`);
  }

  fs.accessSync(indexJs, fs.constants.R_OK);

  // eslint-disable-next-line no-console
  console.log(`[beforePack] Verifica completata: OK`);
};
