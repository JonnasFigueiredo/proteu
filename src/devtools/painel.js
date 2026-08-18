// Painel do DevTools — abas Inspecionar, Gravador e Mapear.
//
// O painel não toca no DOM da página: tudo passa por
// chrome.devtools.inspectedWindow.eval(), que é o que permite este recurso
// existir sem pedir permissão de host nenhuma. O agente que roda lá dentro é
// injetado junto com src/core/seletores.js, então o motor de seletores tem uma
// implementação só, compartilhada entre painel e página.

import { FORMATOS, FORMATO_PADRAO, gerarCodigo, nomeArquivo } from "../core/gravador/codigo.js";
import { normalizar, descrever } from "../core/gravador/acoes.js";

const $ = (sel) => document.querySelector(sel);

// --- Ponte com a página ------------------------------------------------------

/** Envolve o eval do DevTools numa promise. */
function avaliar(expressao) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(expressao, (resultado, excecao) => {
      if (excecao) {
        reject(new Error(excecao.value || excecao.description || "falha ao avaliar na página"));
        return;
      }
      resolve(resultado);
    });
  });
}

/** Chama um método do agente com argumentos serializados. */
function chamar(metodo, ...args) {
  const lista = args.map((v) => JSON.stringify(v === undefined ? null : v)).join(", ");
  return avaliar(`window.__proteuAgente ? window.__proteuAgente.${metodo}(${lista}) : null`);
}

let injetando = null;

// Módulos que entram na página junto com o agente, nesta ordem. O agente usa
// tudo que eles definem sem importar nada: dentro da IIFE, as declarações são
// só escopo compartilhado. É o que permite ao painel e ao content script do
// menu de contexto usarem a MESMA leitura de DOM e o MESMO motor de seletores.
const MODULOS_DO_AGENTE = [
  "src/core/seletores.js",
  "src/content/leitura-dom.js",
  "src/devtools/agente.js",
];

/**
 * Transforma um módulo ES em declarações soltas, para concatenar.
 *
 * O `[\s\S]` cobre import multilinha. Um stripper de uma linha só deixaria o
 * `} from "..."` solto, e o pacote inteiro deixaria de parsear — o agente não
 * instalaria e o painel ficaria preso em "conectando…".
 */
function semModulo(fonte) {
  return fonte
    .replace(/^import\b[\s\S]*?from\s*["'][^"']+["'];?[ \t]*\r?\n/gm, "")
    .replace(/^import\s+["'][^"']+["'];?[ \t]*\r?\n/gm, "")
    .replace(/^export\s+/gm, "");
}

/**
 * Injeta o agente na página, com os módulos de que ele depende.
 *
 * A alternativa seria o agente carregar tudo por import() — mas ele roda no
 * mundo da página, onde chrome.runtime não existe, então não há URL de
 * extensão para importar. Daí a concatenação.
 */
async function injetar() {
  const partes = await Promise.all(
    MODULOS_DO_AGENTE.map((rel) =>
      fetch(chrome.runtime.getURL(rel)).then((r) => r.text())
    )
  );
  const fonte = `(() => {\n${partes.map(semModulo).join("\n")}\n})()`;
  await avaliar(fonte);
}

/** Garante o agente instalado; reinjeta depois de navegação. */
async function garantirAgente() {
  const vivo = await avaliar("typeof window.__proteuAgente === 'object'");
  if (vivo) return true;
  if (!injetando) injetando = injetar().finally(() => (injetando = null));
  await injetando;
  return true;
}

// --- Estado ------------------------------------------------------------------

const estado = {
  aba: "inspecionar",
  alvo: null, // resultado de analisar()
  mira: false,
  gravando: false,
  acoes: [], // eventos crus, na ordem
  formato: FORMATO_PADRAO,
};

let laco = null;

// --- Utilidades da interface --------------------------------------------------

function avisar(texto) {
  const el = $("#aviso");
  if (!texto) {
    el.hidden = true;
    return;
  }
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(avisar.timer);
  avisar.timer = setTimeout(() => (el.hidden = true), 6000);
}

