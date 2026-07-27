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
import { gerar, tiposDoPais, idiomaDoPais, paisMostraOpcoesCnpj, PAISES_DISPONIVEIS } from "../core/gerador.js";
import { gerarSeedAleatoria } from "../core/config.js";
import { normalizarSeed, criarRng } from "../core/seed.js";
import { gerarSetFronteira } from "../core/field.js";
import { IDIOMAS, CODIGOS_IDIOMA, RTL, gerarPalavras, gerarFrases } from "../core/text/idiomas.js";
import { gerarPorTamanho } from "../core/text/tamanho.js";
import { contarTudo } from "../core/text/contagem.js";
import { pseudolocalizar } from "../core/text/pseudolocale.js";
import { gerarOverflow } from "../core/invalid/payloads.js";
import { FAMILIAS_LIMITE } from "../core/invalid/casos-limite.js";
import { t, LANG_ATTR, DIR_ATTR } from "../core/i18n.js";
import { cnpjDeRaiz } from "../core/documents/cnpj.js";

const PAIS_PADRAO = "br";

const $ = (sel) => document.querySelector(sel);

// Bandeiras de país (SVG, sem emojis) — simplificadas mas reconhecíveis.
const BANDEIRAS_PAIS = {
  br: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#009c3b"/><path d="M12 2 22 8 12 14 2 8Z" fill="#ffdf00"/><circle cx="12" cy="8" r="3.3" fill="#002776"/></svg>',
  us: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><g fill="#b22234"><rect width="24" height="1.23"/><rect y="2.46" width="24" height="1.23"/><rect y="4.92" width="24" height="1.23"/><rect y="7.38" width="24" height="1.23"/><rect y="9.85" width="24" height="1.23"/><rect y="12.31" width="24" height="1.23"/><rect y="14.77" width="24" height="1.23"/></g><rect width="10" height="8.6" fill="#3c3b6e"/><g fill="#fff"><circle cx="2" cy="2" r="0.5"/><circle cx="5" cy="2" r="0.5"/><circle cx="8" cy="2" r="0.5"/><circle cx="3.5" cy="4.3" r="0.5"/><circle cx="6.5" cy="4.3" r="0.5"/><circle cx="2" cy="6.6" r="0.5"/><circle cx="5" cy="6.6" r="0.5"/><circle cx="8" cy="6.6" r="0.5"/></g></svg>',
  ca: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect width="6" height="16" fill="#d52b1e"/><rect x="18" width="6" height="16" fill="#d52b1e"/><path d="M12 3.5 12.8 6l1.9-.8-.9 1.9 1.9.7-1.9 1 .3 1.4-1.6-.5-.1 2h-.8l-.1-2-1.6.5.3-1.4-1.9-1 1.9-.7-.9-1.9 1.9.8Z" fill="#d52b1e"/></svg>',
  ar: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#74acdf"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><circle cx="12" cy="8" r="1.5" fill="#f6b40e"/></svg>',
  cn: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#de2910"/><g fill="#ffde00"><circle cx="4" cy="4" r="2.2"/><circle cx="8.2" cy="1.8" r="0.7"/><circle cx="9.6" cy="3.8" r="0.7"/><circle cx="9.4" cy="6.4" r="0.7"/><circle cx="7.6" cy="8" r="0.7"/></g></svg>',
  sa: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#006c35"/><g fill="#fff"><rect x="5" y="5" width="14" height="1.6" rx="0.8"/><path d="M5 11h13.5l-1.6-1.2 1.6-1.1H5z"/></g></svg>',
  in: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect width="24" height="5.33" fill="#ff9933"/><rect y="10.66" width="24" height="5.34" fill="#138808"/><circle cx="12" cy="8" r="2.1" fill="none" stroke="#000080" stroke-width="0.5"/><circle cx="12" cy="8" r="0.4" fill="#000080"/></svg>',
  cl: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect y="8" width="24" height="8" fill="#d52b1e"/><rect width="8" height="8" fill="#0039a6"/><circle cx="4" cy="4" r="1.6" fill="#fff"/></svg>',
  mx: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="8" height="16" fill="#006847"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ce1126"/><circle cx="12" cy="8" r="1.3" fill="#9b6b3a"/></svg>',
  uy: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><g fill="#0038a8"><rect y="3.55" width="24" height="1.78"/><rect y="7.1" width="24" height="1.78"/><rect y="10.66" width="24" height="1.78"/><rect y="14.2" width="24" height="1.78"/></g><rect width="9" height="8.88" fill="#fff"/><circle cx="4.5" cy="4.4" r="1.5" fill="#f6b40e"/></svg>',
  py: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#d52b1e"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#0038a8"/><circle cx="12" cy="8" r="1.1" fill="#f6b40e"/></svg>',
};

