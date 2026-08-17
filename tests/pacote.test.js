// O que compõe a extensão distribuída.
//
// O empacotador saiu do projeto; quem define o conteúdo agora é o
// `sincronizar.mjs`, e é a lista dele que estes testes travam. As regras que o
// Google verifica continuam aqui: manifest na raiz, nada de teste/dependência
// junto, e os campos obrigatórios da listagem preenchidos.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const sincronizador = fs.readFileSync(path.join(RAIZ, "sincronizar.mjs"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.json"), "utf8"));

const ESPERADO_NO_PACOTE = ["manifest.json", "devtools.html", "icons", "src", "LICENSE", "NOTICE"];

/** Extrai uma lista de strings declarada como `const NOME = [...]`. */
function listaDe(fonte, nome) {
  const m = fonte.match(new RegExp(`const ${nome} = \\[([^\\]]+)\\]`));
  return m ? m[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, "")) : null;
}

describe("sincronizar — a pasta carregada é a extensão inteira", () => {
  // Bug real e caro de achar: a pasta que o Chrome carregava ficou parada numa
  // versão antiga enquanto o repositório seguia em frente. O sintoma chegou
  // como bug de interface ("removi o selo e ele continua na tela").

  it("o sincronizador falha alto em vez de fingir sucesso", () => {
    // A causa raiz não foi copiar errado: foi copiar errado em silêncio.
    expect(sincronizador).toMatch(/process\.exit\(1\)/);
    expect(sincronizador, "precisa conferir a versão que chegou no destino")
      .toMatch(/versaoDestino/);
  });

  it("remove sobras de sincronizações antigas", () => {
    // node_modules e tests/ já ficaram parados na pasta de destino, engordando
    // o que se carrega no Chrome com coisa que não é da extensão.
    expect(sincronizador, "precisa espelhar, não só copiar por cima")
      .toMatch(/unlinkSync|rmdirSync/);
  });
});

describe("pacote — o que compõe a extensão", () => {
  it("inclui o que a extensão roda, mais LICENSE e NOTICE", () => {
    const itens = listaDe(sincronizador, "INCLUIR");
    expect(itens, "constante INCLUIR não encontrada").toBeTruthy();
    expect(itens).toEqual(ESPERADO_NO_PACOTE);
  });

  it("os arquivos listados existem de fato", () => {
    for (const alvo of ESPERADO_NO_PACOTE) {
      expect(fs.existsSync(path.join(RAIZ, alvo)), alvo).toBe(true);
    }
  });

  it("a licença acompanha a distribuição (Apache 2.0, seção 4a)", () => {
    // Distribuir sem a licença descumpriria a própria licença escolhida.
    const itens = listaDe(sincronizador, "INCLUIR");
    expect(itens).toContain("LICENSE");
    expect(itens).toContain("NOTICE");
  });

  it("todo arquivo que a extensão carrega está dentro do que é empacotado", () => {
    // Se um caminho do manifest apontar para fora de src/ ou icons/, o pacote
    // sai quebrado e a extensão nem carrega.
    const caminhos = [
      manifest.background?.service_worker,
      manifest.action?.default_popup,
      ...Object.values(manifest.icons || {}),
    ].filter(Boolean);
    for (const c of caminhos) {
      expect(fs.existsSync(path.join(RAIZ, c)), `${c} não existe`).toBe(true);
      expect(/^(src|icons)\//.test(c), `${c} fora das pastas empacotadas`).toBe(true);
    }
  });
});

describe("pacote — exigências da loja", () => {
  it("nome cabe em 45 caracteres e descrição em 132", () => {
    expect(manifest.name.length).toBeLessThanOrEqual(45);
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.description.length).toBeLessThanOrEqual(132);
  });

  it("tem os 4 tamanhos de ícone que a loja usa", () => {
    expect(Object.keys(manifest.icons).sort()).toEqual(["128", "16", "32", "48"]);
    for (const rel of Object.values(manifest.icons)) {
      expect(fs.statSync(path.join(RAIZ, rel)).size).toBeGreaterThan(0);
    }
  });

  it("declara o service worker como módulo ES (o core usa import)", () => {
    expect(manifest.background.type).toBe("module");
  });
});