function conexao(texto, classe = "") {
  const el = $("#estado-conexao");
  el.textContent = texto;
  el.className = "estado " + classe;
}

async function copiar(texto, aviso = "copiado") {
  try {
    await navigator.clipboard.writeText(texto);
    avisar(aviso);
  } catch {
    // Painel sem foco derruba a Clipboard API; o textarea sempre funciona.
    const ta = document.createElement("textarea");
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    avisar(aviso);
  }
}

// --- Aba Inspecionar ----------------------------------------------------------

/** Rótulo e cor do "casa com" de um candidato. */
function seloMatches(c) {
  if (c.matches === -2) return { txt: "sem acesso", cls: "neutro" };
  if (c.matches === -1) return { txt: "inválido", cls: "ruim" };
  if (c.matches === null) return { txt: "—", cls: "neutro" };
  if (c.matches === 0) return { txt: "nada", cls: "ruim" };
  if (c.matches === 1) return { txt: "1 · único", cls: "ok" };
  return { txt: `${c.matches} elementos`, cls: "aviso" };
}

function renderizarAlvo() {
  const vazio = $("#alvo-vazio");
  const info = $("#alvo-info");
  if (!estado.alvo) {
    vazio.hidden = false;
    info.hidden = true;
    return;
  }
  vazio.hidden = true;
  info.hidden = false;
  $("#alvo-resumo").textContent = estado.alvo.resumo;

  // Shadow DOM e iframe mudam o código gerado, então precisam ficar visíveis.
  const partes = [];
  if (estado.alvo.caminhoShadow?.length) {
    partes.push(`Shadow DOM: ${estado.alvo.caminhoShadow.join(" » ")}`);
  }
  if (estado.alvo.caminhoFrame?.length) {
    partes.push(`iframe: ${estado.alvo.caminhoFrame.join(" » ")}`);
  }
  const ctx = $("#alvo-contexto");
  ctx.textContent = partes.join("   ·   ");
  ctx.hidden = partes.length === 0;

  const corpo = $("#lista-seletores");
  corpo.textContent = "";
  const melhor = estado.alvo.candidatos.find((c) => c.unico);

  for (const c of estado.alvo.candidatos) {
    const tr = document.createElement("tr");
    if (c === melhor) tr.className = "melhor";

    const tdTipo = document.createElement("td");
    tdTipo.textContent = c.rotulo;
    tr.appendChild(tdTipo);

    const tdSel = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sel";
    btn.textContent = c.valor;
    btn.title = "Destacar na página";
    btn.addEventListener("click", () => {
      chamar("destacarSeletor", c.valor, c.sintaxe,
        estado.alvo.caminhoShadow, estado.alvo.caminhoFrame).catch(() => {});
    });
    tdSel.appendChild(btn);
    tr.appendChild(tdSel);

    const tdM = document.createElement("td");
    const selo = seloMatches(c);
    const span = document.createElement("span");
    span.className = "selo " + selo.cls;
    span.textContent = selo.txt;
    tdM.appendChild(span);
    tr.appendChild(tdM);

    const tdA = document.createElement("td");
    const copia = document.createElement("button");
    copia.type = "button";
    copia.className = "botao pequeno";
    copia.textContent = "Copiar";
    copia.addEventListener("click", () => copiar(c.valor, "seletor copiado"));
    tdA.appendChild(copia);
    tr.appendChild(tdA);

    corpo.appendChild(tr);
  }
}

async function analisarSelecaoDoElements() {
  if (!$("#sinc-elements").checked || estado.aba !== "inspecionar") return;
  try {
    await garantirAgente();
    // $0 só existe no contexto do eval do DevTools — por isso a expressão é
    // montada aqui, e não dentro do agente.
    const r = await avaliar("window.__proteuAgente ? window.__proteuAgente.analisar($0) : null");
    if (r) {
      estado.alvo = r;
      renderizarAlvo();
    }
  } catch (e) {
    conexao("página sem acesso", "erro");
  }
}

async function alternarMira() {
  estado.mira = !estado.mira;
  $("#btn-mira").classList.toggle("ativo", estado.mira);
  await garantirAgente();
  await chamar("escolher", estado.mira);
  if (estado.mira) avisar("clique no elemento que você quer inspecionar");
}

