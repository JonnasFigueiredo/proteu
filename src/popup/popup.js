// Popup — UI de geração. Consome core/gerador.js (lógica pura) e storage.js
// (persistência). Nenhuma requisição de rede.

import {
  carregarConfig,
  salvarConfig,
  persistirContador,
  carregarHistorico,
  adicionarHistorico,
  limparHistorico,
} from "../storage.js";
import { gerar } from "../core/gerador.js";
import { gerarSeedAleatoria } from "../core/config.js";
import { normalizarSeed } from "../core/seed.js";

const $ = (sel) => document.querySelector(sel);

// Estado local do popup; a fonte da verdade é o chrome.storage.
let config = null;
let ultimoValor = null;

// --- Inicialização ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  config = await carregarConfig();
  refletirConfigNaUI();
  ligarEventos();
  await detectarCampo();
});

function refletirConfigNaUI() {
  $("#opt-mascara").checked = config.documentos.mascara;
  $("#opt-alfanumerico").checked = config.documentos.cnpjAlfanumerico;
  $("#opt-ambiguas").checked = config.documentos.cnpjExcluirAmbiguas;
  $("#wrap-ambiguas").hidden = !config.documentos.cnpjAlfanumerico;
  $("#modo-insercao").value = config.insercao.modo;
  $("#campo-seed").value = config.seed;
}

// --- Eventos ----------------------------------------------------------------

function ligarEventos() {
  document.querySelectorAll(".gerar").forEach((b) =>
    b.addEventListener("click", () => aoGerar(b.dataset.tipo))
  );

  $("#btn-copiar").addEventListener("click", () => copiar(ultimoValor));
  $("#btn-inserir").addEventListener("click", aoInserir);

  $("#opt-mascara").addEventListener("change", (e) =>
    atualizarConfig((c) => (c.documentos.mascara = e.target.checked))
  );
  $("#opt-alfanumerico").addEventListener("change", (e) => {
    $("#wrap-ambiguas").hidden = !e.target.checked;
    atualizarConfig((c) => (c.documentos.cnpjAlfanumerico = e.target.checked));
  });
  $("#opt-ambiguas").addEventListener("change", (e) =>
    atualizarConfig((c) => (c.documentos.cnpjExcluirAmbiguas = e.target.checked))
  );
  $("#modo-insercao").addEventListener("change", (e) =>
    atualizarConfig((c) => (c.insercao.modo = e.target.value))
  );

  $("#campo-seed").addEventListener("change", aoMudarSeed);
  $("#btn-nova-seed").addEventListener("click", aoNovaSeed);

  $("#btn-config").addEventListener("click", () => alternar("#secao-config"));
  $("#btn-historico").addEventListener("click", aoAlternarHistorico);
  $("#btn-limpar-hist").addEventListener("click", async () => {
    await limparHistorico();
    await renderizarHistorico();
  });
}

/** Aplica uma mutação na config em memória e persiste. */
async function atualizarConfig(mutar) {
  mutar(config);
  config = await salvarConfig(config);
}

// --- Geração ----------------------------------------------------------------

async function aoGerar(tipo) {
  // Recarrega para pegar o contador mais recente (menu de contexto também avança).
  config = await carregarConfig();
  const r = gerar(tipo, config);
  ultimoValor = r.valor;

  await persistirContador(r.proximoContador);
  config.contador = r.proximoContador;
  await adicionarHistorico({
    tipo,
    valor: r.valor,
    seed: config.seed,
    contador: r.contador,
    em: Date.now(),
  });

  $("#valor-gerado").textContent = r.valor;
  $("#resultado").hidden = false;
  limparFeedback();
  if (!$("#secao-historico").hidden) await renderizarHistorico();
}

// --- Copiar -----------------------------------------------------------------

async function copiar(valor) {
  if (!valor) return;
  try {
    await navigator.clipboard.writeText(valor);
    mostrarFeedback("Copiado ✓", "ok");
  } catch {
    mostrarFeedback("Não foi possível copiar", "erro");
  }
}

// --- Inserir no campo ativo -------------------------------------------------

async function aoInserir() {
  if (!ultimoValor) return;
  const r = await inserirNoCampoAtivo(ultimoValor, config.insercao.modo);
  if (r.ok) {
    mostrarFeedback("Inserido no campo ✓", "ok");
  } else if (r.motivo === "sem-campo") {
    mostrarFeedback("Clique num campo da página primeiro", "erro");
  } else if (r.motivo === "pagina-bloqueada") {
    mostrarFeedback("Esta página não permite inserção", "erro");
  } else {
    mostrarFeedback("Não foi possível inserir", "erro");
  }
}

