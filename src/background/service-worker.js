// Service worker — menu de contexto, atalhos de teclado e roteamento da
// inserção. Importa core/ como módulos ES (por isso "type": "module" no
// manifest). Nenhuma requisição de rede acontece aqui nem em lugar nenhum.

import { carregarConfig, persistirContador, adicionarHistorico, carregarHistorico } from "../storage.js";
import { gerar, tiposDoPais, idiomaDoPais, PAIS_PADRAO } from "../core/gerador.js";
import { t, rotuloDoTipo } from "../core/i18n.js";

const PREFIXO_MENU = "proteu:gerar:";

// --- Menu de contexto (um item por documento do país ativo) ----------------

/** Constrói o menu de contexto conforme o país ativo na config. */
async function construirMenu() {
  const config = await carregarConfig();
  const pais = config.pais || PAIS_PADRAO;
  const tipos = tiposDoPais(pais);
  // Idioma da interface: fixado pelo QA ou, se automático, o do país.
  const idioma = config.idiomaFixo || idiomaDoPais(pais);
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: "proteu:raiz",
    title: "Proteu QA",
    contexts: ["editable"],
  });
  for (const [tipo, def] of Object.entries(tipos)) {
    chrome.contextMenus.create({
      id: PREFIXO_MENU + tipo,
      parentId: "proteu:raiz",
      title: `${t(idioma, "gerar")} ${rotuloDoTipo(def, idioma)}`,
      contexts: ["editable"],
    });
  }
}

// Fila de uma posição: as reconstruções nunca se sobrepõem.
//
// Sem isto, duas chamadas concorrentes se atropelam. Acontecia na instalação:
// `onInstalled` dispara uma, e o popup — ao gravar o país pela primeira vez
// (null → "br") — dispara outra. Cada uma faz `await removeAll()`, e é nesse
// await que a segunda entra: as duas limpam o menu e as duas tentam criar os
// mesmos ids, gerando "Cannot create item with duplicate id proteu:gerar:*"
// para a lista inteira de documentos.
let filaMenu = Promise.resolve();

/** Enfileira uma reconstrução do menu. */
function reconstruirMenu() {
  filaMenu = filaMenu
    .catch(() => {}) // uma falha anterior não trava as próximas
    .then(construirMenu);
  return filaMenu;
}

chrome.runtime.onInstalled.addListener(reconstruirMenu);

// Troca de país (ou primeira definição) → refaz o menu.
chrome.storage.onChanged.addListener((mudancas, area) => {
  if (area === "sync" && mudancas.config) {
    const antes = mudancas.config.oldValue;
    const depois = mudancas.config.newValue;
    // País ou idioma da interface mudou → refaz os rótulos do menu.
    if (antes?.pais !== depois?.pais || antes?.idiomaFixo !== depois?.idiomaFixo) {
      reconstruirMenu();
    }
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !info.menuItemId.startsWith(PREFIXO_MENU)) return;
  const tipo = info.menuItemId.slice(PREFIXO_MENU.length);
  gerarEInserir(tipo, tab.id, info.frameId);
});

// --- Atalhos de teclado -----------------------------------------------------

chrome.commands.onCommand.addListener(async (comando) => {
  if (comando !== "repetir-ultima-geracao") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const hist = await carregarHistorico();
  if (hist.length === 0) return; // nada gerado ainda
  const config = await carregarConfig();
  await inserirNoCampo(tab.id, undefined, hist[0].valor, config.insercao.modo);
});

// --- Núcleo: gerar a partir da config e inserir no campo --------------------

async function gerarEInserir(tipo, tabId, frameId) {
  const config = await carregarConfig();
  if (!tiposDoPais(config.pais || PAIS_PADRAO)[tipo]) return;
  const resultado = gerar(tipo, config);

  await persistirContador(resultado.proximoContador);
  await adicionarHistorico({
    tipo,
    valor: resultado.valor,
    seed: config.seed,
    contador: resultado.contador,
    em: Date.now(),
  });

  await inserirNoCampo(tabId, frameId, resultado.valor, config.insercao.modo);
}

/** Injeta o content script (idempotente) e manda inserir o valor no campo. */
async function inserirNoCampo(tabId, frameId, valor, modo) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["src/content/content.js"],
    });
  } catch (e) {
    // Páginas privilegiadas (chrome://, web store) bloqueiam injeção.
    console.warn("Proteu QA: não foi possível injetar na página:", e.message);
    return;
  }

  const msg = { app: "proteu", tipo: "INSERIR", valor, modo };
  const opcoes = frameId !== undefined ? { frameId } : undefined;
  try {
    await chrome.tabs.sendMessage(tabId, msg, opcoes);
  } catch (e) {
    console.warn("Proteu QA: falha ao inserir:", e.message);
  }
}
