// Modo Mapear — clicar nos elementos da página e levar embora as variáveis.
//
// O gravador responde "como reproduzo este fluxo?". Aqui a pergunta é anterior:
// "quais elementos desta tela eu vou automatizar, e como vou chamá-los?". A QA
// liga o modo, clica nos campos que interessam e o bloco de notas ao lado vai
// crescendo — pronto para colar na IDE.
//
// O painel vive num shadow root fechado: a página não o alcança pelo CSS nem
// pelos seletores dela, e ele não aparece no que a própria QA está mapeando.
//
// Estado compartilhado com o painel do DevTools via chrome.storage.local. Os
// dois rodam em mundos JS diferentes (isolated world vs. página), então
// storage é o único ponto de encontro possível sem passar pelo background.

(() => {
  if (window.__proteuMapeador) return;

  const CHAVE = "mapeamento";
  const ID_PAINEL = "proteu-mapeador-raiz";

  let ligado = false;
  let painel = null; // { host, raiz, elementos... }
  let motorPromessa = null;

  // Espelho local do que está no storage. O storage continua sendo a verdade;
  // isto evita reler a cada clique. Os padrões saem do core (não escritos aqui
  // à mão) para que trocar o padrão lá valha nas duas telas de uma vez.
  let estado = {
    elementos: [],
    linguagem: null, // preenchido com LINGUAGEM_PADRAO quando o motor carrega
    convencao: null,
    rascunho: "",
    // Tamanho que a QA escolheu arrastando o canto. Guardado junto do resto
    // para o painel reabrir do jeito que ela deixou, em vez de voltar ao
    // padrão a cada vez que liga o modo.
    painel: null, // { largura, altura }
  };

  /** Garante que estado.linguagem/convencao existem, usando o padrão do core. */
  async function garantirPadroes() {
    const m = await carregarMotor();
    if (!estado.linguagem) estado.linguagem = m.LINGUAGEM_PADRAO;
    if (!estado.convencao) {
      estado.convencao = m.CONVENCAO_PADRAO[estado.linguagem] || "camelCase";
    }
    return m;
  }

  function carregarMotor() {
    if (!motorPromessa) {
      motorPromessa = Promise.all([
        import(chrome.runtime.getURL("src/core/seletores.js")),
        import(chrome.runtime.getURL("src/content/leitura-dom.js")),
        import(chrome.runtime.getURL("src/core/mapeador.js")),
      ]).then(([sel, dom, map]) => ({ ...sel, ...dom, ...map }));
    }
    return motorPromessa;
  }

  // --- Estado compartilhado ---------------------------------------------------

  async function lerEstado() {
    try {
      const d = await chrome.storage.local.get(CHAVE);
      if (d && d[CHAVE]) estado = { ...estado, ...d[CHAVE] };
    } catch {
      // Sem storage (contexto invalidado): segue com o espelho em memória.
    }
    return estado;
  }

  async function gravarEstado() {
    try {
      await chrome.storage.local.set({ [CHAVE]: estado });
    } catch {
      // A extensão foi recarregada com a página aberta. O painel continua
      // funcionando; só não espelha mais no DevTools.
    }
  }

  // --- Captura ----------------------------------------------------------------

  /** O elemento faz parte do próprio painel? Então não é alvo de captura. */
  function ehDoPainel(el) {
    if (!painel || !el) return false;
    return el === painel.host || painel.host.contains(el);
  }

  /**
   * Analisa o elemento e devolve o registro que vira uma linha do rascunho.
   *
   * A contagem acontece agora, com a página no estado em que a QA a vê: um
   * localizador ambíguo precisa ser marcado enquanto ela ainda pode conferir.
   */
  async function analisar(el) {
    const m = await carregarMotor();
    const ctx = m.contextoDe(el);
    const candidatos = m.gerarCandidatos(ctx);
    const contagens = m.contarCandidatos(candidatos, ctx.caminhoShadow, ctx.caminhoFrame);
    const classificados = m.classificar(candidatos, contagens);
    if (!classificados.length) return null;

    // Guarda os candidatos, não só o vencedor: cada linguagem tem a sua ordem
    // de preferência (Selenium usa By.id nativo; Cypress não roda XPath), e
    // sem a lista o "Regerar" não teria como reescolher ao trocar de alvo.
    const candidatosGuardados = classificados.slice(0, 8).map((c) => ({
      tipo: c.tipo, sintaxe: c.sintaxe, valor: c.valor,
      pontos: c.pontosFinais,
      matches: typeof c.matches === "number" ? c.matches : null,
      unico: !!c.unico,
    }));
    const melhor = classificados.find((c) => c.unico) || classificados[0];

    return {
      no: ctx.cadeia[0],
      candidatos: candidatosGuardados,
      // Mantido para o rascunho já capturado antes desta versão continuar lendo.
      seletor: { tipo: melhor.tipo, valor: melhor.valor, sintaxe: melhor.sintaxe },
      matches: typeof melhor.matches === "number" ? melhor.matches : 1,
      resumo: m.resumir(ctx.cadeia[0]),
      em: Date.now(),
    };
  }

  async function capturar(el) {
    await garantirPadroes(); // captura em iframe pode acontecer sem painel
    const registro = await analisar(el);
    if (!registro) {
      piscar(el, "#c62828");
      return;
    }
    estado.elementos.push(registro);

    // Acrescenta ao rascunho em vez de reescrever: o texto é da QA, e ela pode
    // já ter editado o que está lá em cima. Reescrever tudo a cada clique
    // apagaria o trabalho dela sem aviso.
    const m = await carregarMotor();
    const linha = m.gerarRascunho([registro], estado.linguagem, estado.convencao);
    // Renomeia se o nome já existir no rascunho — a numeração precisa olhar o
    // texto real, que é o que a QA vai colar, e não só a lista interna.
    estado.rascunho = juntarLinha(estado.rascunho, linha);

    await gravarEstado();
    renderizar();
    piscar(el, "#2e7d32");
  }

  /**
   * Junta a linha nova ao rascunho, numerando se o nome colidir.
   *
   * A desambiguação do core olha a lista inteira de uma vez; aqui as linhas
   * chegam uma a uma e o texto pode ter sido editado à mão. Conferir contra o
   * que está escrito evita entregar duas variáveis com o mesmo nome — que na
   * IDE é erro de compilação, não um detalhe estético.
   */
  function juntarLinha(rascunho, linha) {
    const nome = nomeDaLinha(linha);
    if (!nome) return rascunho ? `${rascunho}\n${linha}` : linha;

    const existentes = new Set(
      rascunho.split("\n").map(nomeDaLinha).filter(Boolean)
    );
    let final = linha;
    if (existentes.has(nome)) {
      let i = 2;
      while (existentes.has(sufixar(nome, i))) i++;
      final = linha.replace(nome, sufixar(nome, i));
    }
    return rascunho ? `${rascunho}\n${final}` : final;
  }

  function sufixar(nome, i) {
    if (nome.includes("_")) return `${nome}_${i}`;
    if (nome.includes("-")) return `${nome}-${i}`;
    return `${nome}${i}`;
  }

  /** Extrai o identificador declarado numa linha, seja qual for a linguagem. */
  function nomeDaLinha(linha) {
    const t = String(linha || "").trim();
    if (!t) return null;
    const padroes = [
      /^\$\{([^}]+)\}/,                       // Robot Framework
      /^(?:private\s+(?:final|readonly)\s+By\s+)([A-Za-z_$][\w$]*)/, // Java / C#
      /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/, // JS / TS
      /^([A-Za-z_$][\w$]*)\s*(?::\s*\w+)?\s*=/,  // Python / texto
    ];
    for (const p of padroes) {
      const m = t.match(p);
      if (m) return m[1];
    }
    return null;
  }

  // --- Realce -----------------------------------------------------------------

  let caixaRealce = null;
  function realcar(el) {
    if (!caixaRealce) {
      caixaRealce = document.createElement("div");
      Object.assign(caixaRealce.style, {
        position: "fixed", pointerEvents: "none", zIndex: "2147483646",
        border: "2px solid #1565c0", background: "rgba(21,101,192,.12)",
        borderRadius: "2px", transition: "all .05s linear",
      });
      document.documentElement.appendChild(caixaRealce);
    }
    const r = el.getBoundingClientRect();
    Object.assign(caixaRealce.style, {
      display: "block",
      top: `${r.top}px`, left: `${r.left}px`,
      width: `${r.width}px`, height: `${r.height}px`,
    });
  }

  function limparRealce() {
    if (caixaRealce) caixaRealce.style.display = "none";
  }

  /** Confirmação visual do clique: verde capturou, vermelho não deu. */
  function piscar(el, cor) {
    const r = el.getBoundingClientRect();
    const flash = document.createElement("div");
    Object.assign(flash.style, {
      position: "fixed", pointerEvents: "none", zIndex: "2147483646",
      top: `${r.top}px`, left: `${r.left}px`,
      width: `${r.width}px`, height: `${r.height}px`,
      background: cor, opacity: "0.35",
      transition: "opacity .4s ease-out",
    });
    document.documentElement.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = "0"; });
    setTimeout(() => flash.remove(), 450);
  }

  // --- Eventos da página ------------------------------------------------------

  function aoMover(ev) {
    if (!ligado) return;
    const el = alvoReal(ev);
    if (!el || ehDoPainel(el)) return limparRealce();
    realcar(el);
  }

  function aoClicar(ev) {
    if (!ligado) return;
    const el = alvoReal(ev);
    if (!el || ehDoPainel(el)) return; // cliques no painel são do painel
    // A página não pode reagir: mapear um botão de "excluir" não deveria
    // excluir nada, e seguir um link tiraria a QA da tela que ela mapeia.
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    capturar(el);
  }

  /** Pega o elemento real mesmo dentro de shadow root aberto. */
  function alvoReal(ev) {
    const caminho = ev.composedPath ? ev.composedPath() : [];
    const el = caminho.length ? caminho[0] : ev.target;
    return el && el.nodeType === 1 ? el : null;
  }

  function aoTeclar(ev) {
    if (ligado && ev.key === "Escape") {
      ev.preventDefault();
      desligar();
    }
  }

  const ouvintes = [
    ["mousemove", aoMover, true],
    ["click", aoClicar, true],
    ["mousedown", bloquear, true],
    ["mouseup", bloquear, true],
    ["keydown", aoTeclar, true],
  ];

  /** Segura mousedown/mouseup para a página não iniciar arrasto nem foco. */
  function bloquear(ev) {
    if (!ligado) return;
    const el = alvoReal(ev);
    if (!el || ehDoPainel(el)) return;
    ev.preventDefault();
    ev.stopPropagation();
  }

  function instalarOuvintes() {
    for (const [nome, fn, captura] of ouvintes) {
      document.addEventListener(nome, fn, captura);
    }
  }

  function removerOuvintes() {
    for (const [nome, fn, captura] of ouvintes) {
      document.removeEventListener(nome, fn, captura);
    }
  }

  // --- Painel -----------------------------------------------------------------

  const CSS_PAINEL = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: "Segoe UI", system-ui, sans-serif; }
    /* Redimensionável pelas OITO pontas. O "resize" do CSS só entrega o canto
       inferior direito, e quem encosta o painel num canto da tela precisa puxar
       justamente pelo lado oposto. Daí as alças próprias, abaixo. */
    .caixa {
      position: fixed; top: 16px; right: 16px;
      width: 460px; height: 520px;
      min-width: 320px; min-height: 240px;
      max-width: calc(100vw - 32px); max-height: calc(100vh - 32px);
      overflow: hidden;
      display: flex; flex-direction: column;
      background: #1b1f24; color: #e6e6e6; border: 1px solid #333a42;
      border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,.45);
      z-index: 2147483647; font-size: 13px;
    }
    .cab {
      display: flex; align-items: center; gap: 8px; padding: 9px 10px;
      border-bottom: 1px solid #333a42; cursor: move; user-select: none;
    }
    .titulo { font-weight: 600; font-size: 13px; }
    .contagem {
      font-size: 11px; color: #9aa4af; background: #262c33;
      padding: 2px 7px; border-radius: 100px;
    }
    .crescer { flex: 1; }
    .icone {
      background: none; border: 0; color: #9aa4af; cursor: pointer;
      font-size: 16px; line-height: 1; padding: 2px 6px; border-radius: 5px;
    }
    .icone:hover { background: #2b323a; color: #e6e6e6; }
    /* flex:1 + min-height:0 é o que faz o corpo (e o textarea dentro dele)
       crescer junto quando a QA arrasta o canto, em vez de estourar a caixa. */
    .corpo {
      flex: 1 1 auto; min-height: 0;
      padding: 9px 10px; display: flex; flex-direction: column; gap: 8px;
    }
    .linha { display: flex; gap: 6px; }
    select {
      flex: 1; min-width: 0; padding: 5px 6px; font-size: 12px;
      background: #262c33; color: #e6e6e6; border: 1px solid #3a424b;
      border-radius: 6px;
    }
    textarea {
      /* Ocupa o que sobrar: quem manda no tamanho é a caixa. O "resize" próprio
         sai de cena para não brigar com o do quadro. */
      width: 100%; flex: 1 1 auto; min-height: 120px; resize: none; padding: 8px;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      font-size: 12px; line-height: 1.5; color: #e6e6e6;
      background: #12161a; border: 1px solid #3a424b; border-radius: 6px;
      white-space: pre; overflow: auto;
    }
    textarea:focus { outline: 2px solid #1565c0; outline-offset: -1px; }
    .acoes { display: flex; gap: 6px; }
    button.botao {
      flex: 1; padding: 6px 8px; font-size: 12px; cursor: pointer;
      background: #262c33; color: #e6e6e6; border: 1px solid #3a424b;
      border-radius: 6px;
    }
    button.botao:hover { background: #2f363f; }
    button.botao.primario { background: #1565c0; border-color: #1565c0; color: #fff; }
    button.botao.primario:hover { background: #1a6fd0; }
    .dica { font-size: 11px; color: #7f8a95; line-height: 1.4; }
    /* Alças de redimensionamento: 4 cantos e 4 lados. Ficam por FORA do fluxo
       (position: absolute) e por cima de tudo, mas só nas bordas — o miolo
       continua livre para selecionar texto. */
    .alca { position: absolute; z-index: 3; }
    .alca.n  { top: -3px; left: 10px; right: 10px; height: 7px; cursor: ns-resize; }
    .alca.s  { bottom: -3px; left: 10px; right: 10px; height: 7px; cursor: ns-resize; }
    .alca.e  { right: -3px; top: 10px; bottom: 10px; width: 7px; cursor: ew-resize; }
    .alca.w  { left: -3px; top: 10px; bottom: 10px; width: 7px; cursor: ew-resize; }
    .alca.ne { top: -3px; right: -3px; width: 14px; height: 14px; cursor: nesw-resize; }
    .alca.nw { top: -3px; left: -3px; width: 14px; height: 14px; cursor: nwse-resize; }
    .alca.se { bottom: -3px; right: -3px; width: 14px; height: 14px; cursor: nwse-resize; }
    .alca.sw { bottom: -3px; left: -3px; width: 14px; height: 14px; cursor: nesw-resize; }

    /* Marca visual só no canto inferior direito, que é onde as pessoas
       procuram primeiro. As outras sete são invisíveis mas pegáveis. */
    .alca.se::after {
      content: ""; position: absolute; right: 3px; bottom: 3px;
      width: 7px; height: 7px;
      border-right: 2px solid #5a636d; border-bottom: 2px solid #5a636d;
    }

    /* Enquanto arrasta, nada dentro rouba o ponteiro. */
    .redimensionando, .redimensionando * { user-select: none; }

    /* Recolhido vira só a barra: sem isto a altura fixa deixaria um retângulo
       vazio ocupando meia tela. O tamanho volta ao expandir, porque fica
       guardado em estado.painel. */
    .recolhido {
      height: auto !important; min-height: 0; resize: none;
    }
    .recolhido .corpo { display: none; }
  `;

  function criarPainel() {
    const host = document.createElement("div");
    host.id = ID_PAINEL;
    // Fechado: nem a página nem o que a QA está mapeando enxergam dentro.
    const raiz = host.attachShadow({ mode: "closed" });

    const estilo = document.createElement("style");
    estilo.textContent = CSS_PAINEL;

    const caixa = document.createElement("div");
    caixa.className = "caixa";
    caixa.innerHTML = `
      <div class="cab" data-arrastar>
        <span class="titulo">Proteu QA · Mapear</span>
        <span class="contagem" data-contagem>0</span>
        <span class="crescer"></span>
        <button class="icone" data-fixar title="Fixar na lateral do navegador">⇥</button>
        <button class="icone" data-recolher title="Recolher">–</button>
        <button class="icone" data-fechar title="Sair do modo mapear (Esc)">×</button>
      </div>
      <div class="corpo">
        <div class="linha">
          <select data-linguagem aria-label="Linguagem"></select>
          <select data-convencao aria-label="Padrão do nome"></select>
        </div>
        <textarea data-rascunho spellcheck="false"
          placeholder="Clique nos elementos da página. As variáveis aparecem aqui — e você pode editar à vontade."></textarea>
        <div class="acoes">
          <button class="botao primario" data-copiar>Copiar</button>
          <button class="botao" data-regerar title="Reescreve tudo na linguagem atual, descartando edições">Regerar</button>
          <button class="botao" data-limpar>Limpar</button>
        </div>
        <div class="dica">Esc sai do modo. O texto é seu: edite antes de levar para a IDE.</div>
      </div>
      <div class="alca n"  data-alca="n"></div>
      <div class="alca s"  data-alca="s"></div>
      <div class="alca e"  data-alca="e"></div>
      <div class="alca w"  data-alca="w"></div>
      <div class="alca ne" data-alca="ne"></div>
      <div class="alca nw" data-alca="nw"></div>
      <div class="alca se" data-alca="se"></div>
      <div class="alca sw" data-alca="sw"></div>
    `;
    raiz.append(estilo, caixa);
    document.documentElement.appendChild(host);

    painel = {
      host, raiz, caixa,
      contagem: caixa.querySelector("[data-contagem]"),
      linguagem: caixa.querySelector("[data-linguagem]"),
      convencao: caixa.querySelector("[data-convencao]"),
      rascunho: caixa.querySelector("[data-rascunho]"),
      pronto: false, // as listas de opção ainda não existem
    };

    return ligarPainel(caixa).then(() => painel);
  }

  async function ligarPainel(caixa) {
    const m = await garantirPadroes();

    for (const l of m.LINGUAGENS) {
      const o = document.createElement("option");
      o.value = l.id;
      o.textContent = l.rotulo;
      painel.linguagem.appendChild(o);
    }
    for (const c of m.CONVENCOES) {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.rotulo;
      painel.convencao.appendChild(o);
    }
    painel.linguagem.value = estado.linguagem;
    painel.convencao.value = estado.convencao;
    // Só a partir daqui os <select> têm opções e valem como fonte de verdade.
    // Antes disso, escrever neles é no-op e LER deles devolveria a primeira
    // opção da lista — foi assim que a linguagem escolhida virou "Java" sozinha.
    painel.pronto = true;

    painel.linguagem.addEventListener("change", async () => {
      estado.linguagem = painel.linguagem.value;
      // A convenção acompanha a linguagem, senão Python abriria em camelCase.
      estado.convencao = m.CONVENCAO_PADRAO[estado.linguagem] || estado.convencao;
      painel.convencao.value = estado.convencao;
      await gravarEstado();
    });

    painel.convencao.addEventListener("change", async () => {
      estado.convencao = painel.convencao.value;
      await gravarEstado();
    });

    // O texto é da QA: o que ela digita é o que vale, inclusive para o DevTools.
    painel.rascunho.addEventListener("input", () => {
      estado.rascunho = painel.rascunho.value;
      gravarEstado();
    });

    caixa.querySelector("[data-copiar]").addEventListener("click", async () => {
      const btn = caixa.querySelector("[data-copiar]");
      const ok = await copiar(painel.rascunho.value);
      btn.textContent = ok ? "Copiado" : "Falhou";
      setTimeout(() => { btn.textContent = "Copiar"; }, 1200);
    });

    // Regerar é destrutivo e por isso é botão, não efeito colateral de trocar a
    // linguagem: quem editou o rascunho não pode perdê-lo sem ter pedido.
    caixa.querySelector("[data-regerar]").addEventListener("click", async () => {
      estado.rascunho = m.gerarRascunho(estado.elementos, estado.linguagem, estado.convencao);
      await gravarEstado();
      renderizar();
    });

    caixa.querySelector("[data-limpar]").addEventListener("click", async () => {
      estado.elementos = [];
      estado.rascunho = "";
      await gravarEstado();
      renderizar();
    });

    caixa.querySelector("[data-fechar]").addEventListener("click", desligar);
    caixa.querySelector("[data-recolher]").addEventListener("click", () => {
      caixa.classList.toggle("recolhido");
    });
    caixa.querySelector("[data-fixar]").addEventListener("click", fixarNaLateral);

    arrastavel(caixa, caixa.querySelector("[data-arrastar]"));
    redimensionavel(caixa);
    aplicarTamanhoSalvo(caixa);
    observarTamanho(caixa);
    renderizar();
  }

  /** Deixa o painel ser arrastado: ele pode estar cobrindo o que a QA quer clicar. */
  function arrastavel(caixa, punho) {
    let dx = 0, dy = 0, arrastando = false;
    punho.addEventListener("mousedown", (ev) => {
      if (ev.target.closest("button")) return;
      arrastando = true;
      const r = caixa.getBoundingClientRect();
      dx = ev.clientX - r.left;
      dy = ev.clientY - r.top;
      ev.preventDefault();
      ev.stopPropagation();
    });
    document.addEventListener("mousemove", (ev) => {
      if (!arrastando) return;
      caixa.style.left = `${ev.clientX - dx}px`;
      caixa.style.top = `${ev.clientY - dy}px`;
      caixa.style.right = "auto";
    }, true);
    document.addEventListener("mouseup", () => { arrastando = false; }, true);
  }

  const MIN_LARGURA = 320;
  const MIN_ALTURA = 240;

  /**
   * Fixa a caixa em coordenadas absolutas antes de mexer nela.
   *
   * Ela nasce ancorada pela direita (top/right). Redimensionar pelo lado
   * esquerdo com essa âncora faria a caixa "escorregar", porque mudar a largura
   * move a borda que não está presa. Passar para left/top uma vez resolve, e
   * daí toda a conta vira aritmética simples.
   */
  function fixarGeometria(caixa) {
    const r = caixa.getBoundingClientRect();
    caixa.style.left = `${r.left}px`;
    caixa.style.top = `${r.top}px`;
    caixa.style.right = "auto";
    caixa.style.width = `${r.width}px`;
    caixa.style.height = `${r.height}px`;
    return r;
  }

  /** Redimensionamento pelas oito pontas. */
  function redimensionavel(caixa) {
    for (const alca of caixa.querySelectorAll("[data-alca]")) {
      alca.addEventListener("pointerdown", (ev) => {
        if (caixa.classList.contains("recolhido")) return;
        ev.preventDefault();
        ev.stopPropagation();

        const lado = alca.dataset.alca;
        const inicio = fixarGeometria(caixa);
        const x0 = ev.clientX;
        const y0 = ev.clientY;
        caixa.classList.add("redimensionando");
        alca.setPointerCapture(ev.pointerId);

        const mover = (e) => {
          const dx = e.clientX - x0;
          const dy = e.clientY - y0;
          let { left, top, width, height } = {
            left: inicio.left, top: inicio.top,
            width: inicio.width, height: inicio.height,
          };

          if (lado.includes("e")) width = inicio.width + dx;
          if (lado.includes("s")) height = inicio.height + dy;
          // Pelo lado oposto, a borda presa é a de baixo/direita: a largura
          // cresce enquanto a origem anda, e as duas têm que andar juntas.
          if (lado.includes("w")) {
            width = inicio.width - dx;
            left = inicio.left + dx;
          }
          if (lado.includes("n")) {
            height = inicio.height - dy;
            top = inicio.top + dy;
          }

          // Trava no mínimo sem deixar a caixa deslizar: ao bater no piso pelo
          // lado esquerdo, a origem para junto, senão ela continuaria andando.
          if (width < MIN_LARGURA) {
            if (lado.includes("w")) left = inicio.left + (inicio.width - MIN_LARGURA);
            width = MIN_LARGURA;
          }
          if (height < MIN_ALTURA) {
            if (lado.includes("n")) top = inicio.top + (inicio.height - MIN_ALTURA);
            height = MIN_ALTURA;
          }

          // Não deixa sair da tela. Puxando pelo norte dava para empurrar o
          // topo para fora da viewport, e com a barra de título inacessível o
          // painel não voltava mais — nem para arrastar, nem para fechar.
          if (top < 0) {
            if (lado.includes("n")) height += top; // devolve o que passou
            top = 0;
          }
          if (left < 0) {
            if (lado.includes("w")) width += left;
            left = 0;
          }
          width = Math.min(width, window.innerWidth - left);
          height = Math.min(height, window.innerHeight - top);
          width = Math.max(width, MIN_LARGURA);
          height = Math.max(height, MIN_ALTURA);

          caixa.style.left = `${Math.round(left)}px`;
          caixa.style.top = `${Math.round(top)}px`;
          caixa.style.width = `${Math.round(width)}px`;
          caixa.style.height = `${Math.round(height)}px`;
        };

        const soltar = () => {
          caixa.classList.remove("redimensionando");
          alca.removeEventListener("pointermove", mover);
          alca.removeEventListener("pointerup", soltar);
          alca.removeEventListener("pointercancel", soltar);
          salvarGeometria(caixa);
        };

        alca.addEventListener("pointermove", mover);
        alca.addEventListener("pointerup", soltar);
        alca.addEventListener("pointercancel", soltar);
      });
    }
  }

  /** Devolve o painel ao tamanho e ao lugar que a QA tinha deixado. */
  function aplicarTamanhoSalvo(caixa) {
    const t = estado.painel;
    if (!t) return;
    if (t.largura) caixa.style.width = `${t.largura}px`;
    if (t.altura) caixa.style.height = `${t.altura}px`;
    // Só reposiciona se a caixa couber na tela atual: a QA pode ter deixado o
    // painel num monitor maior, e restaurar fora da vista seria pior do que
    // voltar ao canto padrão.
    if (typeof t.left === "number" && typeof t.top === "number" &&
        t.left >= 0 && t.top >= 0 &&
        t.left + (t.largura || 0) <= window.innerWidth &&
        t.top + 40 <= window.innerHeight) {
      caixa.style.left = `${t.left}px`;
      caixa.style.top = `${t.top}px`;
      caixa.style.right = "auto";
    }
  }

  /** Guarda tamanho e posição. */
  function salvarGeometria(caixa) {
    if (caixa.classList.contains("recolhido")) return;
    const r = caixa.getBoundingClientRect();
    const novo = {
      largura: Math.round(r.width), altura: Math.round(r.height),
      left: Math.round(r.left), top: Math.round(r.top),
    };
    const t = estado.painel;
    if (t && t.largura === novo.largura && t.altura === novo.altura &&
        t.left === novo.left && t.top === novo.top) return;
    estado.painel = novo;
    gravarEstado();
  }

  /**
   * Guarda a geometria quando a QA solta o ponteiro.
   *
   * A primeira versão usava ResizeObserver e não gravava nada — medido no banco
   * de provas, o storage ficava vazio depois de um resize. O soltar é o gesto
   * que de fato encerra um arraste, e dá para verificar.
   */
  function observarTamanho(caixa) {
    const salvar = () => salvarGeometria(caixa);
    // Capturante e no documento: o ponteiro costuma sair da caixa durante o
    // arraste, e um listener só nela perderia o soltar.
    document.addEventListener("mouseup", salvar, true);
    document.addEventListener("pointerup", salvar, true);
  }

  function renderizar() {
    if (!painel) return;
    painel.contagem.textContent = String(estado.elementos.length);
    // Não sobrescreve enquanto a QA digita: o cursor saltaria para o fim.
    if (painel.rascunho !== document.activeElement &&
        painel.rascunho.value !== estado.rascunho) {
      painel.rascunho.value = estado.rascunho;
      painel.rascunho.scrollTop = painel.rascunho.scrollHeight;
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = texto;
      Object.assign(ta.style, { position: "fixed", top: "-1000px", opacity: "0" });
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  // --- Liga / desliga ---------------------------------------------------------

  // Só o frame de topo desenha o painel. O script roda em todos os frames para
  // alcançar elementos dentro de iframe; se cada um criasse o seu, a QA veria
  // um bloco de notas por frame, todos mostrando a mesma lista.
  const ehTopo = (() => {
    try {
      return window.top === window;
    } catch {
      return false; // iframe de outra origem: não é o topo
    }
  })();

  async function ligar() {
    if (ligado) return true;
    await lerEstado();
    await garantirPadroes();
    if (ehTopo) {
      // Espera o painel ficar utilizável ANTES de aceitar cliques. Sem isso a
      // QA capturava enquanto os <select> ainda estavam vazios, e a linguagem
      // exibida passava a discordar da que gerou as linhas.
      if (!painel) await criarPainel();
      ligado = true;
      aplicarFixado(); // fixado na lateral: liga o modo sem trazer a caixa de volta
    }
    ligado = true;
    instalarOuvintes();
    document.documentElement.style.cursor = "crosshair";
    renderizar();
    return true;
  }

  /**
   * Manda o bloco de notas para o painel lateral e some com a caixa flutuante.
   *
   * A captura continua aqui: o que muda é só onde o texto aparece. Numa tela
   * cheia de formulário a caixa flutuante cobre justamente o que se quer
   * clicar, e arrastar para o canto resolve mal, porque o canto também é
   * página. Na lateral ela sai de cima do conteúdo de uma vez.
   */
  async function fixarNaLateral() {
    estado.fixado = true;
    await gravarEstado();
    aplicarFixado();
    // O content script não abre o painel sozinho. Se o gesto não chegar íntegro
    // ao service worker, o painel simplesmente não abre — e aí a caixa volta,
    // porque sumir com ela sem ter para onde ir deixaria a QA sem nada na tela.
    const r = await chrome.runtime
      .sendMessage({ app: "proteu", tipo: "ABRIR_LATERAL" })
      .catch(() => null);
    if (!r || !r.ok) {
      estado.fixado = false;
      await gravarEstado();
      aplicarFixado();
      avisarNaCaixa("abra o painel lateral pelo ícone da extensão");
    }
  }

  /** Esconde ou mostra a caixa conforme o destino escolhido para o rascunho. */
  function aplicarFixado() {
    if (!painel) return;
    painel.host.style.display = ligado && !estado.fixado ? "" : "none";
  }

  /** Recado curto no rodapé da própria caixa, onde a QA está olhando. */
  function avisarNaCaixa(texto) {
    const dica = painel?.caixa.querySelector(".dica");
    if (!dica) return;
    const antes = dica.textContent;
    dica.textContent = texto;
    setTimeout(() => { dica.textContent = antes; }, 4000);
  }

  function desligar() {
    if (!ligado) return false;
    ligado = false;
    removerOuvintes();
    limparRealce();
    document.documentElement.style.cursor = "";
    if (painel) painel.host.style.display = "none";
    return false;
  }

  // Mudança vinda do painel do DevTools: os dois mostram a mesma lista.
  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area !== "local" || !mudancas[CHAVE]) return;
    const novo = mudancas[CHAVE].newValue;
    if (!novo) return;
    estado = { ...estado, ...novo };
    // Antes de `pronto` os selects estão vazios: escrever neles não faz nada e
    // deixaria a lista exibindo a primeira opção, que não é a escolhida.
    if (painel && painel.pronto) {
      painel.linguagem.value = estado.linguagem;
      painel.convencao.value = estado.convencao;
    }
    // O "soltar na página" mora no painel lateral: é por esta mudança de
    // storage que a caixa flutuante reaparece.
    aplicarFixado();
    renderizar();
  });

  chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
    if (!msg || msg.app !== "proteu") return false;

    if (msg.tipo === "MAPEAR_ALTERNAR") {
      (ligado ? Promise.resolve(desligar()) : ligar())
        .then((v) => responder({ ligado: !!v }))
        .catch((e) => responder({ ligado: false, erro: e.message }));
      return true;
    }

    if (msg.tipo === "MAPEAR_ESTADO") {
      responder({ ligado, quantos: estado.elementos.length });
      return true;
    }

    return false;
  });

  window.__proteuMapeador = true;
})();
