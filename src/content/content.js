// Content script — detecção do campo ativo e inserção robusta.
//
// Injetado sob demanda via chrome.scripting (com allFrames: true), aproveitando
// o grant de activeTab. NÃO gera dados: só rastreia o campo focado, insere o
// valor recebido por mensagem e reporta o descritor do campo.
//
// Robustez visada (onde as concorrentes falham):
//   - Campos controlados por React/Vue/Angular → setter nativo do prototype +
//     disparo de InputEvent/change com bubbles.
//   - Shadow DOM aberto → foco lido via composedPath().
//   - Iframes de mesma origem → injeção em todos os frames; o frame que tem o
//     campo focado é quem insere.
//   - Campos que surgem depois do load → rastreio por focusin (capturante) e
//     MutationObserver como rede de segurança.

(() => {
  // Evita reexecução se o script for injetado mais de uma vez no mesmo frame.
  if (window.__proteuInjetado) return;
  window.__proteuInjetado = true;

  /** Último elemento editável que recebeu foco/clique neste frame. */
  let alvoAtual = null;

  function ehEditavel(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLInputElement) {
      // Exclui tipos que não recebem texto (botões, checkbox, etc.).
      const naoTexto = new Set([
        "button", "submit", "reset", "checkbox", "radio",
        "range", "color", "file", "image", "hidden",
      ]);
      return !naoTexto.has((el.type || "text").toLowerCase());
    }
    return false;
  }

  // composedPath()[0] devolve o elemento real mesmo dentro de Shadow DOM aberto,
  // enquanto event.target vem "retargetado" para o host.
  function elementoReal(event) {
    const caminho = event.composedPath ? event.composedPath() : [];
    return caminho.length ? caminho[0] : event.target;
  }

  function registrarFoco(event) {
    const el = elementoReal(event);
    if (ehEditavel(el)) alvoAtual = el;
  }

  // focusin e click, ambos capturantes e compostos, cobrem Shadow DOM e
  // campos adicionados dinamicamente sem precisar reatachar listeners.
  document.addEventListener("focusin", registrarFoco, true);
  document.addEventListener("click", registrarFoco, true);

  // Rede de segurança: se o alvo sai do DOM (form multi-etapa), esquece.
  const observer = new MutationObserver(() => {
    if (alvoAtual && !alvoAtual.isConnected) alvoAtual = null;
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  /** Devolve o setter nativo de `value` para o tipo do elemento. */
  function setterNativo(el) {
    let proto = null;
    if (el instanceof HTMLTextAreaElement) proto = HTMLTextAreaElement.prototype;
    else if (el instanceof HTMLInputElement) proto = HTMLInputElement.prototype;
    if (!proto) return null;
    return Object.getOwnPropertyDescriptor(proto, "value").set;
  }

  function dispararEventos(el, inputType, dado) {
    // InputEvent + change com bubbles: é o que faz React/Vue registrarem a mudança.
    el.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType, data: dado })
    );
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** Modo "valor": substitui todo o conteúdo via setter nativo. */
  function injetarValor(el, valor) {
    if (el.isContentEditable) {
      el.textContent = valor;
      dispararEventos(el, "insertText", valor);
      return true;
    }
    const setter = setterNativo(el);
    if (!setter) return false;
    setter.call(el, valor);
    dispararEventos(el, "insertText", valor);
    return true;
  }

  /** Modo "colar": insere na seleção/cursor, preservando o resto do texto. */
  function simularColagem(el, valor) {
    el.focus();
    if (el.isContentEditable) {
      // execCommand respeita a seleção corrente em contenteditable.
      const ok = document.execCommand("insertText", false, valor);
      if (!ok) {
        el.textContent = (el.textContent || "") + valor;
      }
      dispararEventos(el, "insertFromPaste", valor);
      return true;
    }
    const setter = setterNativo(el);
    if (!setter) return false;
    const inicio = el.selectionStart ?? el.value.length;
    const fim = el.selectionEnd ?? el.value.length;
    const antes = el.value.slice(0, inicio);
    const depois = el.value.slice(fim);
    setter.call(el, antes + valor + depois);
    const pos = inicio + valor.length;
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      // Alguns tipos (email, number) não suportam setSelectionRange; ignora.
    }
    dispararEventos(el, "insertFromPaste", valor);
    return true;
  }

  /** Extrai o descritor do campo (base para geração de fronteira). */
  function descritor(el) {
    if (!el) return null;
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    const attr = (n) => (el.getAttribute ? el.getAttribute(n) : null);
    return {
      tag,
      type: el.type ? el.type.toLowerCase() : null,
      maxlength: attr("maxlength"),
      minlength: attr("minlength"),
      min: attr("min"),
      max: attr("max"),
      pattern: attr("pattern"),
      required: el.required === true || attr("required") !== null,
      inputmode: attr("inputmode"),
      name: attr("name"),
      placeholder: attr("placeholder"),
      contenteditable: el.isContentEditable === true,
    };
  }

  // --- Preenchimento do formulário inteiro ----------------------------------
  //
  // O content script NÃO decide nada: ele coleta os descritores, o popup usa
  // core/mapeamento.js (puro e testável) para escolher os valores, e devolve um
  // plano por índice. Guardamos a lista coletada para casar os índices depois.
  let camposColetados = [];

  /** Texto do <label> associado ao campo (for=, wrapper, ou aria-labelledby). */
  function labelDoCampo(el) {
    try {
      if (el.labels && el.labels.length) return el.labels[0].textContent.trim();
      const porAria = el.getAttribute("aria-labelledby");
      if (porAria) {
        const alvo = document.getElementById(porAria);
        if (alvo) return alvo.textContent.trim();
      }
      const pai = el.closest("label");
      if (pai) return pai.textContent.trim();
    } catch {
      // Campo fora do documento ou seletor inválido: sem label, sem drama.
    }
    return null;
  }

  /** Campo visível de verdade (não basta não ser hidden). */
  function ehVisivel(el) {
    if (!el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = window.getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  }

  /** Coleta os campos preenchíveis do frame, com descritor + índice. */
  function coletarCampos() {
    const nodes = document.querySelectorAll("input, textarea, [contenteditable=true]");
    camposColetados = [];
    const descritores = [];
    for (const el of nodes) {
      if (!ehEditavel(el) || !ehVisivel(el)) continue;
      const indice = camposColetados.length;
      camposColetados.push(el);
      descritores.push({
        ...descritor(el),
        indice,
        id: el.id || null,
        autocomplete: el.getAttribute("autocomplete"),
        ariaLabel: el.getAttribute("aria-label"),
        title: el.getAttribute("title"),
        label: labelDoCampo(el),
        readonly: el.readOnly === true,
        disabled: el.disabled === true,
      });
    }
    return descritores;
  }

  /** Aplica o plano [{indice, valor}] nos campos coletados. */
  function preencherLote(plano) {
    let preenchidos = 0;
    for (const item of plano || []) {
      const el = camposColetados[item.indice];
      if (!el || !el.isConnected) continue;
      if (injetarValor(el, item.valor)) preenchidos++;
    }
    return preenchidos;
  }

  // Roteia mensagens vindas do popup/service worker.
  chrome.runtime.onMessage.addListener((msg, _sender, responder) => {
    if (!msg || msg.app !== "proteu") return false;

    switch (msg.tipo) {
      case "PING":
        responder({ ok: true, temAlvo: !!alvoAtual });
        return false;

      case "DETECTAR":
        responder({ ok: true, descritor: descritor(alvoAtual) });
        return false;

      case "COLETAR_CAMPOS":
        responder({ ok: true, campos: coletarCampos() });
        return false;

      case "PREENCHER_LOTE": {
        const n = preencherLote(msg.plano);
        responder({ ok: n > 0, preenchidos: n });
        return false;
      }

      case "INSERIR": {
        if (!alvoAtual || !alvoAtual.isConnected) {
          responder({ ok: false, erro: "sem-campo" });
          return false;
        }
        const modo = msg.modo === "colar" ? "colar" : "valor";
        const inserido =
          modo === "colar"
            ? simularColagem(alvoAtual, msg.valor)
            : injetarValor(alvoAtual, msg.valor);
        responder({ ok: inserido, erro: inserido ? null : "tipo-nao-suportado" });
        return false;
      }

      default:
        return false;
    }
  });
})();