async function verificarEscolha() {
  if (!estado.mira) return;
  const r = await chamar("pegarEscolhido");
  if (r && r.resultado) {
    estado.alvo = r.resultado;
    estado.mira = false;
    $("#btn-mira").classList.remove("ativo");
    renderizarAlvo();
    avisar("");
  }
}

let testeTimer = null;
function aoTestarSeletor() {
  clearTimeout(testeTimer);
  testeTimer = setTimeout(async () => {
    const valor = $("#campo-teste").value.trim();
    const alvo = $("#resultado-teste");
    const amostra = $("#amostra-teste");
    if (!valor) {
      alvo.className = "selo neutro";
      alvo.textContent = "—";
      amostra.textContent = "";
      chamar("limparDestaque").catch(() => {});
      return;
    }
    try {
      await garantirAgente();
      const r = await chamar("testar", valor, $("#sintaxe-teste").value);
      const selo = seloMatches({ matches: r ? r.matches : -1 });
      alvo.className = "selo " + selo.cls;
      alvo.textContent = selo.txt;
      amostra.textContent = r && r.amostra ? r.amostra.join("   ·   ") : "";
    } catch {
      alvo.className = "selo ruim";
      alvo.textContent = "erro";
    }
  }, 220);
}

// --- Aba Gravador --------------------------------------------------------------

function renderizarAcoes() {
  const lista = $("#lista-acoes");
  const vazio = $("#acoes-vazio");
  const limpas = normalizar(estado.acoes);

  $("#contagem-acoes").textContent =
    limpas.length === 1 ? "1 ação" : `${limpas.length} ações`;
  vazio.hidden = limpas.length > 0;
  lista.textContent = "";

  limpas.forEach((acao, i) => {
    const li = document.createElement("li");

    const n = document.createElement("span");
    n.className = "n";
    n.textContent = String(i + 1);
    li.appendChild(n);

    const corpo = document.createElement("div");
    corpo.className = "corpo";

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = descrever(acao);
    corpo.appendChild(desc);

    // Trocar o seletor de um passo é o ajuste mais comum depois de gravar:
    // quem conhece a tela sabe qual atributo o time considera estável.
    if (acao.candidatos && acao.candidatos.length > 1) {
      const sel = document.createElement("select");
      sel.className = "sel-escolha";
      sel.setAttribute("aria-label", "Seletor deste passo");
      for (const c of acao.candidatos) {
        const op = document.createElement("option");
        op.value = c.chave;
        op.textContent = `${c.rotulo}: ${c.valor}` + (c.unico ? "  (único)" : "");
        if (acao.seletor && c.chave === acao.seletor.chave) op.selected = true;
        sel.appendChild(op);
      }
      sel.addEventListener("change", () => {
        const escolhido = acao.candidatos.find((c) => c.chave === sel.value);
        // As ações normalizadas são cópias; o ajuste vai no evento cru.
        const cru = estado.acoes.find((e) => e.em === acao.em && e.tipo === acao.tipo);
        if (cru && escolhido) cru.seletor = escolhido;
        atualizarCodigo();
      });
      corpo.appendChild(sel);
    }

    li.appendChild(corpo);

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "remover";
    remover.title = "Remover este passo";
    remover.textContent = "×";
    remover.addEventListener("click", () => {
      estado.acoes = estado.acoes.filter((e) => !(e.em === acao.em && e.tipo === acao.tipo));
      renderizarAcoes();
      atualizarCodigo();
    });
    li.appendChild(remover);

    lista.appendChild(li);
  });
}

/**
 * Personas para o laço do script de console.
 *
 * O script roda no navegador sem acesso ao core, então a massa vai EMBUTIDA:
 * geramos aqui e o script consome uma por volta. Repetir o mesmo cadastro com
 * o mesmo CPF esbarra na unicidade já na segunda iteração.
 */
