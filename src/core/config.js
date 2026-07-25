// Config da extensão — lógica pura, testável sem chrome.
//
// A persistência real usa chrome.storage.sync (ver src/popup/storage.js),
// mas toda a validação/normalização/merge vive aqui para poder ser coberta
// por teste. Persistir config "de verdade" é a falha nº 1 das concorrentes.

import { normalizarSeed } from "./seed.js";

/** Config padrão — defaults sensatos para funcionar no primeiro clique. */
export function configPadrao() {
  return {
    seed: null, // definida no primeiro uso (gerarSeedAleatoria)
    documentos: {
      mascara: true,
      cnpjAlfanumerico: false,
      cnpjExcluirAmbiguas: false,
    },
    insercao: {
      modo: "valor", // "valor" | "colar"
    },
    tema: "auto", // "auto" (segue o sistema) | "claro" | "escuro"
    idiomaUI: null, // "pt" | "es" | "en"; null = ainda não escolhido (detecta no 1º uso)
    contador: 0, // avança a cada geração; garante reprodutibilidade por índice
  };
}

// Valores aceitos.
const TEMAS = ["auto", "claro", "escuro"];
const IDIOMAS = ["pt", "es", "en"];

/** Gera uma seed hex curta e aleatória (não faz parte da lógica determinística). */
export function gerarSeedAleatoria() {
  const bytes = new Uint8Array(3); // 6 chars hex
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function ehBool(v) {
  return typeof v === "boolean";
}

/**
 * Normaliza uma config possivelmente parcial/corrompida (vinda do storage)
 * numa config completa e válida. Descarta chaves desconhecidas e valores de
 * tipo errado, sempre caindo no default. Nunca lança.
 */
export function normalizarConfig(parcial) {
  const base = configPadrao();
  const p = parcial && typeof parcial === "object" ? parcial : {};

  const docs = p.documentos && typeof p.documentos === "object" ? p.documentos : {};
  const ins = p.insercao && typeof p.insercao === "object" ? p.insercao : {};

  const seed = normalizarSeed(p.seed); // null se inválida/ausente

  const contador =
    Number.isInteger(p.contador) && p.contador >= 0 ? p.contador : base.contador;

  return {
    seed: seed, // pode ser null; quem consome decide gerar uma nova
    documentos: {
      mascara: ehBool(docs.mascara) ? docs.mascara : base.documentos.mascara,
      cnpjAlfanumerico: ehBool(docs.cnpjAlfanumerico)
        ? docs.cnpjAlfanumerico
        : base.documentos.cnpjAlfanumerico,
      cnpjExcluirAmbiguas: ehBool(docs.cnpjExcluirAmbiguas)
        ? docs.cnpjExcluirAmbiguas
        : base.documentos.cnpjExcluirAmbiguas,
    },
    insercao: {
      modo: ins.modo === "colar" ? "colar" : base.insercao.modo,
    },
    tema: TEMAS.includes(p.tema) ? p.tema : base.tema,
    idiomaUI: IDIOMAS.includes(p.idiomaUI) ? p.idiomaUI : base.idiomaUI,
    contador,
  };
}

/**
 * Garante uma config pronta para uso: normaliza e, se não houver seed válida,
 * injeta uma nova seed aleatória. Retorna { config, seedNova } para o chamador
 * saber se precisa persistir.
 */
export function garantirConfig(parcial) {
  const config = normalizarConfig(parcial);
  let seedNova = false;
  if (!config.seed) {
    config.seed = gerarSeedAleatoria();
    seedNova = true;
  }
  return { config, seedNova };
}
