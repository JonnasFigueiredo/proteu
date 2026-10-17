import { it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

it("o ZIP distribuído contém todos os pontos de entrada do manifest", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proteu-package-"));
  try {
    for (const name of ["empacotar.mjs", "package.json", "manifest.json", "devtools.html", "src", "icons", "_locales", "LICENSE", "NOTICE"]) {
      fs.cpSync(path.join(root, name), path.join(dir, name), { recursive: true });
    }
    execFileSync(process.execPath, [path.join(dir, "empacotar.mjs")], { cwd: dir });
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    const zip = fs.readFileSync(path.join(dir, "dist", `proteu-qa-${manifest.version}.zip`));
    // Read the standard ZIP central directory, not the packager's source allowlist.
    const end = zip.length - 22;
    expect(zip.readUInt32LE(end)).toBe(0x06054b50);
    const names = new Set();
    let offset = zip.readUInt32LE(end + 16);
    for (let n = 0; n < zip.readUInt16LE(end + 10); n++) {
      expect(zip.readUInt32LE(offset)).toBe(0x02014b50);
      const length = zip.readUInt16LE(offset + 28);
      names.add(zip.subarray(offset + 46, offset + 46 + length).toString("utf8"));
      offset += 46 + length + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
    }
    for (const entry of ["manifest.json", "LICENSE", "NOTICE", manifest.devtools_page,
      manifest.background.service_worker, manifest.action.default_popup,
      manifest.side_panel.default_path.split("?")[0], ...Object.values(manifest.icons)]) {
      expect(names.has(entry), `arquivo ausente do ZIP: ${entry}`).toBe(true);
    }
    expect([...names].some(name => name.startsWith("tests/") || name.startsWith("node_modules/"))).toBe(false);
  } finally {
    if (path.dirname(path.resolve(dir)) !== path.resolve(os.tmpdir()) || !path.basename(dir).startsWith("proteu-package-")) {
      throw new Error("Refusing to remove an unexpected test directory");
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
