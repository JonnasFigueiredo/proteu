// Espelha a extensão para a pasta que o Chrome carrega como "sem compactação".
//
// Existe porque sincronizar à mão falhou de um jeito silencioso: o comando
// usado (robocopy) não existia no shell, o erro foi engolido por um redirect, e
// a pasta ficou semanas numa versão antiga. O sintoma chegou como bug de
// interface ("removi o selo e ele continua na tela") quando na verdade o Chrome
// nunca tinha recebido o código novo.
//
// Por isso aqui: mesma lista de arquivos do empacotar.mjs (uma fonte só), e
// falha barulhenta com código de saída != 0.
//
// Uso: node sincronizar.mjs [destino]      (padrão: D:/Projetos/proteu)

import fs from "node:fs";
import path from "node:path";

const RAIZ = import.meta.dirname;
const DESTINO = process.argv[2] || "D:/Projetos/proteu";

// Precisa bater com empacotar.mjs: o que o Chrome carrega tem que ser o mesmo
// que vai para a loja, senão o teste local não vale para o pacote publicado.
const INCLUIR = ["manifest.json", "devtools.html", "icons", "src", "LICENSE", "NOTICE"];
const EXCLUIR = [/\.ps1$/i, /\.md$/i, /(^|\/)gerar-icones\.html$/i];

function listar(rel, acc = []) {
  const abs = path.join(RAIZ, rel);
  if (fs.statSync(abs).isDirectory()) {
    for (const e of fs.readdirSync(abs).sort()) listar(path.join(rel, e), acc);
  } else {
    const norm = rel.replace(/\\/g, "/");
    if (!EXCLUIR.some((re) => re.test(norm))) acc.push(norm);
  }
  return acc;
}

for (const alvo of INCLUIR) {
  if (!fs.existsSync(path.join(RAIZ, alvo))) {
    console.error(`Falta na origem: ${alvo}`);
    process.exit(1);
  }
}

const arquivos = listar(".").length ? INCLUIR.flatMap((i) => listar(i)) : [];

if (!fs.existsSync(DESTINO)) {
  console.error(`Destino não existe: ${DESTINO}`);
  process.exit(1);
}

// Espelho de verdade: o que sobrou de sync antigo tem que sair. Já aconteceu de
// node_modules e tests/ ficarem parados lá dentro.
const esperados = new Set(arquivos);
function limpar(rel = "") {
  const abs = path.join(DESTINO, rel);
  for (const e of fs.readdirSync(abs)) {
    const filho = rel ? `${rel}/${e}` : e;
    const absFilho = path.join(DESTINO, filho);
    if (fs.statSync(absFilho).isDirectory()) {
      limpar(filho);
      if (fs.readdirSync(absFilho).length === 0) fs.rmdirSync(absFilho);
    } else if (!esperados.has(filho)) {
      fs.unlinkSync(absFilho);
    }
  }
}
limpar();

let copiados = 0;
for (const rel of arquivos) {
  const destino = path.join(DESTINO, rel);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, rel), destino);
  copiados++;
}

// Confere o que chegou do outro lado, não o que se pretendia mandar.
const versaoOrigem = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.json"), "utf8")).version;
const versaoDestino = JSON.parse(fs.readFileSync(path.join(DESTINO, "manifest.json"), "utf8")).version;
if (versaoOrigem !== versaoDestino) {
  console.error(`Versão não bateu: origem ${versaoOrigem}, destino ${versaoDestino}`);
  process.exit(1);
}

console.log(`${copiados} arquivos → ${DESTINO}`);
console.log(`versão ${versaoDestino} confirmada no destino`);
console.log("Recarregue a extensão em chrome://extensions para o Chrome ver a mudança.");
