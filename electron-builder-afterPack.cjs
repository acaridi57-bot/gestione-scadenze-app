// Post-pack validation & auto-repair hook for electron-builder.
// Verifies that index.js and electron/main.cjs exist in appOutDir before ASAR is created.
// If missing, attempts auto-repair; if repair fails, throws a clear error.

const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const electronPlatformName = context.electronPlatformName;

  if (!appOutDir) {
    throw new Error("[afterPack] context.appOutDir non definito.");
  }

  // Determine the resources/app path based on platform
  let appPath;
  if (electronPlatformName === "darwin") {
    // macOS: Contents/Resources/app
    const contentsDir = fs.readdirSync(appOutDir).find((f) => f.endsWith(".app"));
    if (contentsDir) {
      appPath = path.join(appOutDir, contentsDir, "Contents", "Resources", "app");
    }
  } else {
    // Windows/Linux: resources/app
    appPath = path.join(appOutDir, "resources", "app");
  }

  // If app folder doesn't exist yet (ASAR not unpacked), check the source
  if (!appPath || !fs.existsSync(appPath)) {
    // Try to find app.asar or app folder
    const resourcesDir = electronPlatformName === "darwin"
      ? path.join(appOutDir, fs.readdirSync(appOutDir).find((f) => f.endsWith(".app")) || "", "Contents", "Resources")
      : path.join(appOutDir, "resources");

    if (fs.existsSync(resourcesDir)) {
      const hasAsar = fs.existsSync(path.join(resourcesDir, "app.asar"));
      const hasAppDir = fs.existsSync(path.join(resourcesDir, "app"));

      if (hasAsar) {
        // ASAR already created - we need to verify its contents
        console.log("[afterPack] app.asar già creato, verifico contenuto...");
        try {
          const asar = require("@electron/asar");
          const asarPath = path.join(resourcesDir, "app.asar");
          const files = asar.listPackage(asarPath);

          const hasIndexJs = files.some((f) => f === "/index.js" || f === "index.js");
          const hasMainCjs = files.some(
            (f) => f === "/electron/main.cjs" || f === "electron/main.cjs"
          );

          if (!hasIndexJs || !hasMainCjs) {
            console.error("[afterPack] ASAR incompleto:");
            console.error(`  - index.js: ${hasIndexJs ? "OK" : "MANCANTE"}`);
            console.error(`  - electron/main.cjs: ${hasMainCjs ? "OK" : "MANCANTE"}`);

            // Attempt repair: extract, add missing files, repack
            const tempExtract = path.join(resourcesDir, "app-temp");
            asar.extractAll(asarPath, tempExtract);

            // Add missing index.js
            if (!hasIndexJs) {
              const indexContent = [
                "// Electron entrypoint for packaged builds.",
                "// Using CommonJS require for compatibility with Electron packaging.",
                'require("./electron/main.cjs");',
                "",
              ].join("\n");
              fs.writeFileSync(path.join(tempExtract, "index.js"), indexContent, "utf8");
              console.log("[afterPack] Auto-repair: creato index.js in ASAR");
            }

            // Repack
            await asar.createPackage(tempExtract, asarPath);
            fs.rmSync(tempExtract, { recursive: true, force: true });
            console.log("[afterPack] Auto-repair: ASAR ricostruito con successo");
          } else {
            console.log("[afterPack] Verifica ASAR: OK");
          }
        } catch (asarErr) {
          // @electron/asar might not be available, just warn
          console.warn("[afterPack] Impossibile verificare ASAR:", asarErr.message);
          console.warn("[afterPack] Assicurati che @electron/asar sia installato per la verifica post-build.");
        }
      } else if (hasAppDir) {
        appPath = path.join(resourcesDir, "app");
      }
    }
  }

  // If we have an unpacked app directory, verify files directly
  if (appPath && fs.existsSync(appPath)) {
    const indexJs = path.join(appPath, "index.js");
    const mainCjs = path.join(appPath, "electron", "main.cjs");

    let repaired = false;

    if (!fs.existsSync(indexJs)) {
      const indexContent = [
        "// Electron entrypoint for packaged builds.",
        "// Using CommonJS require for compatibility with Electron packaging.",
        'require("./electron/main.cjs");',
        "",
      ].join("\n");
      fs.writeFileSync(indexJs, indexContent, "utf8");
      console.log("[afterPack] Auto-repair: creato index.js");
      repaired = true;
    }

    if (!fs.existsSync(mainCjs)) {
      throw new Error(
        [
          "[afterPack] electron/main.cjs mancante in appPath!",
          `  - appPath: ${appPath}`,
          `  - Atteso: ${mainCjs}`,
          "",
          "Questo file deve essere incluso nei 'files' di electron-builder.json.",
          "Verifica che 'electron/**/*' sia presente nella lista files.",
        ].join("\n")
      );
    }

    if (repaired) {
      console.log("[afterPack] Auto-repair completato con successo");
    } else {
      console.log("[afterPack] Verifica file: OK");
    }
  }
};