// Ícones SVG (sem emojis). Herdam a cor via currentColor.
const ICONE_COPIAR =
  '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const ICONES_TEMA = {
  auto: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/></svg>',
  claro: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  escuro: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
};
const PROXIMO_TEMA = { auto: "claro", claro: "escuro", escuro: "auto" };
const CHAVE_TEMA = { auto: "tema_auto", claro: "tema_claro", escuro: "tema_escuro" };

// Estado local do popup; a fonte da verdade é o chrome.storage.
let config = null;
let idiomaAtual = "pt";
let ultimoValor = null;
let ultimoTexto = null;
let tipoTexto = "palavras"; // "palavras" | "frases" | "tamanho"
// Grupo de CNPJs da mesma empresa: matriz (0001) e filiais (0002, 0003…).
let grupoRaiz = null;

// --- Inicialização ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  config = await carregarConfig();
  // Primeiro uso: define o país (Brasil por ora) e persiste.
  if (!config.pais) {
    config.pais = PAIS_PADRAO;
    config = await salvarConfig(config);
  }
  idiomaAtual = idiomaEfetivo();
  montarBotoesDocumento();
  montarIdiomas();
  montarModalPaises();
  montarCasosLimite();
  refletirConfigNaUI();
  aplicarIdioma(idiomaAtual);
  atualizarBandeiraPais();
  ligarEventos();
  await detectarCampo();
});

// Marcadores visuais para caracteres invisíveis (só na exibição; o valor
// inserido/copiado permanece cru). Ajuda o QA a "ver" o que está no campo.
const MARCADORES = {
  " ": "\u00b7", // espaço comum (só quando marcarEspacos)
  "\t": "\u21e5",
  "\n": "\u21b5",
  "\r": "\u240d",
  "\u00A0": "\u235d", // NBSP
  "\u0000": "\u2400", // NUL
  "\u200B": "\u2205", // zero-width space
  "\uFEFF": "\u2205", // BOM
  "\u202E": "\u27f5", // RTL override
};

/** Versão visível de um valor: troca invisíveis por marcadores; "" vira rótulo. */
function visualizarValor(valor, marcarEspacos) {
  if (valor === "") return { texto: t(idiomaAtual, "lim_vazio"), placeholder: true };
  let saida = "";
  for (const ch of valor) {
    if (ch === " ") saida += marcarEspacos ? MARCADORES[" "] : " ";
    else saida += MARCADORES[ch] ?? ch;
  }
  return { texto: saida, placeholder: false };
}

/** Contagens compactas (grafema · code point · code unit · byte). */
function contagensCompactas(valor) {
  const c = contarTudo(valor);
  return `${c.grafemas} gr · ${c.codePoints} cp · ${c.codeUnits} cu · ${c.bytes} B`;
}

/** Monta as famílias de casos-limite na aba (chamado uma vez no init). */
function montarCasosLimite() {
  const cont = $("#lim-familias");
  cont.textContent = "";
  for (const fam of FAMILIAS_LIMITE) {
    cont.appendChild(criarFamiliaLimite(fam));
  }
}

