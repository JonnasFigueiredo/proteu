// Gerador de script para o CONSOLE do navegador.
//
// Os outros dialetos (Selenium, Playwright) produzem um teste que precisa de
// runner, dependência e projeto montado. Aqui o alvo é outro: a QA gravou um
// cadastro e quer repetir aquilo trinta vezes AGORA, para ter massa na base —
// sem sair do navegador que já está aberto na tela certa.
//
// Por isso o resultado é JavaScript puro, colável no console, sem import algum.
//
// A repetição é o ponto: repetir o mesmo cadastro com os mesmos dados costuma
// esbarrar em unicidade (CPF, e-mail, matrícula). Por isso o script carrega uma
// LISTA de personas já geradas e consome uma por volta — o valor muda a cada
// iteração sem que o script precise gerar nada em tempo de execução.

/** Literal JS de uma string, seguro para colar no console. */
function lit(v) {
  return JSON.stringify(String(v == null ? "" : v));
}

/** Referência ao valor da persona da volta, ou o literal gravado. */
function valorDaAcao(acao, mapa) {
  const slot = mapa && mapa[acao.alvoId];
  return slot ? `d[${lit(slot)}]` : lit(acao.valor);
}

/** Espera o elemento existir antes de agir: SPA raramente responde no mesmo tick. */
const AJUDANTES = `// --- Ajudantes -------------------------------------------------------------
const _pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Procura o elemento, inclusive dentro de shadow roots abertos. */
function _buscar(sel, raiz = document) {
  const achado = raiz.querySelector(sel);
  if (achado) return achado;
  for (const el of raiz.querySelectorAll("*")) {
    if (el.shadowRoot) {
      const dentro = _buscar(sel, el.shadowRoot);
      if (dentro) return dentro;
    }
  }
  return null;
}

/** XPath tem suporte nativo no navegador — nao precisa de biblioteca. */
function _buscarXPath(expr) {
  const r = document.evaluate(expr, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  return r.singleNodeValue;
}

/** Espera até o elemento aparecer. Sem isso o script corre na frente da tela. */
async function _esperar(sel, limite = 8000) {
  const ate = Date.now() + limite;
  const achar = sel.startsWith("/") || sel.startsWith("(") ? _buscarXPath : _buscar;
  for (;;) {
    const el = achar(sel);
    if (el) return el;
    if (Date.now() > ate) throw new Error("nao apareceu em " + limite + "ms: " + sel);
    await _pausa(80);
  }
}

/**
 * Escreve no campo de um jeito que React e Vue percebam.
 *
 * Atribuir .value direto atualiza o DOM mas nao o estado do framework, e o
 * valor some no proximo render. O setter nativo do prototipo contorna o
 * interceptador que essas bibliotecas instalam na propriedade.
 */
async function _preencher(sel, valor) {
  const el = await _esperar(sel);
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  el.focus();
  setter.call(el, valor);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return el;
}

async function _clicar(sel) {
  const el = await _esperar(sel);
  el.scrollIntoView({ block: "center", behavior: "instant" });
  el.click();
  return el;
}

async function _selecionar(sel, valor) {
  const el = await _esperar(sel);
  el.value = valor;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return el;
}

/** Confere que o elemento existe E contem o texto esperado. */
async function _conferirTexto(sel, esperado) {
  const el = await _esperar(sel);
  const texto = (el.textContent || "").trim();
  if (!texto.includes(esperado)) {
    throw new Error("texto diferente em " + sel + ": esperava " + esperado + ", veio " + texto);
  }
  return el;
}

async function _marcar(sel, ligado) {
  const el = await _esperar(sel);
  if (el.checked !== ligado) el.click();
  return el;
}
`;

