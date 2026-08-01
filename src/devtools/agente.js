// Agente — o código que roda dentro da página inspecionada.
//
// Não é um content script: o painel injeta esta fonte via
// chrome.devtools.inspectedWindow.eval(), concatenada com src/core/seletores.js
// (os `export` são removidos na hora). Por isso `gerarCandidatos` e
// `classificar` estão disponíveis aqui sem import — e por isso o motor de
// seletores tem uma implementação só, em vez de uma cópia para cada lado.
//
// Tudo que sai daqui atravessa o eval como JSON, então nenhuma função devolve
// nó do DOM: só descrições serializáveis.

(() => {
  if (window.__proteuAgente) {
    window.__proteuAgente.reinstalar();
    return "reinstalado";
  }

  // --- Identidade de elemento -----------------------------------------------
  // O gravador precisa saber que dois eventos vieram do mesmo campo para
  // colapsar digitação. WeakMap não segura o elemento vivo na memória.
  const identidades = new WeakMap();
  let proximaId = 1;
  function idDe(el) {
    if (!identidades.has(el)) identidades.set(el, "e" + proximaId++);
    return identidades.get(el);
  }

  // A leitura do DOM (contextoDe, descreverNo, contar, acharTodos, resumir,
  // alvoDoEvento) vem de src/content/leitura-dom.js, concatenado junto com
  // este arquivo pelo painel. Ela é a mesma que o content script do menu de
  // contexto usa — manter uma segunda cópia aqui foi exatamente o que deixou
  // uma correção de fronteira de iframe chegar só num dos dois lados.

  /** Analisa um elemento: contexto + candidatos já classificados. */
  function analisar(el) {
    if (!el || el.nodeType !== 1) return null;
    const ctx = contextoDe(el);
    const candidatos = gerarCandidatos(ctx);
    const contagens = {};
    for (const c of candidatos) {
      contagens[c.chave] = contar(c.valor, c.sintaxe, ctx.caminhoShadow, ctx.caminhoFrame);
    }
    const classificados = classificar(candidatos, contagens);
    const alvo = ctx.cadeia[0];
    return {
      resumo: resumir(alvo),
      caminhoShadow: ctx.caminhoShadow,
      caminhoFrame: ctx.caminhoFrame,
      candidatos: classificados,
      alvoId: idDe(el),
    };
  }

  // --- Destaque visual --------------------------------------------------------

  let caixas = [];
  function limparDestaque() {
    for (const c of caixas) c.remove();
    caixas = [];
  }

  function destacar(elementos, cor) {
    limparDestaque();
    for (const el of elementos.slice(0, 60)) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const caixa = document.createElement("div");
      caixa.setAttribute("data-proteu-destaque", "1");
      Object.assign(caixa.style, {
        position: "fixed",
        left: r.left + "px",
        top: r.top + "px",
        width: r.width + "px",
        height: r.height + "px",
        border: `2px solid ${cor}`,
        background: cor.replace("rgb", "rgba").replace(")", ", 0.16)"),
        pointerEvents: "none",
        zIndex: "2147483647",
        borderRadius: "3px",
        boxSizing: "border-box",
      });
      document.documentElement.appendChild(caixa);
      caixas.push(caixa);
    }
    return caixas.length;
  }

  // --- Modo "escolher elemento" ------------------------------------------------

  let escolhendo = false;
  let escolhido = null;

  function aoMover(ev) {
    if (!escolhendo) return;
    const el = alvoDoEvento(ev);
    if (el && el.nodeType === 1 && !el.hasAttribute("data-proteu-destaque")) {
      destacar([el], "rgb(21, 101, 192)");
    }
  }

  function aoClicarEscolhendo(ev) {
    if (!escolhendo) return;
    ev.preventDefault();
    ev.stopPropagation();
    escolhido = alvoDoEvento(ev);
    escolhendo = false;
    limparDestaque();
    document.body.style.cursor = "";
  }

  function escolher(ligado) {
    escolhendo = !!ligado;
    escolhido = null;
    document.body.style.cursor = ligado ? "crosshair" : "";
    if (!ligado) limparDestaque();
    return escolhendo;
  }

  // --- Gravador ------------------------------------------------------------------

  let gravando = false;
  let modoVerificar = false;
  const fila = [];

  function empurrar(tipo, el, extra = {}) {
    if (!gravando) return;
    const base = {
      tipo,
      em: Date.now(),
      alvoId: el ? idDe(el) : null,
      url: location.href,
    };
    if (el) {
      const ctx = contextoDe(el);
      base.contexto = ctx;
      base.rotuloAlvo = resumir(ctx.cadeia[0]);
      base.caminhoShadow = ctx.caminhoShadow;
      base.caminhoFrame = ctx.caminhoFrame;
      // Conferimos a unicidade AGORA, com a página no estado em que a ação
      // aconteceu. Conferir depois pode pegar a tela já trocada.
      const candidatos = gerarCandidatos(ctx);
      const contagens = {};
      for (const c of candidatos) {
        contagens[c.chave] = contar(c.valor, c.sintaxe, ctx.caminhoShadow, ctx.caminhoFrame);
      }
      base.candidatos = classificar(candidatos, contagens).slice(0, 8);
      base.seletor = base.candidatos[0] || null;
    }
    fila.push({ ...base, ...extra });
    if (fila.length > 2000) fila.shift();
  }

  function ehCampoTexto(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName.toLowerCase();
    if (tag === "textarea") return true;
    if (tag !== "input") return false;
    const t = (el.type || "text").toLowerCase();
    return !["checkbox", "radio", "button", "submit", "reset", "file", "image", "range", "color"].includes(t);
  }

  function aoClicar(ev) {
    if (escolhendo) return;
    const el = alvoDoEvento(ev);
    if (!el || el.nodeType !== 1) return;
    if (modoVerificar) {
      ev.preventDefault();
      ev.stopPropagation();
      const valor = ehCampoTexto(el) ? el.value : (el.textContent || "").replace(/\s+/g, " ").trim();
      empurrar("verificar", el, { valor, modo: ehCampoTexto(el) ? "valor" : "texto" });
      destacar([el], "rgb(46, 125, 50)");
      setTimeout(limparDestaque, 400);
      return;
    }
    const tag = el.tagName.toLowerCase();
    if (tag === "input" && ["checkbox", "radio"].includes((el.type || "").toLowerCase())) {
      empurrar("marcar", el, { valor: el.checked });
      return;
    }
    empurrar("clicar", el);
  }

  function aoDigitar(ev) {
    const el = alvoDoEvento(ev);
    if (!ehCampoTexto(el)) return;
    const valor = el.isContentEditable ? el.textContent : el.value;
    empurrar("preencher", el, { valor });
  }

  function aoTrocar(ev) {
    const el = alvoDoEvento(ev);
    if (!el || el.tagName !== "SELECT") return;
    const op = el.options[el.selectedIndex];
    empurrar("selecionar", el, {
      valor: el.value,
      texto: op ? op.textContent.trim() : "",
    });
  }

  function aoTeclar(ev) {
    const el = alvoDoEvento(ev);
    if (["Enter", "Escape", "Tab"].includes(ev.key)) {
      empurrar("tecla", el, { valor: ev.key });
    }
  }

  function aoSubmeter(ev) {
    empurrar("submeter", alvoDoEvento(ev));
  }

  const ouvintes = [
    ["click", aoClicar, true],
    ["input", aoDigitar, true],
    ["change", aoTrocar, true],
    ["keydown", aoTeclar, true],
    ["submit", aoSubmeter, true],
    ["mousemove", aoMover, true],
    ["click", aoClicarEscolhendo, true],
  ];

  function instalar() {
    for (const [nome, fn, captura] of ouvintes) {
      document.addEventListener(nome, fn, captura);
    }
  }
  instalar();

  // --- API exposta ao painel --------------------------------------------------

  window.__proteuAgente = {
    versao: () => 1,

    reinstalar() {
      for (const [nome, fn, captura] of ouvintes) {
        document.removeEventListener(nome, fn, captura);
      }
      instalar();
      return true;
    },

    analisar,

    /** Analisa o elemento escolhido pelo modo mira, se já houve clique. */
    pegarEscolhido() {
      if (!escolhido) return { pendente: escolhendo };
      const r = analisar(escolhido);
      escolhido = null;
      return { pendente: false, resultado: r };
    },

    escolher,

    contar,

    /** Testa um seletor digitado à mão na aba Inspecionar. */
    testar(valor, sintaxe) {
      const n = contar(valor, sintaxe);
      const achados = n > 0 ? acharTodos(valor, sintaxe) : [];
      destacar(achados, "rgb(21, 101, 192)");
      return {
        matches: n,
        amostra: achados.slice(0, 5).map((el) => resumir(descreverNo(el))),
      };
    },

    destacarSeletor(valor, sintaxe, caminhoShadow, caminhoFrame) {
      const achados = acharTodos(valor, sintaxe, caminhoShadow, caminhoFrame);
      return destacar(achados, achados.length === 1 ? "rgb(46, 125, 50)" : "rgb(230, 145, 0)");
    },

    limparDestaque,

    gravar(ligado) {
      gravando = !!ligado;
      if (gravando && !fila.length) {
        fila.push({ tipo: "navegar", valor: location.href, em: Date.now() });
      }
      return gravando;
    },

    verificarModo(ligado) {
      modoVerificar = !!ligado;
      return modoVerificar;
    },

    estado: () => ({ gravando, modoVerificar, naFila: fila.length, escolhendo }),

    /** Esvazia a fila e devolve o que havia. */
    drenar() {
      const saida = fila.splice(0, fila.length);
      return saida;
    },

    limpar() {
      fila.length = 0;
      return true;
    },
  };

  // Navegação em SPA não recarrega a página, então o gravador precisa notar a
  // troca de rota por conta própria — senão o roteiro fica sem o passo.
  let ultimaUrl = location.href;
  const observarUrl = () => {
    if (location.href !== ultimaUrl) {
      ultimaUrl = location.href;
      if (gravando) fila.push({ tipo: "navegar", valor: location.href, em: Date.now() });
    }
  };
  setInterval(observarUrl, 250);

  return "instalado";
})();
