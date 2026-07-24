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
import { gerar, TIPOS } from "../core/gerador.js";
import { gerarSeedAleatoria } from "../core/config.js";
import { normalizarSeed, criarRng } from "../core/seed.js";
import { gerarSetFronteira } from "../core/field.js";
import { IDIOMAS, CODIGOS_IDIOMA, RTL, gerarPalavras } from "../core/text/idiomas.js";
import { gerarPorTamanho } from "../core/text/tamanho.js";
import { contarTudo } from "../core/text/contagem.js";
import { pseudolocalizar } from "../core/text/pseudolocale.js";
import { gerarCpfInvalido, gerarCnpjInvalido } from "../core/invalid/documentos-invalidos.js";
import { FRONTEIRAS_UNICODE } from "../core/invalid/unicode.js";
import { todosPayloads, gerarOverflow } from "../core/invalid/payloads.js";

const $ = (sel) => document.querySelector(sel);

// Estado local do popup; a fonte da verdade é o chrome.storage.
let config = null;
let ultimoValor = null;
let ultimoTexto = null;

// --- Inicialização ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  config = await carregarConfig();
  montarBotoesDocumento();
  montarIdiomas();
  montarChipsInvalidos();
  refletirConfigNaUI();
  ligarEventos();
  await detectarCampo();
});

/** Chips estáticos de Unicode e payloads (clique insere no campo / copia). */
function montarChipsInvalidos() {
  const uni = $("#chips-unicode");
  for (const item of FRONTEIRAS_UNICODE) {
    uni.appendChild(criarChipValor(item.rotulo, item.valor, item.nota, false));
  }
  const pay = $("#chips-payloads");
  for (const item of todosPayloads()) {
    pay.appendChild(criarChipValor(item.rotulo, item.valor, item.valor, true));
  }
}

/** Cria um chip que, ao clicar, insere o valor no campo ativo (ou copia). */
function criarChipValor(rotulo, valor, titulo, perigo) {
  const chip = document.createElement("button");
  chip.className = perigo ? "chip perigo" : "chip";
  chip.textContent = rotulo;
  chip.title = titulo;
  chip.addEventListener("click", () => usarValorAvulso(valor, rotulo));
  return chip;
}

/** Opções do seletor de idioma, a partir de core/text/idiomas.js. */
function montarIdiomas() {
  const sel = $("#idioma");
  for (const cod of CODIGOS_IDIOMA) {
    const opt = document.createElement("option");
    opt.value = cod;
    opt.textContent = `${IDIOMAS[cod].rotulo} (${cod})`;
    sel.appendChild(opt);
  }
}

/** Um botão por tipo registrado em TIPOS — a UI acompanha o core sozinha. */
function montarBotoesDocumento() {
  const container = $("#botoes-doc");
  for (const [tipo, def] of Object.entries(TIPOS)) {
    const btn = document.createElement("button");
    btn.className = "gerar";
    btn.dataset.tipo = tipo;
    btn.textContent = def.rotulo;
    btn.title = `Gerar ${def.rotulo}`;
    container.appendChild(btn);
  }
}

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

  document.querySelectorAll(".gerar.invalido").forEach((b) =>
    b.addEventListener("click", () => aoGerarInvalido(b.dataset.invalido))
  );
  $("#btn-overflow").addEventListener("click", aoGerarOverflow);

  $("#btn-palavras").addEventListener("click", aoGerarPalavras);
  $("#btn-tamanho").addEventListener("click", aoGerarTamanho);
  $("#btn-pseudo").addEventListener("click", aoPseudo);
  $("#btn-copiar-texto").addEventListener("click", () => copiar(ultimoTexto, "#feedback-texto"));
  $("#btn-inserir-texto").addEventListener("click", aoInserirTexto);

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

// --- Geração de texto -------------------------------------------------------

/** Deriva um rng do par (seed, contador) e avança o contador persistido. */
async function proximoRng() {
  config = await carregarConfig();
  const usado = config.contador;
  const rng = criarRng(`${config.seed}:${usado}`);
  await persistirContador(usado + 1);
  config.contador = usado + 1;
  return { rng, usado };
}

async function aoGerarPalavras() {
  const idioma = $("#idioma").value;
  const { rng, usado } = await proximoRng();
  const texto = gerarPalavras(rng, idioma, 6);
  mostrarTexto(texto, idioma);
  await adicionarHistorico({
    tipo: `texto:${idioma}`,
    valor: texto,
    seed: config.seed,
    contador: usado,
    em: Date.now(),
  });
  if (!$("#secao-historico").hidden) await renderizarHistorico();
}

async function aoGerarTamanho() {
  const unidade = $("#tam-unidade").value;
  const alvo = parseInt($("#tam-alvo").value, 10);
  if (!Number.isInteger(alvo) || alvo < 0) {
    mostrarFeedback("Informe um tamanho válido", "erro", "#feedback-texto");
    return;
  }
  const { rng, usado } = await proximoRng();
  const r = gerarPorTamanho(rng, { unidade, alvo });
  mostrarTexto(r.texto, null);
  await adicionarHistorico({
    tipo: `texto:${unidade}=${alvo}`,
    valor: r.texto,
    seed: config.seed,
    contador: usado,
    em: Date.now(),
  });
  if (!$("#secao-historico").hidden) await renderizarHistorico();
}