async function personasParaOLaco(quantas) {
  const { gerarPersona } = await import("../core/persona.js");
  const { carregarConfig } = await import("../storage.js");
  const config = await carregarConfig();
  const saida = [];
  for (let i = 0; i < quantas; i++) {
    const p = gerarPersona({ ...config, contador: (config.contador || 0) + i });
    saida.push(p.porSlot);
  }
  return saida;
}

/**
 * Liga os campos preenchidos aos slots da persona, pelo nome do campo.
 *
 * Sem isso o laço repetiria o valor gravado em todas as voltas. A pista é o
 * rótulo do alvo — o mesmo caminho que o preenchimento de formulário usa.
 */
function mapearCamposParaPersona(acoes, persona) {
  if (!persona) return null;
  const slots = Object.keys(persona);
  const mapa = {};
  for (const a of acoes) {
    if (a.tipo !== "preencher" || !a.alvoId) continue;
    const pista = `${a.rotuloAlvo || ""} ${a.seletor?.valor || ""}`.toLowerCase();
    const achado = slots.find((s) => pista.includes(s.toLowerCase()));
    if (achado) mapa[a.alvoId] = achado;
  }
  return Object.keys(mapa).length ? mapa : null;
}

async function atualizarCodigo() {
  const limpas = normalizar(estado.acoes);
  const ehConsole = estado.formato === "console-js";
  $("#opcoes-console").hidden = !ehConsole;

  const opcoes = { nome: "fluxo gravado", jaNormalizado: true };

  if (ehConsole) {
    const repeticoes = Math.max(1, Number($("#console-repeticoes").value) || 1);
    opcoes.repeticoes = repeticoes;
    opcoes.pausaMs = Math.max(0, Number($("#console-pausa").value) || 0);
    opcoes.pararNoErro = $("#console-parar").checked;

    if ($("#console-massa").checked) {
      try {
        opcoes.personas = await personasParaOLaco(Math.min(repeticoes, 200));
        opcoes.mapaDeCampos = mapearCamposParaPersona(limpas, opcoes.personas[0]);
      } catch (e) {
        // Sem massa o script ainda serve: repete os valores gravados.
        avisar("não consegui gerar a massa: " + e.message);
      }
    }
  }

  $("#codigo").textContent = gerarCodigo(limpas, estado.formato, opcoes);
}

async function alternarGravacao() {
  estado.gravando = !estado.gravando;
  const btn = $("#btn-gravar");
  btn.classList.toggle("rodando", estado.gravando);
  btn.querySelector("span.ponto").after(document.createTextNode(""));
  btn.lastChild.textContent = estado.gravando ? " Gravando…" : " Gravar";
  $("#btn-parar").disabled = !estado.gravando;

  await garantirAgente();
  await chamar("gravar", estado.gravando);
  if (estado.gravando) avisar("use a página normalmente — cada gesto vira um passo");
}

async function drenar() {
  if (!estado.gravando) return;
  try {
    const novos = await chamar("drenar");
    if (Array.isArray(novos) && novos.length) {
      estado.acoes.push(...novos);
      renderizarAcoes();
      atualizarCodigo();
    }
  } catch {
    // Página trocando de contexto: a próxima volta do laço reinjeta.
    garantirAgente().catch(() => {});
  }
}

