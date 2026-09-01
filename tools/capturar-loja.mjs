// Gera os PNGs de 1280x800 da listagem da Chrome Web Store.
//
// A loja pede exatamente 1280x800 (ou 640x400) em PNG. Fotografar a tela na mão
// erra o tamanho por alguns pixels e a loja recusa, então quem tira a foto é o
// Chrome headless, com a viewport travada na medida certa.
//
// Os slides mostram o popup DE VERDADE, servido por tests/e2e/servir.mjs com um
// stub das APIs do Chrome. É de propósito: captura de tela de uma maquete
// envelhece sozinha, e a loja compara o que você promete com o que entrega.
//
// Uso: node tests/e2e/servir.mjs   (num terminal)
//      node tools/capturar-loja.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const DESTINO = path.join(RAIZ, "docs", "imagens");
const SERVIDOR = "http://localhost:8791";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].find((c) => fs.existsSync(c));

if (!CHROME) {
  console.error("Chrome não encontrado nos caminhos padrão do Windows.");
  process.exit(1);
}

// A loja aceita no máximo 5 capturas, então só estas cinco viram arquivo. A
// página tem nove slides: os outros quatro (texto, localizadores, idiomas e
// privacidade) continuam lá como alternativas, e trocar a listagem é trocar uma
// linha daqui.
//
// O primeiro número é o slide na página; o segundo é a posição na listagem, que
// vira o prefixo do arquivo. A loja ordena por upload e é fácil errar a
// sequência no meio do envio, então o nome carrega a ordem.
const SLIDES = [
  [1, "documentos"],
  [3, "casos-limite"],
  [4, "mapear"],
  [7, "senhas"],
  [8, "painel-lateral"],
];

fs.mkdirSync(DESTINO, { recursive: true });

// Sem isto o Chrome reaproveita um processo já aberto e ignora o headless.
const PERFIL = path.join(process.env.TEMP || "/tmp", "proteu-captura");

// Só os arquivos gerados agora ficam na pasta: sobra de uma execução anterior
// com outra seleção seria fácil de subir por engano.
for (const antigo of fs.readdirSync(DESTINO).filter((f) => f.endsWith(".png"))) {
  fs.unlinkSync(path.join(DESTINO, antigo));
}

for (const [i, [num, nome]] of SLIDES.entries()) {
  const saida = path.join(DESTINO, `${String(i + 1).padStart(2, "0")}-${nome}.png`);
  const url = `${SERVIDOR}/tests/e2e/screenshots.html?slide=${num}`;
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--user-data-dir=${PERFIL}`,
    "--window-size=1280,800",
    // Os iframes carregam o popup e só depois o script troca de aba; sem esta
    // espera a foto sai na aba Perfil, seja qual for o slide.
    "--virtual-time-budget=6000",
    `--screenshot=${saida}`,
    url,
  ], { stdio: "pipe" });

  const { size } = fs.statSync(saida);
  console.log(`${path.basename(saida)} — ${(size / 1024).toFixed(0)} KB`);
}

console.log(`\n${SLIDES.length} imagens em ${DESTINO}`);
