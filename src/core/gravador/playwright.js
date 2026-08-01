// Gerador de código Playwright (JavaScript e Python).
//
// Lógica pura: recebe as ações normalizadas e devolve texto. Nada de DOM.
//
// O Playwright resolve sozinho duas coisas que no Selenium dão trabalho:
//   - Shadow DOM aberto: o seletor CSS atravessa sem sintaxe especial, então a
//     cadeia de hosts vira só um comentário de contexto.
//   - Espera: os locators já esperam o elemento ficar acionável, então não
//     emitimos sleep nem wait explícito — isso é o que torna o script estável.
//
// O que ainda exige cuidado é iframe, que precisa de frameLocator().

/** Escapa uma string para literal JavaScript com aspas simples. */
function jsStr(v) {
  return `'${String(v ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;
}

/** Escapa uma string para literal Python. */
function pyStr(v) {
  return `"${String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/**
 * Expressão de locator. O Playwright aceita CSS e XPath no mesmo método —
 * XPath é reconhecido pelo prefixo `//` ou `xpath=`.
 */
function locator(acao, escapar, raiz) {
  const sel = acao.seletor;
  const frames = acao.caminhoFrame || [];
  let base = raiz;
  for (const f of frames) {
    base += `.frame_locator(${escapar(f)})`;
  }
  if (sel.sintaxe === "texto-link") {
    return `${base}.get_by_role("link", name=${escapar(sel.valor)})`;
  }
  const alvo = sel.sintaxe === "xpath" ? `xpath=${sel.valor}` : sel.valor;
  return `${base}.locator(${escapar(alvo)})`;
}

/** Versão JS do locator (camelCase nos métodos). */
function locatorJs(acao) {
  const sel = acao.seletor;
  let base = "page";
  for (const f of acao.caminhoFrame || []) {
    base += `.frameLocator(${jsStr(f)})`;
  }
  if (sel.sintaxe === "texto-link") {
    return `${base}.getByRole('link', { name: ${jsStr(sel.valor)} })`;
  }
  const alvo = sel.sintaxe === "xpath" ? `xpath=${sel.valor}` : sel.valor;
  return `${base}.locator(${jsStr(alvo)})`;
}

// --- JavaScript --------------------------------------------------------------

function acaoJs(acao) {
  const ind = "  ";
  if (acao.tipo === "navegar") {
    return acao.resultante
      ? `${ind}await page.waitForURL(${jsStr(acao.valor)});`
      : `${ind}await page.goto(${jsStr(acao.valor)});`;
  }
  if (!acao.seletor) return `${ind}// ação sem seletor: ${acao.tipo}`;

  const sombra = acao.caminhoShadow || [];
  const nota = sombra.length
    ? `${ind}// dentro de Shadow DOM (${sombra.join(" » ")}) — o locator atravessa sozinho\n`
    : "";
  const loc = locatorJs(acao);

  switch (acao.tipo) {
    case "clicar":
      return `${nota}${ind}await ${loc}.click();`;
    case "preencher":
      return `${nota}${ind}await ${loc}.fill(${jsStr(acao.valor)});`;
    case "selecionar":
      return `${nota}${ind}await ${loc}.selectOption(${jsStr(acao.valor)});`;
    case "marcar":
      return `${nota}${ind}await ${loc}.${acao.valor ? "check" : "uncheck"}();`;
    case "tecla":
      return `${nota}${ind}await ${loc}.press(${jsStr(acao.valor)});`;
    case "submeter":
      return `${nota}${ind}await ${loc}.press('Enter');`;
    case "verificar":
      return acao.modo === "valor"
        ? `${nota}${ind}await expect(${loc}).toHaveValue(${jsStr(acao.valor)});`
        : `${nota}${ind}await expect(${loc}).toHaveText(${jsStr(acao.valor)});`;
    default:
      return `${ind}// tipo não suportado: ${acao.tipo}`;
  }
}

/** Gera um spec do Playwright Test em JavaScript. */
export function paraPlaywrightJs(acoes, opcoes = {}) {
  const titulo = String(opcoes.nome || "fluxo gravado").replace(/'/g, "\\'");
  const corpo = (acoes || []).map(acaoJs).join("\n");

  return `// Gerado pela Proteu QA — gravador de ações.
// Playwright Test. Os locators já esperam o elemento ficar acionável, então
// não há sleep aqui de propósito: sleep é o que deixa suite instável.

import { test, expect } from '@playwright/test';

test('${titulo}', async ({ page }) => {
${corpo}
});
`;
}

// --- Python ------------------------------------------------------------------

function acaoPy(acao) {
  const ind = "    ";
  if (acao.tipo === "navegar") {
    return acao.resultante
      ? `${ind}page.wait_for_url(${pyStr(acao.valor)})`
      : `${ind}page.goto(${pyStr(acao.valor)})`;
  }
  if (!acao.seletor) return `${ind}# ação sem seletor: ${acao.tipo}`;

  const sombra = acao.caminhoShadow || [];
  const nota = sombra.length
    ? `${ind}# dentro de Shadow DOM (${sombra.join(" » ")}) — o locator atravessa sozinho\n`
    : "";
  const loc = locator(acao, pyStr, "page");

  switch (acao.tipo) {
    case "clicar":
      return `${nota}${ind}${loc}.click()`;
    case "preencher":
      return `${nota}${ind}${loc}.fill(${pyStr(acao.valor)})`;
    case "selecionar":
      return `${nota}${ind}${loc}.select_option(${pyStr(acao.valor)})`;
    case "marcar":
      return `${nota}${ind}${loc}.${acao.valor ? "check" : "uncheck"}()`;
    case "tecla":
      return `${nota}${ind}${loc}.press(${pyStr(acao.valor)})`;
    case "submeter":
      return `${nota}${ind}${loc}.press("Enter")`;
    case "verificar":
      return acao.modo === "valor"
        ? `${nota}${ind}expect(${loc}).to_have_value(${pyStr(acao.valor)})`
        : `${nota}${ind}expect(${loc}).to_have_text(${pyStr(acao.valor)})`;
    default:
      return `${ind}# tipo não suportado: ${acao.tipo}`;
  }
}

/** Gera um teste pytest-playwright. */
export function paraPlaywrightPython(acoes, opcoes = {}) {
  const nome = String(opcoes.nome || "fluxo_gravado")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "fluxo_gravado";
  const corpo = (acoes || []).map(acaoPy).join("\n");

  return `# Gerado pela Proteu QA — gravador de ações.
# pytest-playwright. Os locators já esperam o elemento ficar acionável, então
# não há sleep aqui de propósito: sleep é o que deixa suite instável.

from playwright.sync_api import Page, expect


def test_${nome}(page: Page):
${corpo}
`;
}
