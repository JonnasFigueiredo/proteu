// Service worker — menu de contexto, atalhos de teclado e roteamento da
// inserção. Importa core/ como módulos ES (por isso "type": "module" no
// manifest). Nenhuma requisição de rede acontece aqui nem em lugar nenhum.

import { carregarConfig, carregarHistorico } from "../storage.js";
import { idiomaDoPais, PAIS_PADRAO } from "../core/gerador.js";
import { t } from "../core/i18n.js";

const PREFIXO_MENU = "proteu:sel:";
const ID_SCRIPT_SELETOR = "proteu-seletor";

// --- Menu de contexto: copiar o seletor do elemento clicado -----------------
//
// O botão direito é o gesto natural para "me dá o seletor disto". Antes daqui
// saía geração de documento, mas para isso o popup e o Ctrl+Shift+8 servem
// melhor: eles atuam no campo focado, e o menu não precisa de campo nenhum.
//
// Os rótulos são fixos ("Copiar XPath relativo"), e não o valor do seletor. O
// Chrome só aceita atualizar o título durante o evento `contextmenu`, e essa
// corrida se perde com frequência — perdê-la mostraria o seletor do elemento
// ANTERIOR, o que é pior do que um rótulo genérico.
const ITENS = [
  { estrategia: "melhor", chave: "menu_copiar_melhor" },
  { separador: true },
  { estrategia: "id", chave: "menu_copiar_id" },
  { estrategia: "css", chave: "menu_copiar_css" },
  { estrategia: "xpath", chave: "menu_copiar_xpath" },
  { estrategia: "xpath-absoluto", chave: "menu_copiar_xpath_abs" },
  { estrategia: "texto", chave: "menu_copiar_texto" },
  { separador: true },
  { estrategia: "todos", chave: "menu_copiar_todos" },
];

/** Temos acesso de host? Sem ele o listener não chega antes do clique. */
function temPermissao() {
  return chrome.permissions.contains({ origins: ["<all_urls>"] });
}

/** Constrói o menu conforme o idioma efetivo da interface. */
async function construirMenu() {
  await chrome.contextMenus.removeAll();
  // Menu que não faz nada confunde mais do que menu nenhum.
  if (!(await temPermissao())) return;

  const config = await carregarConfig();
  const idioma = config.idiomaFixo || idiomaDoPais(config.pais || PAIS_PADRAO);

  chrome.contextMenus.create({
    id: "proteu:raiz",
    title: "Proteu QA",
    contexts: ["all"],
  });
  ITENS.forEach((item, i) => {
    chrome.contextMenus.create(
      item.separador
        ? { id: `proteu:sep:${i}`, parentId: "proteu:raiz", type: "separator", contexts: ["all"] }
        : {
            id: PREFIXO_MENU + item.estrategia,
            parentId: "proteu:raiz",
            title: t(idioma, item.chave),
            contexts: ["all"],
          }
    );
  });
}

// Fila de uma posição: as reconstruções nunca se sobrepõem.
//
// Sem isto, duas chamadas concorrentes se atropelam. Acontecia na instalação:
// `onInstalled` dispara uma, e o popup — ao gravar o país pela primeira vez
// (null → "br") — dispara outra. Cada uma faz `await removeAll()`, e é nesse
// await que a segunda entra: as duas limpam o menu e as duas tentam criar os
// mesmos ids, gerando "Cannot create item with duplicate id proteu:sel:*".
let filaMenu = Promise.resolve();

/** Enfileira uma reconstrução do menu. */
function reconstruirMenu() {
  filaMenu = filaMenu
    .catch(() => {}) // uma falha anterior não trava as próximas
    .then(construirMenu);
  return filaMenu;
}

// --- Content script que observa o botão direito -----------------------------

