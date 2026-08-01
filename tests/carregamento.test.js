import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Simula o que o Chrome resolve ao carregar a extensão.
//
// Quatro recursos desta extensão já falharam em silêncio — módulo ausente de
// web_accessible_resources, caminho errado em panels.create, refactor pela
// metade, checagem de permissão que nunca casava. Todos tinham a mesma cara: a
// extensão carrega sem erro e simplesmente não faz nada.
//
// Este arquivo confere o que dá para conferir sem navegador: todo caminho
// citado existe, todo JS parseia, todo import resolve.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));
const manifest = JSON.parse(ler("manifest.json"));

/** Todos os .js sob src/. */
function jsDeSrc(dir = "src", acc = []) {
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) jsDeSrc(rel, acc);
    else if (e.name.endsWith(".js")) acc.push(rel);
  }
  return acc;
}

describe("carregamento — manifest", () => {
  it("todo caminho de arquivo citado no manifest existe", () => {
    const caminhos = [
      manifest.background?.service_worker,
      manifest.action?.default_popup,
      manifest.devtools_page,
      ...Object.values(manifest.icons || {}),
      ...(manifest.web_accessible_resources || []).flatMap((r) => r.resources || []),
    ].filter(Boolean);

    const faltando = caminhos.filter((c) => !existe(c));
    expect(faltando, `caminhos inexistentes: ${faltando.join(", ")}`).toEqual([]);
  });

  it("não sobrou nenhuma chave de manifesto desconhecida", () => {
    // Chave desconhecida faz o Chrome recusar a extensão inteira.
    const CONHECIDAS = new Set([
      "manifest_version", "name", "version", "description", "permissions",
      "optional_permissions", "host_permissions", "optional_host_permissions",
      "background", "action", "commands", "icons", "devtools_page",
      "web_accessible_resources", "content_scripts", "options_page",
      "default_locale", "content_security_policy", "minimum_chrome_version",
    ]);
    const estranhas = Object.keys(manifest).filter((k) => !CONHECIDAS.has(k));
    expect(estranhas, `chaves não reconhecidas: ${estranhas.join(", ")}`).toEqual([]);
  });
});

describe("carregamento — JavaScript", () => {
  const arquivos = jsDeSrc();

  it.each(arquivos)("%s parseia", (rel) => {
    // Módulo ES não roda em `new Function`; o que interessa aqui é o parse,
    // então tiramos import/export antes de checar. O `[\s\S]` é essencial:
    // vários arquivos usam import multilinha, e um stripper de uma linha só
    // deixaria o `} from "..."` solto — falso positivo em metade do projeto.
    const semModulo = ler(rel)
      .replace(/^import\b[\s\S]*?from\s*["'][^"']+["'];?[ \t]*\r?\n/gm, "")
      .replace(/^import\s+["'][^"']+["'];?[ \t]*\r?\n/gm, "")
      .replace(/^export\s+/gm, "");
    expect(() => new Function(semModulo)).not.toThrow();
  });

  it("todo import relativo aponta para um arquivo que existe", () => {
    const quebrados = [];
    for (const rel of arquivos) {
      // Sem tirar os comentários, um `from "..."` citado numa explicação vira
      // import quebrado. Aconteceu com o comentário que explica esta regra.
      const codigo = ler(rel)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      for (const m of codigo.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const alvo = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1]));
        if (!existe(alvo)) quebrados.push(`${alvo} (de ${rel})`);
      }
    }
    expect(quebrados, `imports quebrados: ${quebrados.join(", ")}`).toEqual([]);
  });

  it("todo ponto de entrada do manifest é alcançável", () => {
    // Não é o mesmo que "arquivo órfão" (isso o teste de higiene já cobre por
    // export sem consumidor). Aqui interessa só o que o Chrome carrega
    // sozinho: se um destes sumir, a extensão instala e não funciona.
    const entradas = [
      manifest.background.service_worker,
      manifest.action.default_popup,
      manifest.devtools_page,
    ];
    for (const rel of entradas) {
      expect(existe(rel), `${rel} não existe`).toBe(true);
      expect(ler(rel).trim().length, `${rel} está vazio`).toBeGreaterThan(0);
    }
  });
});

describe("carregamento — páginas HTML", () => {
  const paginas = ["src/popup/popup.html", "src/devtools/painel.html", "devtools.html"];

  it.each(paginas)("%s referencia só arquivos que existem", (rel) => {
    const dir = path.posix.dirname(rel);
    const refs = [...ler(rel).matchAll(/(?:href|src)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((r) => !r.startsWith("http") && !r.startsWith("data:"));
    const faltando = refs.filter((r) => !existe(path.posix.join(dir, r)));
    expect(faltando, `${rel} aponta para: ${faltando.join(", ")}`).toEqual([]);
  });

  it("o painel do DevTools carrega o JS como módulo", () => {
    // painel.js importa de core/; sem type="module" o Chrome recusa o import
    // e a aba abre em branco.
    expect(ler("src/devtools/painel.html")).toMatch(/<script\s+type="module"\s+src="painel\.js"/);
  });
});