function criarFamiliaLimite(fam) {
  const bloco = document.createElement("div");
  bloco.className = "lim-familia";
  bloco.dataset.fam = fam.id;

  const cab = document.createElement("div");
  cab.className = "lim-familia__cab";
  const tit = document.createElement("span");
  tit.className = "lim-familia__tit";
  tit.dataset.i18n = fam.tituloKey;
  tit.textContent = t(idiomaAtual, fam.tituloKey);
  const btnTodos = document.createElement("button");
  btnTodos.className = "lim-copiar-todos";
  btnTodos.dataset.i18n = "lim_copiar_todos";
  btnTodos.textContent = t(idiomaAtual, "lim_copiar_todos");
  btnTodos.addEventListener("click", () => copiarTodos(fam));
  cab.append(tit, btnTodos);

  const lista = document.createElement("div");
  lista.className = "lim-lista";
  for (const caso of fam.casos) {
    lista.appendChild(criarCasoLimite(caso, fam));
  }
  bloco.append(cab, lista);
  return bloco;
}

function criarCasoLimite(caso, fam) {
  const linha = document.createElement("div");
  linha.className = "lim-caso" + (fam.perigo ? " lim-caso--perigo" : "");
  // Texto de busca (rótulo + porquê + tags), usado pelo filtro.
  linha.dataset.busca = [caso.rotulo, caso.porque, ...(caso.tags || [])]
    .join(" ").toLowerCase();

  const main = document.createElement("button");
  main.className = "lim-caso__main";
  main.title = t(idiomaAtual, "inserir_campo");
  main.addEventListener("click", () => usarValorAvulso(caso.valor, caso.rotulo));

  const linha1 = document.createElement("div");
  linha1.className = "lim-caso__l1";
  const vis = visualizarValor(caso.valor, caso.invisivel);
  const val = document.createElement("code");
  val.className = "lim-caso__valor" + (vis.placeholder ? " lim-caso__valor--vazio" : "");
  val.textContent = vis.texto;
  val.dir = "ltr"; // valores são sempre mostrados em LTR, mesmo em UI RTL
  const rot = document.createElement("span");
  rot.className = "lim-caso__rot";
  rot.textContent = caso.rotulo;
  linha1.append(val, rot);

  const pq = document.createElement("span");
  pq.className = "lim-caso__pq";
  pq.textContent = caso.porque || "";

  main.append(linha1, pq);

  if (fam.contar) {
    const cont = document.createElement("span");
    cont.className = "lim-caso__cont";
    cont.textContent = contagensCompactas(caso.valor);
    main.appendChild(cont);
  }

  const copiar = document.createElement("button");
  copiar.className = "lim-caso__copiar";
  copiar.title = t(idiomaAtual, "copiar");
  copiar.setAttribute("aria-label", t(idiomaAtual, "copiar"));
  copiar.innerHTML = ICONE_COPIAR;
  copiar.addEventListener("click", (e) => {
    e.stopPropagation();
    copiar_(caso.valor);
  });

  linha.append(main, copiar);
  return linha;
}

/** Copia um valor avulso para a área de transferência com feedback. */
async function copiar_(valor) {
  await copiar(valor, "#feedback-invalido");
}

/** Copia todos os valores de uma família, um por linha. */
async function copiarTodos(fam) {
  const texto = fam.casos.map((c) => c.valor).join("\n");
  try {
    await navigator.clipboard.writeText(texto);
    mostrarFeedback(t(idiomaAtual, "lim_copiados", { n: fam.casos.length }), "ok", "#feedback-invalido");
  } catch {
    mostrarFeedback(t(idiomaAtual, "fb_copiar_erro"), "erro", "#feedback-invalido");
  }
}

