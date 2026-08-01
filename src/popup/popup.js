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
import { gerarPersona } from "../core/persona.js";
import { planejarPreenchimento } from "../core/mapeamento.js";
import { gerarLote, serializar, FORMATOS } from "../core/exportar.js";
import { proximoTema } from "../core/tema.js";
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
  de: '<svg class="bandeira" viewBox="0 0 24 16"><rect width="24" height="16" fill="#000"/><rect y="5.33" width="24" height="5.33" fill="#dd0000"/><rect y="10.66" width="24" height="5.34" fill="#ffce00"/></svg>',
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
const CHAVE_TEMA = { auto: "tema_auto", claro: "tema_claro", escuro: "tema_escuro" };

// Estado local do popup; a fonte da verdade é o chrome.storage.
let config = null;
let idiomaAtual = "pt";
let ultimoTexto = null;
let tipoTexto = "palavras"; // "palavras" | "frases" | "tamanho"
let personaAtual = null;
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
  montarIdiomas();
  montarModalPaises();
  montarCasosLimite();
  refletirConfigNaUI();
  aplicarIdioma(idiomaAtual);
  atualizarBandeiraPais();
  ligarEventos();
  await aoNovaPersona(); // a aba Persona já abre com uma pessoa pronta
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

// Ordem em que as seções aparecem no perfil. Categorias fora desta lista
// entram depois, na ordem em que o registro do país as declara.
const ORDEM_CATEGORIAS = ["Pessoa", "Empresa"];

/**
 * Desenha o perfil em seções (Pessoa / Empresa). Os campos essenciais ficam à
 * vista; o resto vai para um "mostrar mais" — é o que mantém a aba enxuta
 * mesmo em países com muitos documentos (o Brasil tem 12).
 */
function renderizarPerfil() {
  const cont = $("#perfil-secoes");
  cont.textContent = "";
  if (!personaAtual) return;

  const porCategoria = new Map();
  for (const campo of personaAtual.campos) {
    const cat = campo.categoria || "Pessoa";
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat).push(campo);
  }

  const ordem = [
    ...ORDEM_CATEGORIAS,
    ...[...porCategoria.keys()].filter((c) => !ORDEM_CATEGORIAS.includes(c)),
  ];

  for (const cat of ordem) {
    const campos = porCategoria.get(cat);
    if (!campos) continue;

    const secao = document.createElement("section");
    secao.className = "pf-secao";

    const rot = document.createElement("span");
    rot.className = "pf-secao__rot";
    rot.dataset.cat = cat; // permite re-traduzir ao trocar de idioma
    rot.textContent = t(idiomaAtual, `cat_${cat}`);
    secao.appendChild(rot);

    const essenciais = campos.filter((c) => c.essencial);
    const extras = campos.filter((c) => !c.essencial);

    for (const campo of essenciais) secao.appendChild(criarLinhaPerfil(campo));

    if (extras.length) {
      const det = document.createElement("details");
      det.className = "pf-mais";
      const sum = document.createElement("summary");
      sum.className = "pf-mais__cab";
      sum.textContent = t(idiomaAtual, "pf_mais", { n: extras.length });
      det.appendChild(sum);
      for (const campo of extras) det.appendChild(criarLinhaPerfil(campo));
      secao.appendChild(det);
    }

    // Documentos sequenciais (CNPJ matriz + filiais) são uma AÇÃO, não um
    // campo com valor único — ficam como botão no fim da seção.
    for (const [tipo, def] of Object.entries(tiposDoPais(config.pais))) {
      if (!def.raiz || (def.categoria || "Pessoa") !== cat) continue;
      const btn = document.createElement("button");
      btn.className = "pf-acao-raiz";
      btn.dataset.tipo = tipo;
      btn.dataset.rotulokey = def.rotuloKey || "";
      btn.textContent = `+ ${def.rotuloKey ? t(idiomaAtual, def.rotuloKey) : def.rotulo}`;
      btn.addEventListener("click", () => aoGerarCnpjRaiz(tipo));
      secao.appendChild(btn);
    }

    cont.appendChild(secao);
  }
}

