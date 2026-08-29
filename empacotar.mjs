// Empacota a extensão para a Chrome Web Store.
//
// A loja recebe um .zip com o manifest na RAIZ (não dentro de uma pasta). Só
// entra o que a extensão carrega em tempo de execução: testes, node_modules,
// git, documentação e scripts de build ficam de fora — código a mais é
// superfície de revisão a mais.
//
// O zip é escrito aqui em Node puro (zero dependências, como o resto do
// projeto). O `Compress-Archive` do PowerShell 5.1 grava os caminhos com
// barra invertida, o que viola o formato ZIP e pode quebrar o carregamento.
//
// Uso: node empacotar.mjs

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const RAIZ = import.meta.dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.json"), "utf8"));
const DESTINO = path.join(RAIZ, "dist");
const NOME = `proteu-qa-${manifest.version}.zip`;

// O que a extensão precisa para rodar, mais LICENSE e NOTICE: a seção 4(a) da
// Apache 2.0 exige que a licença acompanhe cada cópia distribuída, e o pacote
// da loja é uma distribuição.
const INCLUIR = ["manifest.json", "icons", "src", "LICENSE", "NOTICE"];
// Ferramentas de desenvolvimento que moram nessas pastas mas não são da extensão.
const EXCLUIR = [/\.ps1$/i, /\.md$/i];

function listar(rel, acc = []) {
  const abs = path.join(RAIZ, rel);
  if (fs.statSync(abs).isDirectory()) {
    for (const e of fs.readdirSync(abs).sort()) listar(path.join(rel, e), acc);
  } else {
    const norm = rel.replace(/\\/g, "/"); // ZIP exige barra normal
    if (!EXCLUIR.some((re) => re.test(norm))) acc.push(norm);
  }
  return acc;
}

const arquivos = INCLUIR.flatMap((i) => listar(i));

// Rede de segurança: nada de teste ou dependência pode vazar para o pacote.
const proibidos = arquivos.filter((f) => /(^|\/)(tests?|node_modules|\.git)(\/|$)/.test(f));
if (proibidos.length) {
  console.error("Arquivos indevidos no pacote:", proibidos);
  process.exit(1);
}
if (!arquivos.includes("manifest.json")) {
  console.error("manifest.json precisa estar na raiz do zip");
  process.exit(1);
}

// --- Escritor de ZIP (deflate) ----------------------------------------------

const TABELA_CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

const locais = [];
const central = [];
let deslocamento = 0;

for (const rel of arquivos) {
  const dados = fs.readFileSync(path.join(RAIZ, rel));
  const comprimido = zlib.deflateRawSync(dados, { level: 9 });
  const nome = Buffer.from(rel, "utf8");
  const crc = crc32(dados);

  const cabecalho = Buffer.alloc(30);
  cabecalho.writeUInt32LE(0x04034b50, 0); // assinatura local
  cabecalho.writeUInt16LE(20, 4); // versão mínima
  cabecalho.writeUInt16LE(0x0800, 6); // flag: nome em UTF-8
  cabecalho.writeUInt16LE(8, 8); // método: deflate
  cabecalho.writeUInt32LE(0, 10); // data/hora fixas → zip reprodutível
  cabecalho.writeUInt32LE(crc, 14);
  cabecalho.writeUInt32LE(comprimido.length, 18);
  cabecalho.writeUInt32LE(dados.length, 22);
  cabecalho.writeUInt16LE(nome.length, 26);
  locais.push(cabecalho, nome, comprimido);

  const entrada = Buffer.alloc(46);
  entrada.writeUInt32LE(0x02014b50, 0); // assinatura central
  entrada.writeUInt16LE(20, 4);
  entrada.writeUInt16LE(20, 6);
  entrada.writeUInt16LE(0x0800, 8);
  entrada.writeUInt16LE(8, 10);
  entrada.writeUInt32LE(0, 12);
  entrada.writeUInt32LE(crc, 16);
  entrada.writeUInt32LE(comprimido.length, 20);
  entrada.writeUInt32LE(dados.length, 24);
  entrada.writeUInt16LE(nome.length, 28);
  entrada.writeUInt32LE(deslocamento, 42);
  central.push(entrada, nome);

  deslocamento += cabecalho.length + nome.length + comprimido.length;
}

const corpoCentral = Buffer.concat(central);
const fim = Buffer.alloc(22);
fim.writeUInt32LE(0x06054b50, 0);
fim.writeUInt16LE(arquivos.length, 8);
fim.writeUInt16LE(arquivos.length, 10);
fim.writeUInt32LE(corpoCentral.length, 12);
fim.writeUInt32LE(deslocamento, 16);

fs.mkdirSync(DESTINO, { recursive: true });
const zip = path.join(DESTINO, NOME);
fs.writeFileSync(zip, Buffer.concat([...locais, corpoCentral, fim]));

const kb = (fs.statSync(zip).size / 1024).toFixed(1);
console.log(`${NOME} — ${arquivos.length} arquivos, ${kb} KB`);
console.log(`em: ${zip}`);
