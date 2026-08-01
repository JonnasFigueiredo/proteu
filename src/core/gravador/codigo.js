// Ponto único de entrada da geração de código: normaliza as ações e despacha
// para o dialeto escolhido. A aba Gravador só conhece este módulo.

import { normalizar } from "./acoes.js";
import { paraSeleniumJava, paraSeleniumPython } from "./selenium.js";
import { paraPlaywrightJs, paraPlaywrightPython } from "./playwright.js";

/** Formatos oferecidos na aba Gravador, na ordem em que aparecem. */
export const FORMATOS = [
  {
    id: "selenium-java",
    rotulo: "Selenium · Java",
    extensao: "java",
    gerar: paraSeleniumJava,
  },
  {
    id: "selenium-python",
    rotulo: "Selenium · Python",
    extensao: "py",
    gerar: paraSeleniumPython,
  },
  {
    id: "playwright-js",
    rotulo: "Playwright · JavaScript",
    extensao: "spec.js",
    gerar: paraPlaywrightJs,
  },
  {
    id: "playwright-python",
    rotulo: "Playwright · Python",
    extensao: "py",
    gerar: paraPlaywrightPython,
  },
];

export const FORMATO_PADRAO = "playwright-js";

/**
 * Gera o código de um roteiro.
 * @param {Array} acoes - ações cruas ou já normalizadas
 * @param {string} formatoId
 * @param {{nome?: string, jaNormalizado?: boolean}} opcoes
 * @returns {string}
 */
export function gerarCodigo(acoes, formatoId, opcoes = {}) {
  const formato = FORMATOS.find((f) => f.id === formatoId) ||
    FORMATOS.find((f) => f.id === FORMATO_PADRAO);
  const prontas = opcoes.jaNormalizado ? acoes || [] : normalizar(acoes);
  return formato.gerar(prontas, opcoes);
}

/** Nome de arquivo sugerido para o download. */
export function nomeArquivo(formatoId, nome = "fluxo") {
  const formato = FORMATOS.find((f) => f.id === formatoId) ||
    FORMATOS.find((f) => f.id === FORMATO_PADRAO);
  const base = String(nome).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "fluxo";
  // Java exige que o arquivo tenha o nome da classe pública.
  if (formato.id === "selenium-java") {
    const classe = base.split("-").map((p) => (p ? p[0].toUpperCase() + p.slice(1) : "")).join("");
    return `${classe || "FluxoGravado"}.java`;
  }
  return `${base}.${formato.extensao}`;
}