/**
 * Registra o listener de `contextmenu` em toda página.
 *
 * Precisa ser content script registrado, e não injeção sob demanda: quando o
 * item do menu é clicado, o evento de botão direito já passou, e só quem
 * estava ouvindo antes sabe em qual elemento ele aconteceu.
 */
async function registrarSeletor() {
  if (!(await temPermissao())) return false;
  try {
    const jaTem = await chrome.scripting.getRegisteredContentScripts({
      ids: [ID_SCRIPT_SELETOR],
    });
    if (jaTem.length) return true;
  } catch {
    // Nada registrado ainda: segue para o registro.
  }
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: ID_SCRIPT_SELETOR,
        js: ["src/content/seletor.js"],
        matches: ["<all_urls>"],
        allFrames: true,
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
    return true;
  } catch (e) {
    console.warn("Proteu QA: não foi possível registrar o content script:", e.message);
    return false;
  }
}

async function desregistrarSeletor() {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [ID_SCRIPT_SELETOR] });
  } catch {
    // Já não estava registrado.
  }
}

/**
 * Injeta nas abas já abertas.
 *
 * Content script recém-registrado só roda em navegação futura. Sem este passo,
 * a QA liga a opção e o menu não funciona na aba em que ela está — que é
 * exatamente onde ela quer usar.
 */
async function injetarNasAbasAbertas() {
  let abas = [];
  try {
    abas = await chrome.tabs.query({});
  } catch {
    return;
  }
  for (const aba of abas) {
    if (!aba.id || !aba.url || !/^https?:/.test(aba.url)) continue;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: aba.id, allFrames: true },
        files: ["src/content/seletor.js"],
      });
    } catch {
      // Página privilegiada ou sem permissão: segue para a próxima.
    }
  }
}

/** Liga (ou desliga) tudo que depende da permissão de host. */
async function sincronizarComPermissao() {
  if (await temPermissao()) {
    await registrarSeletor();
    await injetarNasAbasAbertas();
  } else {
    await desregistrarSeletor();
  }
  await reconstruirMenu();
}

chrome.runtime.onInstalled.addListener(sincronizarComPermissao);
chrome.runtime.onStartup.addListener(sincronizarComPermissao);
chrome.permissions.onAdded.addListener(sincronizarComPermissao);
chrome.permissions.onRemoved.addListener(sincronizarComPermissao);

// Troca de país ou de idioma da interface → refaz os rótulos do menu.
chrome.storage.onChanged.addListener((mudancas, area) => {
  if (area === "sync" && mudancas.config) {
    const antes = mudancas.config.oldValue;
    const depois = mudancas.config.newValue;
    if (antes?.pais !== depois?.pais || antes?.idiomaFixo !== depois?.idiomaFixo) {
      reconstruirMenu();
    }
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !String(info.menuItemId).startsWith(PREFIXO_MENU)) return;
  const estrategia = String(info.menuItemId).slice(PREFIXO_MENU.length);
  copiarSeletor(estrategia, tab.id, info.frameId);
});

/** Pede ao frame clicado que copie o seletor do elemento. */
async function copiarSeletor(estrategia, tabId, frameId) {
  const msg = { app: "proteu", tipo: "COPIAR_SELETOR", estrategia };
  const opcoes = frameId !== undefined ? { frameId } : undefined;
  try {
    await chrome.tabs.sendMessage(tabId, msg, opcoes);
  } catch (e) {
    // Sem listener naquele frame: quase sempre a página foi aberta antes de a
    // permissão ser concedida, e um F5 resolve.
    console.warn("Proteu QA: nenhum listener na página —", e.message);
  }
}

// --- Atalho: repetir a última geração no campo focado -----------------------

chrome.commands.onCommand.addListener(async (comando) => {
  if (comando !== "repetir-ultima-geracao") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const hist = await carregarHistorico();
  if (hist.length === 0) return; // nada gerado ainda
  const config = await carregarConfig();
  await inserirNoCampo(tab.id, undefined, hist[0].valor, config.insercao.modo);
});

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
