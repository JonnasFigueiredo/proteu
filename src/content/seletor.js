// Content script do menu de contexto — "copiar seletor deste elemento".
//
// Precisa estar ouvindo ANTES do clique com o botão direito: o Chrome não
// informa em qual elemento o menu foi aberto, então quem sabe disso é este
// listener. Por isso o recurso depende da permissão opcional de host, pedida
// no popup — com activeTab o acesso só chegaria depois do clique, tarde demais.
//
// Registrado por chrome.scripting.registerContentScripts quando a permissão
// existe, e desregistrado quando ela é revogada.

(() => {
  if (window.__proteuSeletor) return;

  /** Último elemento em que o menu de contexto foi aberto. */
  let ultimoAlvo = null;

  // Carregado sob demanda: o import só acontece quando a QA usa o menu, e não
  // em toda página que ela abre.
  let motorPromessa = null;
  function carregarMotor() {
    if (!motorPromessa) {
      motorPromessa = Promise.all([
        import(chrome.runtime.getURL("src/core/seletores.js")),
        import(chrome.runtime.getURL("src/content/leitura-dom.js")),
      ]).then(([seletores, dom]) => ({ ...seletores, ...dom }));
    }
    return motorPromessa;
  }

  // Capturante e composto: pega o elemento real mesmo dentro de Shadow DOM
  // aberto, onde event.target vem retargetado para o host.
  document.addEventListener(
    "contextmenu",
    (ev) => {
      const caminho = ev.composedPath ? ev.composedPath() : [];
      const el = caminho.length ? caminho[0] : ev.target;
      if (el && el.nodeType === 1) ultimoAlvo = el;
    },
    true
  );

  /** Copia texto sem depender de gesto do usuário na página. */
  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Sem foco na página a Clipboard API recusa; o textarea ainda funciona.
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.setAttribute("aria-hidden", "true");
      Object.assign(ta.style, { position: "fixed", top: "-1000px", opacity: "0" });
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  }

  /** Avisa na tela o que foi copiado — sem isso o clique não dá retorno nenhum. */
  function avisar(texto, erro = false) {
    const balao = document.createElement("div");
    balao.textContent = texto;
    Object.assign(balao.style, {
      position: "fixed",
      zIndex: "2147483647",
      left: "50%",
      bottom: "24px",
      transform: "translateX(-50%)",
      maxWidth: "min(560px, 90vw)",
      padding: "9px 14px",
      borderRadius: "8px",
      font: "500 13px/1.4 'Segoe UI', system-ui, sans-serif",
      color: "#fff",
      background: erro ? "#c62828" : "#1565c0",
      boxShadow: "0 4px 16px rgba(0,0,0,.3)",
      pointerEvents: "none",
      wordBreak: "break-all",
    });
    document.documentElement.appendChild(balao);
    setTimeout(() => balao.remove(), 2600);
  }

  /**
   * Todos os candidatos do último alvo, já classificados pela contagem real.
   * A contagem acontece agora, com a página no estado em que a QA a vê.
   */
  async function candidatosDoAlvo() {
    if (!ultimoAlvo || !ultimoAlvo.isConnected) return null;
    const m = await carregarMotor();
    const ctx = m.contextoDe(ultimoAlvo);
    const candidatos = m.gerarCandidatos(ctx);
    const contagens = m.contarCandidatos(candidatos, ctx.caminhoShadow, ctx.caminhoFrame);
    return {
      resumo: m.resumir(ctx.cadeia[0]),
      caminhoShadow: ctx.caminhoShadow,
      caminhoFrame: ctx.caminhoFrame,
      candidatos: m.classificar(candidatos, contagens),
    };
  }

  /** Escolhe o candidato que atende a estratégia pedida no menu. */
  function escolher(candidatos, estrategia) {
    const preferir = (fn) => candidatos.find((c) => fn(c) && c.unico) || candidatos.find(fn);
    switch (estrategia) {
      case "melhor":
        return candidatos.find((c) => c.unico) || candidatos[0];
      case "css":
        return preferir((c) => c.sintaxe === "css");
      case "xpath":
        return preferir((c) => c.sintaxe === "xpath" && c.tipo !== "xpath-absoluto");
      case "xpath-absoluto":
        return candidatos.find((c) => c.tipo === "xpath-absoluto");
      case "id":
        return candidatos.find((c) => c.tipo === "id" && c.sintaxe === "css");
      case "texto":
        return preferir((c) => c.tipo === "texto" || c.tipo === "link");
      default:
        return null;
    }
  }

  chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
    if (!msg || msg.app !== "proteu" || msg.tipo !== "COPIAR_SELETOR") return false;

    (async () => {
      const dados = await candidatosDoAlvo();
      if (!dados) {
        responder({ ok: false, erro: "sem-alvo" });
        return;
      }

      const escolhido = escolher(dados.candidatos, msg.estrategia);
      if (!escolhido) {
        avisar(msg.rotuloVazio || "este elemento não tem esse tipo de seletor", true);
        responder({ ok: false, erro: "sem-candidato" });
        return;
      }

      const ok = await copiar(escolhido.valor);
      if (!ok) {
        avisar("não foi possível copiar", true);
      } else if (escolhido.unico) {
        avisar(escolhido.valor);
      } else {
        // Copiar um seletor ambíguo sem avisar é entregar um teste que passa
        // hoje e falha quando a tela ganhar mais um item igual.
        const n = escolhido.matches;
        avisar(`${escolhido.valor}  —  atenção: casa com ${n < 0 ? "?" : n} elementos`, true);
      }
      responder({ ok, seletor: escolhido.valor, unico: escolhido.unico });
    })();

    return true; // resposta assíncrona
  });

  window.__proteuSeletor = true;
})();
