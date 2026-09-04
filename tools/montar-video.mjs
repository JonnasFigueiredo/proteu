// Monta o vídeo do LinkedIn a partir da gravação de tela.
//
// A gravação sai em paisagem (1920x1080). O feed é consumido no celular, então
// o arquivo publicado é 1080x1350, proporção 4:5, recortado da região onde a
// ação acontece. Recortar 4:5 de uma captura em paisagem é viável; gravar 9:16
// direto exigiria uma janela de navegador alta e estreita que não cabe na tela.
//
// Uso:
//   node tools/montar-video.mjs bruto.mp4
//   node tools/montar-video.mjs bruto.mp4 --de 00:00:04 --ate 00:00:52
//   node tools/montar-video.mjs bruto.mp4 --x 260 --y 0        # move o recorte
//   node tools/montar-video.mjs bruto.mp4 --sem-legenda
//   node tools/montar-video.mjs bruto.mp4 --quadros            # só extrai amostras
//
// O corte (--de/--ate) vem ANTES do recorte, então os tempos são os da gravação
// original. As legendas de docs/legendas-video.srt começam em zero, ou seja,
// no primeiro quadro DEPOIS do corte.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const SRT = path.join(RAIZ, "docs", "legendas-video.srt");
const SAIDA_DIR = path.join(RAIZ, "dist", "video");

// O winget põe o ffmpeg no PATH do usuário, mas um shell já aberto não enxerga
// a mudança. Procurar o executável evita "funciona aqui e não aí".
const CANDIDATOS = [
  "ffmpeg",
  path.join(process.env.LOCALAPPDATA || "", "Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe"),
];

function acharFfmpeg() {
  for (const c of CANDIDATOS) {
    try {
      execFileSync(c, ["-hide_banner", "-version"], { stdio: "pipe" });
      return c;
    } catch { /* tenta o próximo */ }
  }
  console.error("ffmpeg não encontrado. Instale com: winget install Gyan.FFmpeg");
  process.exit(1);
}

const args = process.argv.slice(2);
const entrada = args.find((a) => !a.startsWith("--"));
if (!entrada || !fs.existsSync(entrada)) {
  console.error("informe o arquivo da gravação: node tools/montar-video.mjs bruto.mp4");
  process.exit(1);
}
const opt = (nome, padrao = null) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : padrao;
};
const tem = (nome) => args.includes(`--${nome}`);

const FFMPEG = acharFfmpeg();
const LARGURA = 1080;
const ALTURA = 1350;

fs.mkdirSync(SAIDA_DIR, { recursive: true });
const base = path.basename(entrada, path.extname(entrada));

// --- amostras de quadro -----------------------------------------------------
// Antes de gastar minutos codificando, dá para conferir enquadramento e se a
// legenda cobre algo importante olhando alguns PNGs.
if (tem("quadros")) {
  const dir = path.join(SAIDA_DIR, `${base}-quadros`);
  fs.mkdirSync(dir, { recursive: true });
  execFileSync(FFMPEG, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", entrada,
    "-vf", "fps=1/3", // um quadro a cada 3 segundos
    path.join(dir, "q%03d.png"),
  ], { stdio: "inherit" });
  console.log(`quadros em ${dir}`);
  process.exit(0);
}

// --- corte ------------------------------------------------------------------
const de = opt("de");
const ate = opt("ate");
const corte = [];
if (de) corte.push("-ss", de);
if (ate) corte.push("-to", ate);

// --- recorte 4:5 ------------------------------------------------------------
// A janela de 1080x1350 não cabe em 1080 de altura, então a imagem é ampliada
// antes de recortar. O fator 1.25 mantém a interface legível no celular sem
// deixar a imagem macia demais.
const x = opt("x", "(iw-ow)/2");
const y = opt("y", "0");
const filtros = [
  "scale=iw*1.25:ih*1.25:flags=lanczos",
  `crop=${LARGURA}:${ALTURA}:${x}:${y}`,
];

if (!tem("sem-legenda")) {
  if (!fs.existsSync(SRT)) {
    console.error(`legendas não encontradas em ${SRT}`);
    process.exit(1);
  }
  // O filtro subtitles trata ":" e "\" como separadores do próprio filtro, e o
  // caminho no Windows tem os dois. Daí o escape do dois-pontos da unidade.
  const caminho = SRT.replace(/\\/g, "/").replace(/:/g, "\\:");
  const estilo = [
    "FontName=Arial",
    "FontSize=17",
    "Bold=1",
    "PrimaryColour=&H00FFFFFF",
    "BackColour=&H99000000",
    "BorderStyle=3", // caixa sólida atrás do texto, legível sobre tela clara
    "Outline=2",
    "Shadow=0",
    "MarginV=90",   // acima da área que a interface do LinkedIn cobre
  ].join(",");
  filtros.push(`subtitles='${caminho}':force_style='${estilo}'`);
}

const saida = path.join(SAIDA_DIR, `${base}-linkedin.mp4`);

// yuv420p e faststart: sem os dois o vídeo não toca em parte dos players, e a
// reprodução só começa depois de baixar o arquivo inteiro.
execFileSync(FFMPEG, [
  "-y", "-hide_banner", "-loglevel", "error", "-stats",
  ...corte,
  "-i", entrada,
  "-vf", filtros.join(","),
  "-c:v", "libx264", "-preset", "slow", "-crf", "20",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-r", "30",
  "-c:a", "aac", "-b:a", "128k",
  saida,
], { stdio: "inherit" });

const kb = fs.statSync(saida).size / 1024;
console.log(`\n${saida}`);
console.log(`${(kb / 1024).toFixed(1)} MB · ${LARGURA}x${ALTURA}`);