/** Uma linha de ação dentro do laço. */
function linhaDaAcao(acao, mapa, ind) {
  const sel = acao.seletor;
  if (acao.tipo === "navegar") {
    return `${ind}// navegacao gravada: ${acao.valor}\n` +
      `${ind}// (descomente para o script navegar sozinho)\n` +
      `${ind}// location.href = ${lit(acao.valor)};`;
  }
  if (!sel) return `${ind}// acao sem seletor: ${acao.tipo}`;
  const alvo = lit(sel.valor);
  switch (acao.tipo) {
    case "preencher":
    case "tecla":
      return `${ind}await _preencher(${alvo}, ${valorDaAcao(acao, mapa)});`;
    case "selecionar":
      return `${ind}await _selecionar(${alvo}, ${valorDaAcao(acao, mapa)});`;
    case "marcar":
      return `${ind}await _marcar(${alvo}, ${acao.valor === false ? "false" : "true"});`;
    case "clicar":
    case "submeter":
      return `${ind}await _clicar(${alvo});`;
    case "verificar": {
      // A asserção carrega o texto esperado. Checar só a existência do
      // elemento deixaria passar a tela certa com o conteúdo errado.
      const esperado = acao.valor ? lit(acao.valor) : null;
      if (!esperado) return `${ind}await _esperar(${alvo});`;
      return `${ind}await _conferirTexto(${alvo}, ${esperado});`;
    }
    default:
      return `${ind}// ${acao.tipo}: sem equivalente no console`;
  }
}

/**
 * Monta o script.
 *
 * @param {Array} acoes - ações já normalizadas
 * @param {{
 *   repeticoes?: number,
 *   pausaMs?: number,
 *   personas?: Array<object>,
 *   mapaDeCampos?: object,
 *   pararNoErro?: boolean
 * }} opcoes
 */
export function paraConsole(acoes, opcoes = {}) {
  const lista = Array.isArray(acoes) ? acoes : [];
  const repeticoes = Math.max(1, Number(opcoes.repeticoes) || 1);
  const pausa = Math.max(0, Number(opcoes.pausaMs) ?? 300);
  const personas = Array.isArray(opcoes.personas) ? opcoes.personas : [];
  const mapa = opcoes.mapaDeCampos || null;
  const pararNoErro = opcoes.pararNoErro !== false;

  const corpo = lista.map((a) => linhaDaAcao(a, mapa, "    ")).join("\n");

  const dados = personas.length
    ? `// Uma persona por volta. Repetir o mesmo dado esbarraria na unicidade\n` +
      `// (CPF, e-mail, matricula) ja na segunda iteracao.\n` +
      `const PERSONAS = ${JSON.stringify(personas, null, 2)};\n`
    : `const PERSONAS = [];\n`;

  const pegarDados = personas.length
    ? `  const d = PERSONAS[i % PERSONAS.length];`
    : `  const d = {};`;

  return `// Proteu QA — script gerado para rodar no console
//
// Cole no console (F12) da aba que voce quer automatizar e tecle Enter.
// Confira os seletores antes: a pagina pode ter mudado desde a gravacao.
//
// Para interromper no meio: recarregue a aba.

${AJUDANTES}
${dados}
const REPETICOES = ${repeticoes};
const PAUSA_MS = ${pausa};

(async () => {
  let feitas = 0;
  for (let i = 0; i < REPETICOES; i++) {
${pegarDados}
    try {
${corpo || "      // nenhuma acao gravada"}
      feitas++;
      console.log("Proteu QA: volta " + (i + 1) + "/" + REPETICOES + " concluida");
    } catch (e) {
      console.error("Proteu QA: volta " + (i + 1) + " falhou —", e.message);
${pararNoErro
  ? `      console.warn("Proteu QA: interrompido. " + feitas + " de " + REPETICOES + " concluidas.");
      return;`
  : `      // segue para a proxima volta`}
    }
    if (i < REPETICOES - 1) await _pausa(PAUSA_MS);
  }
  console.log("Proteu QA: fim — " + feitas + " de " + REPETICOES + " concluidas.");
})();
`;
}