/** Uma linha do perfil: clique insere no campo (ou copia); o botão só copia. */
function criarLinhaPerfil(campo) {
  const linha = document.createElement("div");
  linha.className = "pf-linha";
  // Identificam a linha sem depender do rótulo (que muda com o idioma).
  linha.dataset.slot = campo.slot;
  if (campo.chaveTipo) linha.dataset.chave = campo.chaveTipo;

  const main = document.createElement("button");
  main.className = "pf-linha__main";
  main.title = t(idiomaAtual, "inserir_campo");
  main.addEventListener("click", () => usarValorAvulso(campo.valor, rotuloDoCampo(campo), "#feedback-persona"));

  const rot = document.createElement("span");
  rot.className = "pf-linha__rot";
  if (campo.rotuloKey) rot.dataset.rotulokey = campo.rotuloKey;
  rot.textContent = rotuloDoCampo(campo);

  const val = document.createElement("code");
  val.className = "pf-linha__val";
  val.textContent = campo.valor;
  val.dir = "ltr"; // valores sempre LTR, mesmo com a UI em árabe
  main.append(rot, val);

  const btnCopiar = document.createElement("button");
  btnCopiar.className = "pf-linha__copiar";
  btnCopiar.title = t(idiomaAtual, "copiar");
  btnCopiar.setAttribute("aria-label", t(idiomaAtual, "copiar"));
  btnCopiar.innerHTML = ICONE_COPIAR;
  btnCopiar.addEventListener("click", (e) => {
    e.stopPropagation();
    copiar(campo.valor, "#feedback-persona");
  });

  linha.append(main, btnCopiar);
  return linha;
}