/** Filtro de busca: esconde casos/famílias que não batem com o termo. */
function filtrarCasos(termo) {
  const q = termo.trim().toLowerCase();
  let visiveis = 0;
  for (const fam of document.querySelectorAll("#lim-familias .lim-familia")) {
    let famVisiveis = 0;
    for (const caso of fam.querySelectorAll(".lim-caso")) {
      const bate = !q || caso.dataset.busca.includes(q);
      caso.hidden = !bate;
      if (bate) famVisiveis++;
    }
    fam.hidden = famVisiveis === 0;
    visiveis += famVisiveis;
  }
  $("#lim-sem-resultado").hidden = visiveis > 0;
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

// Ordem em que as categorias aparecem no painel Documentos.
const ORDEM_CATEGORIAS = ["Pessoa", "Empresa", "Veículo", "Contato", "Financeiro"];

/** Botões de documento agrupados por categoria, para o país ativo. */
function montarBotoesDocumento() {
  const container = $("#botoes-doc");
  container.textContent = ""; // re-render ao trocar de país

  // Agrupa os tipos do país por categoria.
  const grupos = new Map();
  for (const [tipo, def] of Object.entries(tiposDoPais(config.pais))) {
    const cat = def.categoria || "Outros";
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat).push([tipo, def]);
  }

  const ordem = [...ORDEM_CATEGORIAS, ...[...grupos.keys()].filter((c) => !ORDEM_CATEGORIAS.includes(c))];
  for (const cat of ordem) {
    const itens = grupos.get(cat);
    if (!itens) continue;

    const grupo = document.createElement("div");
    grupo.className = "grupo-doc";
    const rot = document.createElement("span");
    rot.className = "grupo-doc__rot";
    rot.dataset.cat = cat; // permite re-traduzir ao trocar de idioma
    rot.textContent = t(idiomaAtual, `cat_${cat}`);
    const grade = document.createElement("div");
    grade.className = "grade-doc";

    for (const [tipo, def] of itens) {
      const btn = document.createElement("button");
      btn.className = "doc-btn";
      btn.dataset.tipo = tipo;
      if (def.rotuloKey) btn.dataset.rotulokey = def.rotuloKey;
      const rotulo = def.rotuloKey ? t(idiomaAtual, def.rotuloKey) : def.rotulo;
      btn.textContent = rotulo;
      btn.title = `${t(idiomaAtual, "gerar")} ${rotulo}`;
      grade.appendChild(btn);
    }
    grupo.append(rot, grade);
    container.appendChild(grupo);
  }
}

function refletirConfigNaUI() {
  $("#opt-mascara").checked = config.documentos.mascara;
  $("#opt-alfanumerico").checked = config.documentos.cnpjAlfanumerico;
  $("#opt-ambiguas").checked = config.documentos.cnpjExcluirAmbiguas;
  $("#wrap-ambiguas").hidden = !config.documentos.cnpjAlfanumerico;
  $("#opcoes-cnpj").hidden = !paisMostraOpcoesCnpj(config.pais); // só p/ países com CNPJ
  $("#modo-insercao").value = config.insercao.modo;
  $("#sel-tema").value = config.tema;
  $("#sel-idioma").value = config.idiomaFixo || "auto";
  $("#campo-seed").value = config.seed;
  aplicarTema(config.tema);
}

// --- Tema (claro / escuro / automático) -------------------------------------

/** Aplica o tema: força data-theme, ou remove p/ seguir o sistema (auto). */
function aplicarTema(tema) {
  const root = document.documentElement;
  if (tema === "claro" || tema === "escuro") root.setAttribute("data-theme", tema);
  else root.removeAttribute("data-theme");
  const btn = $("#btn-tema");
  btn.innerHTML = ICONES_TEMA[tema] || ICONES_TEMA.auto;
  btn.title = `${t(idiomaAtual, "t_tema")}: ${t(idiomaAtual, CHAVE_TEMA[tema])}`;
}

async function aoAlternarTema() {
  const proximo = PROXIMO_TEMA[config.tema] || "auto";
  await atualizarConfig((c) => (c.tema = proximo));
  aplicarTema(proximo);
  $("#sel-tema").value = proximo;
}

async function aoMudarTema(e) {
  const tema = e.target.value;
  await atualizarConfig((c) => (c.tema = tema));
  aplicarTema(tema);
}

// --- País dos dados + idioma (o idioma acompanha o país) --------------------

/** Monta a lista de países no modal (implementados selecionáveis; resto "em breve"). */
function montarModalPaises() {
  const lista = $("#lista-paises");
  lista.textContent = "";
  for (const pais of PAISES_DISPONIVEIS) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "pais-btn";
    btn.dataset.pais = pais.codigo;
    btn.disabled = !pais.implementado;

    const bandeira = document.createElement("span");
    bandeira.innerHTML = BANDEIRAS_PAIS[pais.codigo] || "";
    const nome = document.createElement("span");
    nome.className = "nome";
    nome.dataset.paisNome = pais.codigo; // p/ re-traduzir
    nome.textContent = t(idiomaAtual, `pais_${pais.codigo}`);
    btn.append(bandeira, nome);

    if (!pais.implementado) {
      const tag = document.createElement("span");
      tag.className = "em-breve";
      tag.dataset.i18n = "modal_em_breve";
      tag.textContent = t(idiomaAtual, "modal_em_breve");
      btn.appendChild(tag);
    } else {
      btn.addEventListener("click", () => mudarPais(pais.codigo));
    }
    li.appendChild(btn);
    lista.appendChild(li);
  }
}

