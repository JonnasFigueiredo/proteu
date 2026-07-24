// Service worker — menu de contexto, atalhos de teclado e roteamento da
// inserção. Importa core/ como módulos ES (por isso "type": "module" no
// manifest). Nenhuma requisição de rede acontece aqui nem em lugar nenhum.

import { carregarConfig, persistirContador, adicionarHistorico, carregarHistorico } from "../storage.js";
import { gerar, TIPOS } from "../core/gerador.js";

const PREFIXO_MENU = "reproduzivel:gerar:";

// --- Menu de contexto (aparece só em campos editáveis) ---------------------

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "reproduzivel:raiz",
      title: "Reproduzível",
      contexts: ["editable"],
    });
    for (const [tipo, def] of Object.entries(TIPOS)) {
      chrome.contextMenus.create({
        id: PREFIXO_MENU + tipo,
        parentId: "reproduzivel:raiz",
        title: `Gerar ${def.rotulo}`,
        contexts: ["editable"],
      });
    }
  });
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
  if (!TIPOS[tipo]) return;
  const config = await carregarConfig();
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
    console.warn("Reproduzível: não foi possível injetar na página:", e.message);
    return;
  }

  const msg = { app: "reproduzivel", tipo: "INSERIR", valor, modo };
  const opcoes = frameId !== undefined ? { frameId } : undefined;
  try {
    await chrome.tabs.sendMessage(tabId, msg, opcoes);
  } catch (e) {
    console.warn("Reproduzível: falha ao inserir:", e.message);
  }
}