/** Rótulo do campo no idioma da interface (cai no literal do país). */
function rotuloDoCampo(campo) {
  return campo.rotuloKey ? t(idiomaAtual, campo.rotuloKey) : campo.rotulo;
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

/**
 * Botão do cabeçalho: inverte o tema QUE ESTÁ NA TELA.
 *
 * Antes ele ciclava auto → claro → escuro → auto, e como "auto" coincide com
 * claro ou escuro conforme o sistema, um clique em cada três não mudava nada.
 * O modo "auto" continua disponível no seletor da aba Configurações.
 */
async function aoAlternarTema() {
  const sistemaEscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const proximo = proximoTema(config.tema, sistemaEscuro);
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
    // Busca "fixa" (independe do idioma): nome canônico PT + código do país.
    // Combinada com o nome traduzido (lido ao vivo) no filtro.
    li.dataset.buscaFixa = normalizarBusca(`${pais.rotulo} ${pais.codigo}`);
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

/** Normaliza p/ busca: minúsculas, sem acentos, aparado. */
function normalizarBusca(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/** Filtra os países do modal pelo termo (nome traduzido, nome PT ou código). */
function filtrarPaises(termo) {
  const q = normalizarBusca(termo);
  let visiveis = 0;
  for (const li of document.querySelectorAll("#lista-paises li")) {
    const nome = li.querySelector(".nome")?.textContent || "";
    const bate = !q || li.dataset.buscaFixa.includes(q) || normalizarBusca(nome).includes(q);
    li.hidden = !bate;
    if (bate) visiveis++;
  }
  $("#modal-sem-pais").hidden = visiveis > 0;
}

function abrirModalPais() {
  $("#modal-pais").hidden = false;
  const busca = $("#busca-pais");
  busca.value = "";
  filtrarPaises(""); // mostra todos
  busca.focus();
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
  $("#opcoes-cnpj").hidden = !paisMostraOpcoesCnpj(pais);
  aplicarIdioma(idiomaAtual);
  atualizarBandeiraPais();
  fecharModalPais();
  // Novo país = novo perfil: os documentos do anterior não valem mais.
  // (renderizarPerfil roda dentro de aoNovaPersona.)
  await aoNovaPersona();
}

/** Atualiza a bandeira do cabeçalho e o item ativo no modal. */
function atualizarBandeiraPais() {
  $("#btn-pais").innerHTML = BANDEIRAS_PAIS[config.pais] || "";
  document.querySelectorAll(".pais-btn").forEach((b) =>
    b.classList.toggle("ativo", b.dataset.pais === config.pais)
  );
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

  // Nomes de país no modal (montados dinamicamente).
  document.querySelectorAll("[data-pais-nome]").forEach((el) => {
    el.textContent = t(idioma, `pais_${el.dataset.paisNome}`);
  });

  aplicarTema(config.tema); // re-traduz o title do botão de tema

  // Persona já exibida: rótulos no novo idioma (os valores não mudam).
  if (personaAtual) renderizarPerfil();

  // Recontagem já exibida usa rótulos traduzidos.
  if (ultimoTexto !== null) renderContagens(ultimoTexto);

  // O rótulo deste botão depende da permissão, não só do idioma.
  atualizarBotaoPermissao();
}

// --- Eventos ----------------------------------------------------------------

function ligarEventos() {
  // Abas principais.
  document.querySelectorAll(".aba").forEach((aba) =>
    aba.addEventListener("click", () => mostrarView(aba.dataset.view))
  );


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
  $("#busca-pais").addEventListener("input", (e) => filtrarPaises(e.target.value));
  document.querySelectorAll("#modal-pais [data-fechar]").forEach((el) =>
    el.addEventListener("click", fecharModalPais)
  );

  $("#btn-overflow").addEventListener("click", aoGerarOverflow);
  $("#lim-busca").addEventListener("input", (e) => filtrarCasos(e.target.value));

  $("#btn-nova-persona").addEventListener("click", aoNovaPersona);
  $("#btn-preencher-form").addEventListener("click", aoPreencherFormulario);
  $("#btn-permissao-seletor").addEventListener("click", aoPedirPermissaoSeletor);
  $("#btn-exp-copiar").addEventListener("click", aoExportarCopiar);
  $("#btn-exp-baixar").addEventListener("click", aoExportarBaixar);

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
const VIEWS_ABA = new Set(["perfil", "texto", "invalidos"]);
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

/**
 * Mesma raiz: 1º clique = matriz (0001); seguintes = filiais (0002…).
 * É a única geração que continua sendo uma AÇÃO (não um campo do perfil),
 * porque o valor muda a cada clique dentro do mesmo grupo.
 */
async function aoGerarCnpjRaiz(tipo) {
  config = await carregarConfig();
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
  // O rótulo já leva a ordem ("CNPJ matriz (0001)"), então uma única mensagem
  // dá conta: antes, um mostrarFeedback logo depois sobrescrevia o resultado
  // da inserção e escondia falhas.
  const rotulo = t(idiomaAtual, chaveFb, { ordem: String(ordem).padStart(4, "0") });
  await usarValorAvulso(valor, rotulo, "#feedback-persona");

  await adicionarHistorico({
    tipo,
    valor,
    seed: config.seed,
    contador: config.contador,
    em: Date.now(),
  });
  if (historicoVisivel()) await renderizarHistorico();
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
  if (historicoVisivel()) await renderizarHistorico();
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

// --- Persona (pessoa coerente + preencher o formulário inteiro) -------------

/** Gera uma nova persona, avança o contador e renderiza. */
async function aoNovaPersona() {
  config = await carregarConfig();
  personaAtual = gerarPersona(config);
  // A persona inteira é UMA geração: o contador avança uma vez só, e é isso
  // que faz "seed + contador" reproduzir a pessoa completa.
  await persistirContador(personaAtual.proximoContador);
  config.contador = personaAtual.proximoContador;

  // Uma entrada por pessoa (não uma por campo): guardar o contador basta para
  // reproduzir o perfil inteiro, e o nome é o que identifica quem foi gerado.
  await adicionarHistorico({
    tipo: `perfil:${config.pais}`,
    valor: personaAtual.porSlot.nome || personaAtual.campos[0]?.valor || "",
    seed: config.seed,
    contador: personaAtual.contador,
    em: Date.now(),
  });
  if (historicoVisivel()) await renderizarHistorico();

  renderizarPerfil();
  limparFeedback("#feedback-persona");
}

/**
 * Preenche o formulário da aba ativa com a persona.
 *
 * O content script só coleta e aplica; QUEM DECIDE é core/mapeamento.js, aqui
 * no popup. Cada frame é tratado isoladamente (os índices são por frame).
 */
async function aoPreencherFormulario() {
  if (!personaAtual) await aoNovaPersona();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  let frames;
  try {
    frames = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["src/content/content.js"],
    });
  } catch {
    mostrarFeedback(t(idiomaAtual, "fb_pagina_bloqueada"), "erro", "#feedback-persona");
    return;
  }

  const preencherDesconhecidos = $("#opt-preencher-tudo").checked;
  let preenchidos = 0;
  let ignorados = 0;

  for (const frame of frames) {
    try {
      const coleta = await chrome.tabs.sendMessage(
        tab.id,
        { app: "proteu", tipo: "COLETAR_CAMPOS" },
        { frameId: frame.frameId }
      );
      if (!coleta || !coleta.ok || !coleta.campos.length) continue;

      const { plano, ignorados: ign } = planejarPreenchimento(
        coleta.campos,
        personaAtual,
        { preencherDesconhecidos }
      );
      ignorados += ign;
      if (!plano.length) continue;

      const resp = await chrome.tabs.sendMessage(
        tab.id,
        { app: "proteu", tipo: "PREENCHER_LOTE", plano },
        { frameId: frame.frameId }
      );
      if (resp && resp.preenchidos) preenchidos += resp.preenchidos;
    } catch {
      // frame inacessível; segue para o próximo.
    }
  }

  if (preenchidos === 0) {
    mostrarFeedback(t(idiomaAtual, "fb_sem_campos_form"), "erro", "#feedback-persona");
    return;
  }
  mostrarFeedback(
    t(idiomaAtual, "fb_form_preenchido", { n: preenchidos, ignorados }),
    "ok",
    "#feedback-persona"
  );
}

// --- Exportação em lote (CSV / JSON / fixture) ------------------------------

/**
 * Gera o lote pedido e devolve { texto, formato, lote }, ou null se a
 * quantidade for inválida (já mostrando o feedback).
 */
async function montarExportacao() {
  const qtd = parseInt($("#exp-qtd").value, 10);
  const formato = $("#exp-formato").value;
  config = await carregarConfig();
  let lote;
  try {
    lote = gerarLote(config, qtd);
  } catch {
    mostrarFeedback(t(idiomaAtual, "fb_tam_invalido"), "erro", "#feedback-persona");
    return null;
  }
  // O lote consome contadores: persistir mantém a sequência sem repetir dados.
  await persistirContador(lote.proximoContador);
  config.contador = lote.proximoContador;
  return { texto: serializar(lote, formato), formato, lote };
}

async function aoExportarCopiar() {
  const r = await montarExportacao();
  if (!r) return;
  try {
    await navigator.clipboard.writeText(r.texto);
    mostrarFeedback(
      t(idiomaAtual, "fb_exportado", { n: r.lote.personas.length }),
      "ok",
      "#feedback-persona"
    );
  } catch {
    mostrarFeedback(t(idiomaAtual, "fb_copiar_erro"), "erro", "#feedback-persona");
  }
}

async function aoExportarBaixar() {
  const r = await montarExportacao();
  if (!r) return;
  // Blob + <a download>: baixa sem precisar da permissão "downloads".
  const ext = (FORMATOS[r.formato] || FORMATOS.csv).extensao;
  const blob = new Blob([r.texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proteu-${r.lote.pais}-${r.lote.seed}-${r.lote.personas.length}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  mostrarFeedback(
    t(idiomaAtual, "fb_exportado", { n: r.lote.personas.length }),
    "ok",
    "#feedback-persona"
  );
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
async function usarValorAvulso(valor, rotulo, sel = "#feedback-invalido") {
  const r = await inserirNoCampoAtivo(valor, config.insercao.modo);
  if (r.ok) {
    mostrarFeedback(t(idiomaAtual, "fb_chip_inserido", { rotulo }), "ok", sel);
  } else if (r.motivo === "sem-campo") {
    // Sem campo focado: cai para a área de transferência.
    await copiar(valor, sel);
  } else {
    mostrarFeedback(t(idiomaAtual, "fb_nao_inseriu"), "erro", sel);
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

/**
 * O painel de histórico está aberto? Só então vale re-renderizá-lo.
 *
 * Antes isto checava `$("#secao-historico").hidden` — um id que não existe
 * no HTML. A leitura de `.hidden` em null lançava, e como as chamadas são
 * assíncronas o erro sumia numa promise rejeitada, levando junto o que
 * vinha depois (no caso da persona, a renderização do perfil inteiro).
 */
function historicoVisivel() {
  const painel = document.querySelector('.painel[data-view="historico"]');
  return !!painel && painel.classList.contains("painel--ativo");
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

// --- Permissão do menu de contexto ------------------------------------------
//
// O menu de "copiar seletor" precisa de um listener ouvindo a página ANTES do
// clique com o botão direito — o Chrome não diz em qual elemento o menu foi
// aberto. Isso exige acesso de host, que fica opcional de propósito: quem só
// usa a extensão para gerar massa de dados nunca precisa concedê-lo, e a
// instalação padrão continua sem o aviso de "ler todos os seus dados".

// Não usamos `<all_urls>`: ele engloba `file://` e outros esquemas que o Chrome
// concede à parte, então `permissions.contains` devolveria `false` com a
// permissão visivelmente ligada. Pedimos exatamente o que a extensão usa.
const PERMISSAO_SELETOR = { origins: ["http://*/*", "https://*/*"] };

/** Reflete no botão se a permissão já foi concedida. */
async function atualizarBotaoPermissao() {
  const btn = $("#btn-permissao-seletor");
  const concedida = await chrome.permissions.contains(PERMISSAO_SELETOR);
  btn.textContent = t(idiomaAtual, concedida ? "opt_menu_seletor_ativo" : "opt_menu_seletor_pedir");
  btn.dataset.ativo = concedida ? "1" : "0";
  btn.disabled = concedida;

  // Permissão concedida não garante menu montado: o popup fecha assim que o
  // Chrome mostra o diálogo, e o evento que monta o menu pode não alcançar um
  // service worker dormindo. Reconfirmar aqui é barato e conserta sozinho.
  if (concedida) {
    await chrome.runtime.sendMessage({ app: "proteu", tipo: "SINCRONIZAR" }).catch(() => {});
  }
  await mostrarDiagnostico();
}

/**
 * Mostra os três estados que precisam ser verdade para o menu existir.
 *
 * Sem isso, "não aparece nada" é indistinguível de permissão não concedida,
 * content script não registrado e menu não montado — e cada um tem outra
 * solução. Aparece só quando algo está faltando: com tudo certo, é ruído.
 */
async function mostrarDiagnostico() {
  const aviso = $("#aviso-seletor");
  const lista = $("#diagnostico-seletor");
  const estado = await chrome.runtime
    .sendMessage({ app: "proteu", tipo: "DIAGNOSTICO" })
    .catch(() => null);

  lista.textContent = "";

  if (!estado) {
    aviso.hidden = false;
    lista.appendChild(linhaDiagnostico(false, "o service worker não respondeu"));
    lista.appendChild(saidaDiagnostico("Recarregue a extensão em chrome://extensions."));
    return;
  }

  const linhas = [
    [estado.permissao, "acesso às páginas"],
    [estado.script, "leitor de clique instalado"],
    [estado.menu, "itens no menu do botão direito"],
  ];

  // Tudo certo: o aviso some por inteiro. Ele existe para resolver um
  // problema, não para virar mais um enfeite permanente na interface.
  if (linhas.every(([ok]) => ok)) {
    aviso.hidden = true;
    return;
  }

  aviso.hidden = false;
  // A explicação do pedido some depois de concedido: aí o que falta é outra
  // coisa, e repetir "precisa de acesso" só confunde.
  $("#ajuda-seletor").hidden = estado.permissao;
  for (const [ok, rotulo] of linhas) lista.appendChild(linhaDiagnostico(ok, rotulo));
  lista.appendChild(
    saidaDiagnostico(
      estado.permissao
        ? "Recarregue a extensão em chrome://extensions."
        : "Clique em Ativar aqui em cima."
    )
  );
}

function saidaDiagnostico(texto) {
  const li = document.createElement("li");
  li.className = "saida";
  li.textContent = texto;
  return li;
}

function linhaDiagnostico(ok, rotulo) {
  const li = document.createElement("li");
  li.dataset.ok = ok ? "1" : "0";
  const marca = document.createElement("span");
  marca.className = "marca";
  marca.textContent = ok ? "✓" : "✕";
  li.append(marca, document.createTextNode(rotulo));
  return li;
}

async function aoPedirPermissaoSeletor() {
  // request() só funciona dentro de um gesto do usuário — daí ser um botão, e
  // não algo que a extensão pede sozinha ao abrir.
  const concedida = await chrome.permissions.request(PERMISSAO_SELETOR);
  if (!concedida) {
    mostrarFeedback(t(idiomaAtual, "opt_menu_seletor_negado"), "erro", "#feedback-persona");
  }
  await atualizarBotaoPermissao();
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