function aoPseudo() {
  if (!ultimoTexto) return;
  const transformado = pseudolocalizar(ultimoTexto);
  mostrarTexto(transformado, null);
}

/** Mostra o texto, marca a direção (RTL) e exibe as 4 contagens. */
function mostrarTexto(texto, idioma) {
  ultimoTexto = texto;
  const out = $("#valor-texto");
  out.textContent = texto;
  out.dir = idioma && RTL.has(idioma) ? "rtl" : "ltr";
  renderContagens(texto);
  $("#resultado-texto").hidden = false;
  limparFeedback("#feedback-texto");
}

function renderContagens(texto) {
  const c = contarTudo(texto);
  const tiles = [
    ["grafemas", c.grafemas],
    ["code points", c.codePoints],
    ["code units", c.codeUnits],
    ["bytes", c.bytes],
  ];
  const cont = $("#contagens");
  cont.textContent = "";
  for (const [rot, num] of tiles) {
    const div = document.createElement("div");
    div.className = "contagem";
    const n = document.createElement("span");
    n.className = "num";
    n.textContent = String(num);
    const r = document.createElement("span");
    r.className = "rot";
    r.textContent = rot;
    div.append(n, r);
    cont.appendChild(div);
  }
}

async function aoInserirTexto() {
  if (!ultimoTexto) return;
  const r = await inserirNoCampoAtivo(ultimoTexto, config.insercao.modo);
  mostrarFeedback(
    r.ok ? "Inserido no campo ✓" : r.motivo === "sem-campo"
      ? "Clique num campo da página primeiro" : "Não foi possível inserir",
    r.ok ? "ok" : "erro",
    "#feedback-texto"
  );
}

// --- Massa inválida e payloads ----------------------------------------------

async function aoGerarInvalido(tipo) {
  const { rng, usado } = await proximoRng();
  const r =
    tipo === "cnpj"
      ? gerarCnpjInvalido(rng, { mascara: config.documentos.mascara })
      : gerarCpfInvalido(rng, { mascara: config.documentos.mascara });
  ultimoValor = r.valor;

  $("#valor-gerado").textContent = r.valor;
  $("#resultado").hidden = false;
  mostrarFeedback(`Inválido (${r.motivo}) — pronto para copiar/inserir`, "ok", "#feedback-invalido");

  await adicionarHistorico({
    tipo: `inválido:${tipo}`,
    valor: r.valor,
    seed: config.seed,
    contador: usado,
    em: Date.now(),
  });
  if (!$("#secao-historico").hidden) await renderizarHistorico();
}

async function aoGerarOverflow() {
  const tam = parseInt($("#overflow-tam").value, 10);
  if (!Number.isInteger(tam) || tam < 1) {
    mostrarFeedback("Informe um tamanho válido", "erro", "#feedback-invalido");
    return;
  }
  const texto = gerarOverflow(tam);
  mostrarTexto(texto, null); // mostra as 4 contagens do overflow
  mostrarFeedback(`Overflow de ${tam} chars gerado (veja no bloco Texto)`, "ok", "#feedback-invalido");
}

/** Insere um valor avulso (chip Unicode/payload) no campo ativo, ou copia. */
async function usarValorAvulso(valor, rotulo) {
  const r = await inserirNoCampoAtivo(valor, config.insercao.modo);
  if (r.ok) {
    mostrarFeedback(`"${rotulo}" inserido ✓`, "ok", "#feedback-invalido");
  } else if (r.motivo === "sem-campo") {
    // Sem campo focado: cai para a área de transferência.
    await copiar(valor, "#feedback-invalido");
  } else {
    mostrarFeedback("Não foi possível inserir", "erro", "#feedback-invalido");
  }
}

// --- Copiar -----------------------------------------------------------------

async function copiar(valor, sel = "#feedback") {
  if (!valor) return;
  try {
    await navigator.clipboard.writeText(valor);
    mostrarFeedback("Copiado ✓", "ok", sel);
  } catch {
    mostrarFeedback("Não foi possível copiar", "erro", sel);
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

  // Chips de fronteira: clique insere direto no campo detectado.
  const chips = $("#chips-fronteira");
  chips.textContent = "";
  for (const item of gerarSetFronteira(d)) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = item.rotulo;
    chip.title = item.valor === "" ? "(string vazia)" : item.valor;
    chip.addEventListener("click", async () => {
      const r = await inserirNoCampoAtivo(item.valor, config.insercao.modo);
      mostrarFeedback(
        r.ok ? `"${item.rotulo}" inserido ✓` : "Não foi possível inserir",
        r.ok ? "ok" : "erro",
        "#feedback-campo"
      );
    });
    chips.appendChild(chip);
  }

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

const timersFeedback = {};
function mostrarFeedback(texto, tipo, sel = "#feedback") {
  const el = $(sel);
  el.textContent = texto;
  el.className = `feedback ${tipo}`;
  clearTimeout(timersFeedback[sel]);
  timersFeedback[sel] = setTimeout(() => limparFeedback(sel), 2500);
}

function limparFeedback(sel = "#feedback") {
  const el = $(sel);
  el.textContent = "";
  el.className = "feedback";
}