async function inserirNoCampoAtivo(valor, modo) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { ok: false, motivo: "sem-aba" };

  let frames;
  try {
    frames = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["src/content/content.js"],
    });
  } catch {
    return { ok: false, motivo: "pagina-bloqueada" };
  }

  let inseriu = false;
  let semCampoEmTodos = true;
  for (const frame of frames) {
    try {
      const resp = await chrome.tabs.sendMessage(
        tab.id,
        { app: "reproduzivel", tipo: "INSERIR", valor, modo },
        { frameId: frame.frameId }
      );
      if (resp && resp.ok) inseriu = true;
      if (resp && resp.erro !== "sem-campo") semCampoEmTodos = false;
    } catch {
      // frame sem content script acessível; ignora.
    }
  }
  if (inseriu) return { ok: true };
  return { ok: false, motivo: semCampoEmTodos ? "sem-campo" : "falhou" };
}

// --- Detecção do campo ativo (bloco "Campo detectado") ----------------------

async function detectarCampo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  let frames;
  try {
    frames = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["src/content/content.js"],
    });
  } catch {
    return; // página privilegiada
  }

  for (const frame of frames) {
    try {
      const resp = await chrome.tabs.sendMessage(
        tab.id,
        { app: "reproduzivel", tipo: "DETECTAR" },
        { frameId: frame.frameId }
      );
      if (resp && resp.ok && resp.descritor) {
        mostrarCampoDetectado(resp.descritor);
        return;
      }
    } catch {
      /* ignora */
    }
  }
}

function mostrarCampoDetectado(d) {
  const partes = [];
  if (d.type) partes.push(d.type);
  else if (d.contenteditable) partes.push("contenteditable");
  if (d.name) partes.push(`name="${d.name}"`);
  if (d.maxlength) partes.push(`maxlength=${d.maxlength}`);
  if (d.pattern) partes.push("pattern");
  if (d.required) partes.push("required");
  $("#campo-descricao").textContent = `<${d.tag}> ${partes.join(" · ")}`;
  $("#secao-campo").hidden = false;
}

// --- Seed -------------------------------------------------------------------

async function aoMudarSeed(e) {
  const nova = normalizarSeed(e.target.value);
  if (!nova) {
    e.target.classList.add("invalida");
    return;
  }
  e.target.classList.remove("invalida");
  e.target.value = nova;
  // Trocar a seed reinicia o contador: a sequência recomeça do zero.
  await atualizarConfig((c) => {
    c.seed = nova;
    c.contador = 0;
  });
}

async function aoNovaSeed() {
  const nova = gerarSeedAleatoria();
  $("#campo-seed").value = nova;
  $("#campo-seed").classList.remove("invalida");
  await atualizarConfig((c) => {
    c.seed = nova;
    c.contador = 0;
  });
}

// --- Histórico --------------------------------------------------------------

async function aoAlternarHistorico() {
  const escondido = $("#secao-historico").hidden;
  if (escondido) await renderizarHistorico();
  alternar("#secao-historico");
}

async function renderizarHistorico() {
  const hist = await carregarHistorico();
  const lista = $("#lista-historico");
  lista.textContent = "";
  $("#historico-vazio").hidden = hist.length > 0;

  for (const item of hist) {
    const li = document.createElement("li");

    const tipo = document.createElement("span");
    tipo.className = "item-tipo";
    tipo.textContent = item.tipo;

    const valor = document.createElement("span");
    valor.className = "item-valor";
    valor.textContent = item.valor;

    const copiar = document.createElement("button");
    copiar.className = "item-copiar";
    copiar.title = "Copiar";
    copiar.textContent = "📋";
    copiar.addEventListener("click", () => copiarTexto(item.valor));

    li.append(tipo, valor, copiar);
    lista.appendChild(li);
  }
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    /* ignora */
  }
}

// --- Utilitários de UI ------------------------------------------------------

function alternar(sel) {
  const el = $(sel);
  el.hidden = !el.hidden;
}

let timerFeedback = null;
function mostrarFeedback(texto, tipo) {
  const el = $("#feedback");
  el.textContent = texto;
  el.className = `feedback ${tipo}`;
  clearTimeout(timerFeedback);
  timerFeedback = setTimeout(() => limparFeedback(), 2500);
}

function limparFeedback() {
  const el = $("#feedback");
  el.textContent = "";
  el.className = "feedback";
}