function abrirModalPais() {
  $("#modal-pais").hidden = false;
}

function fecharModalPais() {
  $("#modal-pais").hidden = true;
}

/**
 * Idioma da interface em vigor: o fixado pelo QA (config.idiomaFixo) ou, se
 * for "automático" (null), o idioma do país dos dados.
 */
function idiomaEfetivo() {
  return config.idiomaFixo || idiomaDoPais(config.pais);
}

/**
 * Troca o idioma da interface (seletor da aba Config). "auto" volta a seguir o
 * país. Não mexe nos dados — só nos rótulos e textos da tela.
 */
async function aoMudarIdioma(e) {
  const valor = e.target.value; // "auto" | "pt" | "es" | "en" | "zh"
  await atualizarConfig((c) => (c.idiomaFixo = valor === "auto" ? null : valor));
  idiomaAtual = idiomaEfetivo();
  aplicarIdioma(idiomaAtual);
}

/** Troca o país dos dados: idioma acompanha, botões e menu se refazem. */
async function mudarPais(pais) {
  grupoRaiz = null; // novo país = novo grupo de CNPJ/tax id
  await atualizarConfig((c) => {
    c.pais = pais;
    c.contador = 0; // reinicia a sequência determinística no novo país
  });
  idiomaAtual = idiomaEfetivo();
  montarBotoesDocumento();
  ligarEventosDocBtns();
  $("#opcoes-cnpj").hidden = !paisMostraOpcoesCnpj(pais);
  aplicarIdioma(idiomaAtual);
  atualizarBandeiraPais();
  fecharModalPais();
  // Esconde resultados do país anterior.
  $("#resultado").hidden = true;
  $("#resultado-invalido").hidden = true;
}

/** Atualiza a bandeira do cabeçalho e o item ativo no modal. */
function atualizarBandeiraPais() {
  $("#btn-pais").innerHTML = BANDEIRAS_PAIS[config.pais] || "";
  document.querySelectorAll(".pais-btn").forEach((b) =>
    b.classList.toggle("ativo", b.dataset.pais === config.pais)
  );
}

/** (Re)liga os cliques dos botões de documento — chamado após re-render. */
function ligarEventosDocBtns() {
  document.querySelectorAll(".doc-btn[data-tipo]").forEach((b) => {
    b.onclick = () => aoGerar(b.dataset.tipo);
  });
}