describe("manifest — recursos acessíveis pela página", () => {
  // O content script do menu de contexto carrega o motor de seletores por
  // import() dinâmico. Módulo que não está em web_accessible_resources não
  // carrega, e o import falha em silêncio: clicar no menu não faz nada.
  //
  // Já aconteceu — `leitura-dom.js` era importado e não estava declarado.

  const acessiveis = new Set(
    (manifest.web_accessible_resources || []).flatMap((r) => r.resources || [])
  );

  /** Resolve um caminho relativo entre módulos, no estilo do navegador. */
  function resolver(deArquivo, relativo) {
    const base = path.posix.dirname(deArquivo);
    return path.posix.normalize(path.posix.join(base, relativo));
  }

  it("todo módulo carregado por getURL() está declarado", () => {
    const faltando = [];
    for (const arquivo of ["src/content/seletor.js", "src/content/content.js"]) {
      const txt = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
      for (const m of txt.matchAll(/getURL\(\s*["'`]([^"'`]+)["'`]/g)) {
        if (!acessiveis.has(m[1])) faltando.push(`${m[1]} (usado em ${arquivo})`);
      }
    }
    expect(faltando, `faltam em web_accessible_resources: ${faltando.join(", ")}`).toEqual([]);
  });

  it("os imports desses módulos também estão declarados", () => {
    // Um módulo acessível que importa outro arrasta o segundo junto: o
    // navegador vai buscá-lo, e ele precisa ser acessível também.
    const faltando = [];
    for (const rel of acessiveis) {
      if (!rel.endsWith(".js")) continue;
      const txt = fs.readFileSync(path.join(RAIZ, rel), "utf8");
      for (const m of txt.matchAll(/^import\s[^"']*["']([^"']+)["']/gm)) {
        if (!m[1].startsWith(".")) continue; // pacote externo: não existe aqui
        const alvo = resolver(rel, m[1]);
        if (!acessiveis.has(alvo)) faltando.push(`${alvo} (importado por ${rel})`);
      }
    }
    expect(faltando, `imports em cadeia não declarados: ${faltando.join(", ")}`).toEqual([]);
  });

  it("todo recurso declarado existe de verdade", () => {
    for (const rel of acessiveis) {
      expect(fs.existsSync(path.join(RAIZ, rel)), `${rel} não existe`).toBe(true);
    }
  });

  it("a permissão de host é opcional, não obrigatória", () => {
    // É o que mantém a instalação padrão sem o aviso de "ler todos os seus
    // dados". Promovê-la para `host_permissions` mudaria a listagem na loja.
    expect(manifest.host_permissions).toBeUndefined();
    // Sem <all_urls>: ele engloba file:// e outros esquemas que o Chrome
    // concede separadamente, e a checagem daria falso-negativo com a
    // permissao ligada. O menu nunca seria montado.
    expect(manifest.optional_host_permissions).toEqual(["http://*/*", "https://*/*"]);
    expect(manifest.optional_host_permissions).not.toContain("<all_urls>");
    expect(manifest.permissions).toEqual(["contextMenus", "storage", "activeTab", "scripting"]);
  });
});

describe("manifest — painel do DevTools", () => {
  it("declara a página do DevTools e ela existe", () => {
    expect(manifest.devtools_page).toBe("devtools.html");
    expect(fs.existsSync(path.join(RAIZ, manifest.devtools_page))).toBe(true);
  });

  it("os caminhos de panels.create() valem a partir da raiz da extensão", () => {
    // O Chrome monta a URL do painel como origem + "/" + caminho. Escrevê-los
    // relativos ao devtools.html cria o painel apontando para um endereço
    // inexistente: a aba aparece no DevTools e abre em branco, sem erro.
    const js = fs.readFileSync(path.join(RAIZ, "src/devtools/devtools.js"), "utf8");
    const args = [...js.matchAll(/["']([^"']+\.(?:html|png))["']/g)].map((m) => m[1]);
    expect(args.length, "nenhum caminho encontrado em panels.create()").toBeGreaterThan(0);
    for (const rel of args) {
      expect(rel.startsWith("."), `${rel} é relativo ao arquivo, não à raiz`).toBe(false);
      expect(fs.existsSync(path.join(RAIZ, rel)), `${rel} não existe a partir da raiz`).toBe(true);
    }
  });

  it("o painel carrega CSS e JS que existem", () => {
    const html = fs.readFileSync(path.join(RAIZ, "src/devtools/painel.html"), "utf8");
    const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    for (const rel of refs) {
      // Estes são relativos ao próprio painel.html, e não à raiz.
      const alvo = path.join(RAIZ, "src/devtools", rel);
      expect(fs.existsSync(alvo), `${rel} não existe ao lado do painel.html`).toBe(true);
    }
  });
});

describe("manifest — origens pedidas e conferidas batem", () => {
  // O popup pede um conjunto de origens, o service worker confere outro e o
  // manifest declara um terceiro. Se os três divergirem, `request()` é
  // recusado ou `contains()` nunca casa — e o menu não aparece, sem erro.
  //
  // Foi assim com `<all_urls>`: declarado e conferido, mas o Chrome concede
  // http e https à parte, então a checagem dava falso-negativo com a permissão
  // visivelmente ligada na tela de extensões.

  const origensDe = (arquivo, ancora) => {
    const txt = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
    const i = txt.indexOf(ancora);
    expect(i, `âncora "${ancora}" sumiu de ${arquivo}`).toBeGreaterThan(-1);
    const bloco = txt.slice(i, txt.indexOf("]", i));
    return [...bloco.matchAll(/"([^"]*:\/\/[^"]*|<all_urls>)"/g)].map((m) => m[1]);
  };

  it("popup, service worker e manifest pedem as mesmas origens", () => {
    const doManifest = manifest.optional_host_permissions;
    const doWorker = origensDe("src/background/service-worker.js", "const ORIGENS = [");
    const doPopup = origensDe("src/popup/popup.js", "const PERMISSAO_SELETOR = { origins: [");

    expect(doWorker).toEqual(doManifest);
    expect(doPopup).toEqual(doManifest);
  });

  it("nenhum deles usa <all_urls>", () => {
    for (const [onde, lista] of [
      ["manifest", manifest.optional_host_permissions],
      ["service worker", origensDe("src/background/service-worker.js", "const ORIGENS = [")],
      ["popup", origensDe("src/popup/popup.js", "const PERMISSAO_SELETOR = { origins: [")],
    ]) {
      expect(lista, `${onde} voltou a usar <all_urls>`).not.toContain("<all_urls>");
    }
  });
});

describe("manifest — a página do DevTools mora na raiz", () => {
  it("devtools_page está na raiz, não dentro de src/", () => {
    // chrome.devtools.panels.create() recebe caminhos que a documentação diz
    // serem relativos à raiz da extensão, mas há versões que os resolvem
    // relativos à própria página do DevTools. Com o devtools.html na raiz, as
    // duas leituras coincidem e o painel para de depender dessa aposta.
    //
    // Errar a aposta custa caro: a aba aparece no DevTools e abre em branco.
    expect(manifest.devtools_page).toBe("devtools.html");
    expect(manifest.devtools_page).not.toContain("/");
  });

  it("os caminhos de panels.create() resolvem igual das duas formas", () => {
    const js = fs.readFileSync(path.join(RAIZ, "src/devtools/devtools.js"), "utf8");
    const dirDevtools = path.posix.dirname(manifest.devtools_page);
    for (const m of js.matchAll(/["']([^"']+\.(?:html|png))["']/g)) {
      const rel = m[1];
      const daRaiz = rel;
      const daPagina = path.posix.normalize(path.posix.join(dirDevtools, rel));
      expect(daPagina, `${rel} resolve diferente conforme a interpretação`).toBe(daRaiz);
      expect(fs.existsSync(path.join(RAIZ, rel)), `${rel} não existe`).toBe(true);
    }
  });
});

describe("pacote — ferramenta de desenvolvimento não vaza", () => {
  // O gerador de ícones é uma página HTML dentro de icons/. O filtro antigo
  // excluía por extensão (.ps1, .md), e por isso ele entrou na distribuição
  // quando o gerador deixou de ser PowerShell — a extensão também é HTML.
  //
  // Antes isto conferia o .zip pronto. Sem empacotador, a checagem passou a
  // ser na regra que decide o que sai: é ela que precisa estar certa, e vale
  // sem depender de alguém ter rodado um build antes do teste.

  const excluir = sincronizador.match(/const EXCLUIR = \[([\s\S]*?)\];/);

  it("o gerador de ícones é excluído por nome, não por extensão", () => {
    expect(excluir, "constante EXCLUIR não encontrada").toBeTruthy();
    expect(excluir[1]).toMatch(/gerar-icones/);
  });

  it("os quatro ícones do manifest existem para ser copiados", () => {
    for (const rel of Object.values(manifest.icons)) {
      expect(fs.existsSync(path.join(RAIZ, rel)), `${rel} não existe`).toBe(true);
    }
  });

  it("a página do DevTools está na raiz, dentro do que é copiado", () => {
    expect(fs.existsSync(path.join(RAIZ, manifest.devtools_page))).toBe(true);
    expect(listaDe(sincronizador, "INCLUIR")).toContain(manifest.devtools_page);
  });
});