function baixarCodigo() {
  const texto = $("#codigo").textContent;
  if (!texto.trim()) return;
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo(estado.formato, "fluxo-gravado");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Abas ----------------------------------------------------------------------

// Uma entrada por aba. Era um par de toggles booleanos, que não sobreviveu à
// terceira aba: com N nomes, cada aba nova exigiria mexer em todas as linhas.
const ABAS = ["inspecionar", "gravador", "mapear"];

function trocarAba(nome) {
  estado.aba = nome;
  for (const a of ABAS) {
    const ativa = a === nome;
    $(`#aba-${a}`).classList.toggle("ativa", ativa);
    $(`#aba-${a}`).setAttribute("aria-selected", String(ativa));
    $(`#painel-${a}`).hidden = !ativa;
  }
}

// --- Início ---------------------------------------------------------------------

function montarFormatos() {
  const sel = $("#formato");
  for (const f of FORMATOS) {
    const op = document.createElement("option");
    op.value = f.id;
    op.textContent = f.rotulo;
    if (f.id === estado.formato) op.selected = true;
    sel.appendChild(op);
  }
  sel.addEventListener("change", () => {
    estado.formato = sel.value;
    atualizarCodigo();
  });
}

function ligarEventos() {
  $("#aba-inspecionar").addEventListener("click", () => trocarAba("inspecionar"));
  $("#aba-gravador").addEventListener("click", () => trocarAba("gravador"));
  $("#aba-mapear").addEventListener("click", () => trocarAba("mapear"));
  for (const id of ["#console-repeticoes", "#console-pausa", "#console-massa", "#console-parar"]) {
    $(id).addEventListener("change", () => atualizarCodigo());
  }
  // Falhar aqui não pode derrubar Inspecionar e Gravador: são recursos
  // independentes, e uma promise rejeitada e solta deixaria a aba Mapear morta
  // sem dizer por quê.
  ligarMapear().catch((e) => {
    $("#mapear-rascunho").placeholder =
      `Mapear indisponível nesta página: ${e.message}`;
    $("#btn-mapear-modo").disabled = true;
  });

  $("#btn-mira").addEventListener("click", alternarMira);
  $("#campo-teste").addEventListener("input", aoTestarSeletor);
  $("#sintaxe-teste").addEventListener("change", aoTestarSeletor);
  $("#sinc-elements").addEventListener("change", analisarSelecaoDoElements);

  $("#btn-gravar").addEventListener("click", alternarGravacao);
  $("#btn-parar").addEventListener("click", async () => {
    if (estado.gravando) await alternarGravacao();
    await drenar();
  });
  $("#btn-limpar").addEventListener("click", async () => {
    estado.acoes = [];
    renderizarAcoes();
    atualizarCodigo();
    await chamar("limpar").catch(() => {});
  });
  $("#modo-verificar").addEventListener("change", async (e) => {
    await garantirAgente();
    await chamar("verificarModo", e.target.checked);
    avisar(e.target.checked
      ? "modo verificação: clicar em algo cria uma asserção, sem acionar a página"
      : "");
  });

  $("#btn-copiar-codigo").addEventListener("click", () =>
    copiar($("#codigo").textContent, "script copiado"));
  $("#btn-baixar-codigo").addEventListener("click", baixarCodigo);

  chrome.devtools.panels.elements.onSelectionChanged.addListener(analisarSelecaoDoElements);

  // Depois de navegar, o agente morre junto com a página anterior.
  chrome.devtools.network.onNavigated.addListener(async () => {
    conexao("reconectando…");
    try {
      await injetar();
      if (estado.gravando) await chamar("gravar", true);
      if ($("#modo-verificar").checked) await chamar("verificarModo", true);
      conexao("conectado", "ok");
    } catch {
      conexao("página sem acesso", "erro");
    }
  });
}

async function iniciar() {
  montarFormatos();
  ligarEventos();
  atualizarCodigo();
  renderizarAcoes();

  try {
    await garantirAgente();
    conexao("conectado", "ok");
    await analisarSelecaoDoElements();
  } catch {
    // Páginas privilegiadas (chrome://, Web Store) não aceitam eval nenhum.
    conexao("página sem acesso", "erro");
    avisar("esta página não permite inspeção — abra um site comum e recarregue o DevTools");
  }

  // Um laço só cobre a mira e o gravador: são os dois estados que dependem do
  // que acontece na página sem que ela nos avise.
  laco = setInterval(() => {
    verificarEscolha().catch(() => {});
    drenar().catch(() => {});
  }, 400);
}

window.addEventListener("unload", () => clearInterval(laco));

iniciar();

// --- Mapear ------------------------------------------------------------------
//
// A captura acontece no content script da página; aqui é só a outra janela
// para a mesma lista. Os dois trocam estado por chrome.storage.local porque
// rodam em mundos JS diferentes — o painel é uma página de extensão e o
// content script vive na aba inspecionada.

const CHAVE_MAPEAMENTO = "mapeamento";

let mapa = { elementos: [], linguagem: null, convencao: null, rascunho: "" };

async function ligarMapear() {
  const { LINGUAGENS, CONVENCOES, CONVENCAO_PADRAO, LINGUAGEM_PADRAO, gerarRascunho,
          nomeArquivoRascunho } = await import("../core/mapeador.js");

  for (const l of LINGUAGENS) {
    const o = document.createElement("option");
    o.value = l.id;
    o.textContent = l.rotulo;
    $("#mapear-linguagem").appendChild(o);
  }
  for (const c of CONVENCOES) {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.rotulo;
    $("#mapear-convencao").appendChild(o);
  }

  const gravar = () => chrome.storage.local.set({ [CHAVE_MAPEAMENTO]: mapa });

  function refletir() {
    $("#mapear-contagem").textContent = `${mapa.elementos.length} elementos`;
    $("#mapear-linguagem").value = mapa.linguagem;
    $("#mapear-convencao").value = mapa.convencao;
    // Não sobrescreve enquanto se digita: o cursor saltaria para o fim.
    const ta = $("#mapear-rascunho");
    if (document.activeElement !== ta && ta.value !== mapa.rascunho) {
      ta.value = mapa.rascunho;
    }
  }

  const dados = await chrome.storage.local.get(CHAVE_MAPEAMENTO);
  mapa = { ...mapa, ...(dados[CHAVE_MAPEAMENTO] || {}) };
  mapa.linguagem = mapa.linguagem || LINGUAGEM_PADRAO;
  mapa.convencao = mapa.convencao || CONVENCAO_PADRAO[mapa.linguagem] || "camelCase";
  refletir();

  // Capturou na página → aparece aqui sem precisar reabrir a aba.
  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area !== "local" || !mudancas[CHAVE_MAPEAMENTO]) return;
    const novo = mudancas[CHAVE_MAPEAMENTO].newValue;
    if (!novo) return;
    mapa = { ...mapa, ...novo };
    refletir();
  });

  $("#mapear-linguagem").addEventListener("change", () => {
    mapa.linguagem = $("#mapear-linguagem").value;
    mapa.convencao = CONVENCAO_PADRAO[mapa.linguagem] || mapa.convencao;
    refletir();
    gravar();
  });

  $("#mapear-convencao").addEventListener("change", () => {
    mapa.convencao = $("#mapear-convencao").value;
    gravar();
  });

  // O texto é da QA: o que ela digita aqui vale também no painel da página.
  $("#mapear-rascunho").addEventListener("input", () => {
    mapa.rascunho = $("#mapear-rascunho").value;
    gravar();
  });

  // Destrutivo de propósito e por isso explícito: trocar a linguagem não
  // apaga o que foi editado à mão; só este botão reescreve tudo.
  $("#btn-mapear-regerar").addEventListener("click", () => {
    mapa.rascunho = gerarRascunho(mapa.elementos, mapa.linguagem, mapa.convencao);
    $("#mapear-rascunho").value = mapa.rascunho;
    gravar();
  });

  $("#btn-mapear-copiar").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("#mapear-rascunho").value).catch(() => {});
    avisar("rascunho copiado");
  });

  $("#btn-mapear-baixar").addEventListener("click", () => {
    const blob = new Blob([$("#mapear-rascunho").value], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivoRascunho(mapa.linguagem);
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#btn-mapear-limpar").addEventListener("click", () => {
    mapa.elementos = [];
    mapa.rascunho = "";
    refletir();
    $("#mapear-rascunho").value = "";
    gravar();
  });

  $("#btn-mapear-modo").addEventListener("click", async () => {
    const abaId = chrome.devtools.inspectedWindow.tabId;
    const r = await chrome.tabs
      .sendMessage(abaId, { app: "proteu", tipo: "MAPEAR_ALTERNAR" })
      .catch(() => null);
    if (!r) {
      avisar("recarregue a página para o modo mapear ficar disponível");
      return;
    }
    const btn = $("#btn-mapear-modo");
    btn.classList.toggle("rodando", r.ligado);
    btn.lastChild.textContent = r.ligado ? " Mapeando — clique na página" : " Ligar modo mapear";
  });
}