/** Aplica o idioma: traduz elementos [data-i18n*], categorias, tema, países. */
function aplicarIdioma(idioma) {
  idiomaAtual = idioma;
  document.documentElement.lang = LANG_ATTR[idioma] || "pt-BR";
  document.documentElement.dir = DIR_ATTR[idioma] || "ltr"; // árabe = rtl

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(idioma, el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(idioma, el.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(idioma, el.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(idioma, el.dataset.i18nPh);
  });

  // Rótulos de categoria (montados dinamicamente).
  document.querySelectorAll(".grupo-doc__rot[data-cat]").forEach((el) => {
    el.textContent = t(idioma, `cat_${el.dataset.cat}`);
  });

  // Botões de documento: rótulo no idioma da interface (via rotuloKey).
  document.querySelectorAll(".doc-btn[data-rotulokey]").forEach((btn) => {
    const rotulo = t(idioma, btn.dataset.rotulokey);
    btn.textContent = rotulo;
    btn.title = `${t(idioma, "gerar")} ${rotulo}`;
  });

  // Nomes de país no modal (montados dinamicamente).
  document.querySelectorAll("[data-pais-nome]").forEach((el) => {
    el.textContent = t(idioma, `pais_${el.dataset.paisNome}`);
  });

  aplicarTema(config.tema); // re-traduz o title do botão de tema

  // Recontagem já exibida usa rótulos traduzidos.
  if (ultimoTexto !== null) renderContagens(ultimoTexto);
}

// --- Eventos ----------------------------------------------------------------

function ligarEventos() {
  document.querySelectorAll(".doc-btn[data-tipo]").forEach((b) =>
    b.addEventListener("click", () => aoGerar(b.dataset.tipo))
  );

  // Abas principais.
  document.querySelectorAll(".aba").forEach((aba) =>
    aba.addEventListener("click", () => mostrarView(aba.dataset.view))
  );

  $("#btn-copiar").addEventListener("click", () => copiar(ultimoValor));
  $("#btn-inserir").addEventListener("click", aoInserir);

  $("#opt-mascara").addEventListener("change", (e) =>
    atualizarConfig((c) => (c.documentos.mascara = e.target.checked))
  );
  $("#opt-alfanumerico").addEventListener("change", (e) => {
    $("#wrap-ambiguas").hidden = !e.target.checked;
    grupoRaiz = null; // muda o formato da raiz → novo grupo
    atualizarConfig((c) => (c.documentos.cnpjAlfanumerico = e.target.checked));
  });
  $("#opt-ambiguas").addEventListener("change", (e) => {
    grupoRaiz = null;
    atualizarConfig((c) => (c.documentos.cnpjExcluirAmbiguas = e.target.checked));
  });
  $("#modo-insercao").addEventListener("change", (e) =>
    atualizarConfig((c) => (c.insercao.modo = e.target.value))
  );

  $("#campo-seed").addEventListener("change", aoMudarSeed);
  $("#btn-nova-seed").addEventListener("click", aoNovaSeed);

  $("#btn-tema").addEventListener("click", aoAlternarTema);
  $("#sel-tema").addEventListener("change", aoMudarTema);
  $("#sel-idioma").addEventListener("change", aoMudarIdioma);

  $("#btn-pais").addEventListener("click", abrirModalPais);
  document.querySelectorAll("#modal-pais [data-fechar]").forEach((el) =>
    el.addEventListener("click", fecharModalPais)
  );

  $("#btn-overflow").addEventListener("click", aoGerarOverflow);
  $("#lim-busca").addEventListener("input", (e) => filtrarCasos(e.target.value));

  document.querySelectorAll("#txt-tipo .seg").forEach((b) =>
    b.addEventListener("click", () => selecionarTipoTexto(b.dataset.tipo))
  );
  $("#txt-pseudo").addEventListener("change", (e) => {
    $("#wrap-bidi").hidden = !e.target.checked;
  });
  $("#btn-gerar-texto").addEventListener("click", aoGerarTexto);
  $("#btn-copiar-texto").addEventListener("click", () => copiar(ultimoTexto, "#feedback-texto"));
  $("#btn-inserir-texto").addEventListener("click", aoInserirTexto);

  $("#btn-config").addEventListener("click", () => alternarView("config"));
  $("#btn-historico").addEventListener("click", () => alternarView("historico"));
  $("#btn-limpar-hist").addEventListener("click", async () => {
    await limparHistorico();
    await renderizarHistorico();
  });
}

// --- Navegação entre views (abas + painéis de ícone) ------------------------

// Views acionadas por abas; config/histórico entram pelos ícones do cabeçalho.
const VIEWS_ABA = new Set(["documentos", "texto", "invalidos"]);
let viewAtual = "documentos";

function mostrarView(nome) {
  viewAtual = nome;
  document.querySelectorAll(".painel").forEach((p) =>
    p.classList.toggle("painel--ativo", p.dataset.view === nome)
  );
  // Aba fica ativa só para as 3 principais; ícones ganham realce quando ativos.
  document.querySelectorAll(".aba").forEach((a) =>
    a.classList.toggle("aba--ativa", a.dataset.view === nome)
  );
  $("#btn-config").classList.toggle("ativo", nome === "config");
  $("#btn-historico").classList.toggle("ativo", nome === "historico");
}

/** Ícone do cabeçalho: abre a view; clicar de novo volta para Documentos. */
async function alternarView(nome) {
  if (viewAtual === nome) {
    mostrarView("documentos");
    return;
  }
  if (nome === "historico") await renderizarHistorico();
  mostrarView(nome);
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
  // Documentos "mesma raiz" (ex.: CNPJ matriz + filiais) têm fluxo próprio.
  if (tiposDoPais(config.pais)[tipo]?.raiz) return aoGerarCnpjRaiz(tipo);

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

/** Mesma raiz: 1º clique = matriz (0001); seguintes = filiais (0002…). */
async function aoGerarCnpjRaiz(tipo) {
  let valor, ordem, chaveFb;
  if (!grupoRaiz) {
    // Matriz: gerada pelo rng (seed:contador), como qualquer documento.
    const r = gerar(tipo, config);
    await persistirContador(r.proximoContador);
    config.contador = r.proximoContador;
    valor = r.valor;
    const raiz = valor.replace(/[.\-/]/g, "").toUpperCase().slice(0, 8);
    grupoRaiz = { raiz, ordem: 1 };
    ordem = 1;
    chaveFb = "fb_cnpj_matriz";
  } else {
    // Filial: mesma raiz, próxima ordem (não consome o contador da seed).
    grupoRaiz.ordem += 1;
    ordem = grupoRaiz.ordem;
    valor = cnpjDeRaiz(grupoRaiz.raiz, ordem, { mascara: config.documentos.mascara });
    chaveFb = "fb_cnpj_filial";
  }
  ultimoValor = valor;
  $("#valor-gerado").textContent = valor;
  $("#resultado").hidden = false;
  mostrarFeedback(t(idiomaAtual, chaveFb, { ordem: String(ordem).padStart(4, "0") }), "ok");

  await adicionarHistorico({
    tipo,
    valor,
    seed: config.seed,
    contador: config.contador,
    em: Date.now(),
  });
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

/** Alterna o tipo de texto (palavras/frases/tamanho) e os controles visíveis. */
function selecionarTipoTexto(tipo) {
  tipoTexto = tipo;
  document.querySelectorAll("#txt-tipo .seg").forEach((b) =>
    b.classList.toggle("seg--ativo", b.dataset.tipo === tipo)
  );
  $("#ctrl-qtd").hidden = tipo === "tamanho";
  $("#ctrl-tamanho").hidden = tipo !== "tamanho";
}

/** Geração de texto unificada: palavras / frases / por tamanho (+ pseudo). */
async function aoGerarTexto() {
  const idioma = $("#idioma").value;
  const pseudo = $("#txt-pseudo").checked;
  const fakebidi = pseudo && $("#txt-bidi").checked;

  let texto, rotuloHist;
  const { rng, usado } = await proximoRng();

  if (tipoTexto === "tamanho") {
    const unidade = $("#tam-unidade").value;
    const alvo = parseInt($("#tam-alvo").value, 10);
    if (!Number.isInteger(alvo) || alvo < 0) {
      mostrarFeedback(t(idiomaAtual, "fb_tam_invalido"), "erro", "#feedback-texto");
      return;
    }
    // Usa as palavras do idioma como filler → a divergência de bytes fica real.
    const filler = IDIOMAS[idioma].palavras.join(" ");
    texto = gerarPorTamanho(rng, { unidade, alvo, filler }).texto;
    rotuloHist = `texto:${unidade}=${alvo}`;
  } else {
    const qtd = Math.max(1, parseInt($("#txt-qtd").value, 10) || 1);
    texto = tipoTexto === "frases"
      ? gerarFrases(rng, idioma, qtd)
      : gerarPalavras(rng, idioma, qtd);
    rotuloHist = `texto:${tipoTexto}:${idioma}`;
  }

  // Direção RTL só faz sentido no texto "cru" do idioma (não no pseudo latino).
  let dirIdioma = idioma;
  if (pseudo) {
    texto = pseudolocalizar(texto, { fakebidi });
    dirIdioma = null;
    rotuloHist += ":pseudo";
  }

  mostrarTexto(texto, dirIdioma);
  await adicionarHistorico({
    tipo: rotuloHist,
    valor: texto,
    seed: config.seed,
    contador: usado,
    em: Date.now(),
  });
  if (!$("#secao-historico").hidden) await renderizarHistorico();
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
    [t(idiomaAtual, "c_grafemas"), c.grafemas],
    [t(idiomaAtual, "c_codepoints"), c.codePoints],
    [t(idiomaAtual, "c_codeunits"), c.codeUnits],
    [t(idiomaAtual, "c_bytes"), c.bytes],
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

/** Traduz o resultado de inserirNoCampoAtivo em (texto, tipo) de feedback. */
function feedbackInsercao(r) {
  if (r.ok) return { texto: t(idiomaAtual, "fb_inserido"), tipo: "ok" };
  const chave =
    r.motivo === "sem-campo" ? "fb_sem_campo"
    : r.motivo === "pagina-bloqueada" ? "fb_pagina_bloqueada"
    : "fb_nao_inseriu";
  return { texto: t(idiomaAtual, chave), tipo: "erro" };
}

async function aoInserirTexto() {
  if (!ultimoTexto) return;
  const r = await inserirNoCampoAtivo(ultimoTexto, config.insercao.modo);
  const f = feedbackInsercao(r);
  mostrarFeedback(f.texto, f.tipo, "#feedback-texto");
}

// --- Casos-limite (overflow + inserção de valores avulsos) ------------------

async function aoGerarOverflow() {
  const tam = parseInt($("#overflow-tam").value, 10);
  if (!Number.isInteger(tam) || tam < 1) {
    mostrarFeedback(t(idiomaAtual, "fb_tam_invalido"), "erro", "#feedback-invalido");
    return;
  }
  const texto = gerarOverflow(tam);
  mostrarTexto(texto, null); // mostra as 4 contagens do overflow
  mostrarView("texto"); // leva o usuário ao painel onde o resultado aparece
  mostrarFeedback(t(idiomaAtual, "fb_overflow", { n: tam }), "ok", "#feedback-texto");
}

/** Insere um valor avulso (caso-limite) no campo ativo, ou copia. */
async function usarValorAvulso(valor, rotulo) {
  const r = await inserirNoCampoAtivo(valor, config.insercao.modo);
  if (r.ok) {
    mostrarFeedback(t(idiomaAtual, "fb_chip_inserido", { rotulo }), "ok", "#feedback-invalido");
  } else if (r.motivo === "sem-campo") {
    // Sem campo focado: cai para a área de transferência.
    await copiar(valor, "#feedback-invalido");
  } else {
    mostrarFeedback(t(idiomaAtual, "fb_nao_inseriu"), "erro", "#feedback-invalido");
  }
}

// --- Copiar -----------------------------------------------------------------

async function copiar(valor, sel = "#feedback") {
  if (!valor) return;
  try {
    await navigator.clipboard.writeText(valor);
    mostrarFeedback(t(idiomaAtual, "fb_copiado"), "ok", sel);
  } catch {
    mostrarFeedback(t(idiomaAtual, "fb_copiar_erro"), "erro", sel);
  }
}

// --- Inserir no campo ativo -------------------------------------------------

async function aoInserir() {
  if (!ultimoValor) return;
  const r = await inserirNoCampoAtivo(ultimoValor, config.insercao.modo);
  const f = feedbackInsercao(r);
  mostrarFeedback(f.texto, f.tipo);
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
        { app: "proteu", tipo: "INSERIR", valor, modo },
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
        { app: "proteu", tipo: "DETECTAR" },
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
    chip.title = item.valor === "" ? t(idiomaAtual, "str_vazia") : item.valor;
    chip.addEventListener("click", async () => {
      const r = await inserirNoCampoAtivo(item.valor, config.insercao.modo);
      mostrarFeedback(
        r.ok ? t(idiomaAtual, "fb_chip_inserido", { rotulo: item.rotulo }) : t(idiomaAtual, "fb_nao_inseriu"),
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
  grupoRaiz = null; // nova seed = novo grupo de CNPJ
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
  grupoRaiz = null; // nova seed = novo grupo de CNPJ
  await atualizarConfig((c) => {
    c.seed = nova;
    c.contador = 0;
  });
}

// --- Histórico --------------------------------------------------------------

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
    copiar.setAttribute("aria-label", "Copiar");
    copiar.innerHTML = ICONE_COPIAR;
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
