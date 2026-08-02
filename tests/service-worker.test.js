import { describe, it, expect, beforeAll, beforeEach } from "vitest";

// Mock do chrome que captura os listeners registrados pelo service worker e
// grava as mensagens enviadas — permite disparar o menu de contexto / atalho e
// verificar a cadeia inteira sem navegador.
function instalarChromeFake() {
  const listeners = {};
  const capturar = (nome) => ({ addListener: (fn) => (listeners[nome] = fn) });
  const sync = {};
  const local = {};
  const armazenamento = (loja) => ({
    async get(chave) {
      return chave in loja ? { [chave]: structuredClone(loja[chave]) } : {};
    },
    async set(obj) {
      Object.assign(loja, structuredClone(obj));
    },
  });
  const enviadas = [];
  const menusCriados = [];
  const errosMenu = [];
  const registrados = [];
  const injetados = [];
  const estado = { permissao: false, abas: [{ id: 1, url: "https://exemplo.test/a" }] };

  globalThis.chrome = {
    runtime: {
      onInstalled: capturar("instalado"),
      onStartup: capturar("iniciado"),
      onMessage: capturar("mensagem"),
    },
    permissions: {
      async contains() {
        return estado.permissao;
      },
      onAdded: capturar("permissaoAdicionada"),
      onRemoved: capturar("permissaoRemovida"),
    },
    contextMenus: {
      // `removeAll` é assíncrono no Chrome real; o mock também cede o controle,
      // senão a corrida que este arquivo testa nunca aconteceria.
      async removeAll() {
        await Promise.resolve();
        menusCriados.length = 0;
      },
      // O Chrome real recusa id repetido com "Cannot create item with duplicate
      // id". Sem isso no mock, o bug de menu duplicado passava batido.
      create: (def) => {
        if (menusCriados.some((m) => m.id === def.id)) {
          errosMenu.push(`Cannot create item with duplicate id ${def.id}`);
          return def.id;
        }
        menusCriados.push(def);
        return def.id;
      },
      onClicked: capturar("menuClicado"),
    },
    commands: { onCommand: capturar("comando") },
    tabs: {
      async query(filtro) {
        if (filtro && filtro.active) return [{ id: 1 }];
        return estado.abas;
      },
      async sendMessage(tabId, msg, opcoes) {
        enviadas.push({ tabId, msg, opcoes });
        return { ok: true };
      },
    },
    scripting: {
      async executeScript(alvo) {
        injetados.push(alvo);
        return [{ frameId: 0 }];
      },
      async getRegisteredContentScripts({ ids }) {
        return registrados.filter((r) => ids.includes(r.id));
      },
      async registerContentScripts(lista) {
        registrados.push(...lista);
      },
      async unregisterContentScripts({ ids }) {
        for (let i = registrados.length - 1; i >= 0; i--) {
          if (ids.includes(registrados[i].id)) registrados.splice(i, 1);
        }
      },
    },
    storage: {
      sync: armazenamento(sync),
      local: armazenamento(local),
      onChanged: capturar("storageChanged"),
    },
  };
  return {
    listeners, sync, local, enviadas, menusCriados, errosMenu,
    registrados, injetados, estado,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 20));

let ctx;
beforeAll(async () => {
  ctx = instalarChromeFake();
  await import("../src/background/service-worker.js");
});

const ESTRATEGIAS = ["melhor", "id", "css", "xpath", "xpath-absoluto", "texto"];

describe("service worker — menu de contexto de seletores", () => {
  beforeEach(() => {
    ctx.errosMenu.length = 0;
  });

  it("sem a permissão de host, não cria menu nenhum", async () => {
    // Um menu que não consegue saber onde a QA clicou só produz clique que não
    // faz nada — pior do que não existir.
    ctx.estado.permissao = false;
    await ctx.listeners.instalado();
    await flush();
    expect(ctx.menusCriados).toEqual([]);
    expect(ctx.registrados).toEqual([]);
  });

  it("com a permissão, cria a raiz e um item por estratégia", async () => {
    ctx.estado.permissao = true;
    await ctx.listeners.instalado();
    await flush();

    const ids = ctx.menusCriados.map((m) => m.id);
    expect(ids).toContain("proteu:raiz");
    for (const estrategia of ESTRATEGIAS) {
      expect(ids, `faltou ${estrategia}`).toContain(`proteu:sel:${estrategia}`);
    }
    // Vale em qualquer elemento, não só em campo editável — é essa a diferença
    // em relação ao menu de gerar documento que existia antes.
    for (const m of ctx.menusCriados) {
      expect(m.contexts).toContain("all");
    }
  });

  it("os itens penduram na raiz e os separadores têm o tipo certo", async () => {
    ctx.estado.permissao = true;
    await ctx.listeners.instalado();
    await flush();
    for (const m of ctx.menusCriados.filter((x) => x.id !== "proteu:raiz")) {
      expect(m.parentId).toBe("proteu:raiz");
      if (m.id.startsWith("proteu:sep:")) expect(m.type).toBe("separator");
      else expect(m.title, `${m.id} sem título`).toBeTruthy();
    }
  });

  it("não sobrou nenhum item de gerar documento", async () => {
    ctx.estado.permissao = true;
    await ctx.listeners.instalado();
    await flush();
    const antigos = ctx.menusCriados.filter((m) => m.id.startsWith("proteu:gerar:"));
    expect(antigos, "o menu de documentos deveria ter saído").toEqual([]);
  });

  it("registra o content script e injeta nas abas já abertas", async () => {
    // Sem a injeção, a QA liga a opção e o menu não funciona na aba em que ela
    // está — só depois de um F5, o que parece bug.
    ctx.estado.permissao = true;
    ctx.registrados.length = 0;
    ctx.injetados.length = 0;
    await ctx.listeners.permissaoAdicionada();
    await flush();

    expect(ctx.registrados.map((r) => r.id)).toContain("proteu-seletor");
    expect(ctx.registrados[0].js).toEqual(["src/content/seletor.js"]);
    expect(ctx.registrados[0].allFrames).toBe(true);
    expect(ctx.injetados.some((i) => i.files?.includes("src/content/seletor.js"))).toBe(true);
  });

  it("revogar a permissão desregistra o script e limpa o menu", async () => {
    ctx.estado.permissao = true;
    await ctx.listeners.permissaoAdicionada();
    await flush();
    expect(ctx.registrados.length).toBeGreaterThan(0);

    ctx.estado.permissao = false;
    await ctx.listeners.permissaoRemovida();
    await flush();

    expect(ctx.registrados.map((r) => r.id)).not.toContain("proteu-seletor");
    expect(ctx.menusCriados).toEqual([]);
  });

  it("não registra o script duas vezes", async () => {
    ctx.estado.permissao = true;
    await ctx.listeners.permissaoAdicionada();
    await flush();
    await ctx.listeners.permissaoAdicionada();
    await flush();
    const quantos = ctx.registrados.filter((r) => r.id === "proteu-seletor").length;
    expect(quantos).toBe(1);
  });
});

describe("service worker — sincronização pedida pelo popup", () => {
  // `permissions.request()` sai do popup, e o popup fecha no instante em que o
  // Chrome mostra o diálogo. Se `onAdded` não alcançar o service worker — que
  // em MV3 pode estar dormindo —, a permissão fica concedida e o menu não
  // existe. Para o QA isso aparece como "ativei e não apareceu nada".

  it("monta o que faltava quando o popup reconfirma", async () => {
    // Cenário exato da falha: permissão concedida, mas onAdded se perdeu.
    ctx.estado.permissao = false;
    await ctx.listeners.permissaoRemovida();
    await flush();
    expect(ctx.menusCriados).toEqual([]);

    ctx.estado.permissao = true; // concedida "por fora", sem evento
    const resposta = await new Promise((r) => {
      ctx.listeners.mensagem({ app: "proteu", tipo: "SINCRONIZAR" }, {}, r);
    });

    expect(resposta.ok).toBe(true);
    expect(ctx.menusCriados.map((m) => m.id)).toContain("proteu:sel:melhor");
    expect(ctx.registrados.map((r) => r.id)).toContain("proteu-seletor");
  });

  it("ignora mensagem de outra origem", () => {
    const retorno = ctx.listeners.mensagem({ tipo: "SINCRONIZAR" }, {}, () => {});
    expect(retorno).toBe(false);
  });

  it("reconfirmar sem permissão não cria menu", async () => {
    ctx.estado.permissao = false;
    await new Promise((r) => {
      ctx.listeners.mensagem({ app: "proteu", tipo: "SINCRONIZAR" }, {}, r);
    });
    expect(ctx.menusCriados).toEqual([]);
  });
});

describe("service worker — clique no item de seletor", () => {
  beforeEach(() => {
    ctx.estado.permissao = true;
    ctx.enviadas.length = 0;
  });

  it("manda a estratégia escolhida para o frame clicado", async () => {
    await ctx.listeners.menuClicado(
      { menuItemId: "proteu:sel:xpath", frameId: 3 },
      { id: 42 }
    );
    await flush();

    const ultima = ctx.enviadas.at(-1);
    expect(ultima.tabId).toBe(42);
    expect(ultima.opcoes).toEqual({ frameId: 3 });
    expect(ultima.msg).toEqual({
      app: "proteu",
      tipo: "COPIAR_SELETOR",
      estrategia: "xpath",
    });
  });

  it("cada estratégia chega inteira, inclusive as que têm hífen", async () => {
    for (const estrategia of ESTRATEGIAS) {
      await ctx.listeners.menuClicado(
        { menuItemId: `proteu:sel:${estrategia}`, frameId: 0 },
        { id: 7 }
      );
      await flush();
      expect(ctx.enviadas.at(-1).msg.estrategia).toBe(estrategia);
    }
  });

  it("ignora itens que não são de seletor", async () => {
    const antes = ctx.enviadas.length;
    await ctx.listeners.menuClicado({ menuItemId: "outro:qualquer", frameId: 0 }, { id: 42 });
    await ctx.listeners.menuClicado({ menuItemId: "proteu:raiz", frameId: 0 }, { id: 42 });
    await flush();
    expect(ctx.enviadas.length).toBe(antes);
  });

  it("clique sem aba não estoura", async () => {
    const antes = ctx.enviadas.length;
    await ctx.listeners.menuClicado({ menuItemId: "proteu:sel:css", frameId: 0 }, null);
    await flush();
    expect(ctx.enviadas.length).toBe(antes);
  });
});

describe("service worker — atalho 'repetir última geração'", () => {
  beforeEach(() => {
    ctx.enviadas.length = 0;
  });

  it("reenvia o último valor do histórico para o campo focado", async () => {
    ctx.local.historico = [{ tipo: "cpf", valor: "111.444.777-35", em: Date.now() }];

    await ctx.listeners.comando("repetir-ultima-geracao");
    await flush();

    const ultima = ctx.enviadas.at(-1);
    expect(ultima.msg.tipo).toBe("INSERIR");
    expect(ultima.msg.valor).toBe("111.444.777-35");
    // Sem frameId no atalho: insere no frame ativo.
    expect(ultima.opcoes).toBeUndefined();
  });

  it("com histórico vazio, não envia nada", async () => {
    ctx.local.historico = [];
    const antes = ctx.enviadas.length;
    await ctx.listeners.comando("repetir-ultima-geracao");
    await flush();
    expect(ctx.enviadas.length).toBe(antes);
  });

  it("ignora comandos desconhecidos", async () => {
    const antes = ctx.enviadas.length;
    await ctx.listeners.comando("outro-comando");
    await flush();
    expect(ctx.enviadas.length).toBe(antes);
  });
});

describe("service worker — menu sem ids duplicados", () => {
  // Bug real, visto ao carregar a extensão pela primeira vez: o console enchia
  // de "Cannot create item with duplicate id".
  //
  // Causa: duas reconstruções concorrentes. `onInstalled` dispara uma e o popup
  // — ao gravar o país pela primeira vez (null → "br") — dispara outra. Cada
  // uma faz `await removeAll()`, e é nesse await que a segunda entra: as duas
  // limpam o menu e as duas criam os mesmos ids.

  beforeEach(() => {
    ctx.estado.permissao = true;
    ctx.errosMenu.length = 0;
  });

  it("reconstruções concorrentes não colidem", async () => {
    ctx.listeners.instalado();
    ctx.listeners.storageChanged(
      { config: { oldValue: { pais: null }, newValue: { pais: "br" } } },
      "sync"
    );
    await flush();
    expect(ctx.errosMenu, ctx.errosMenu.join(" | ")).toEqual([]);
  });

  it("o menu fica com um item por estratégia, sem repetição", async () => {
    await ctx.listeners.instalado();
    await flush();
    const ids = ctx.menusCriados.map((m) => m.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("uma enxurrada de trocas de país não gera colisão", async () => {
    for (const pais of ["us", "cn", "de", "br", "in", "sa"]) {
      ctx.listeners.storageChanged(
        { config: { oldValue: { pais: "xx" }, newValue: { pais } } },
        "sync"
      );
    }
    await flush();
    expect(ctx.errosMenu, ctx.errosMenu.join(" | ")).toEqual([]);
  });

  it("trocar só o idioma da interface também refaz o menu", async () => {
    ctx.menusCriados.length = 0;
    ctx.listeners.storageChanged(
      {
        config: {
          oldValue: { pais: "br", idiomaFixo: null },
          newValue: { pais: "br", idiomaFixo: "en" },
        },
      },
      "sync"
    );
    await flush();
    expect(ctx.menusCriados.map((m) => m.id)).toContain("proteu:sel:melhor");
  });
});

describe("service worker — diagnóstico do menu", () => {
  // "Não aparece nada" é indistinguível de três causas com soluções
  // diferentes: permissão não concedida, content script não registrado, menu
  // não montado. O popup mostra qual dos três falhou.

  const perguntar = () =>
    new Promise((r) => ctx.listeners.mensagem({ app: "proteu", tipo: "DIAGNOSTICO" }, {}, r));

  it("sem permissão, aponta os três como faltando", async () => {
    ctx.estado.permissao = false;
    await ctx.listeners.permissaoRemovida();
    await flush();
    expect(await perguntar()).toMatchObject({ permissao: false, script: false, menu: false });
  });

  it("com tudo pronto, aponta os três como ok", async () => {
    ctx.estado.permissao = true;
    await ctx.listeners.permissaoAdicionada();
    await flush();
    expect(await perguntar()).toMatchObject({ permissao: true, script: true, menu: true });
  });

  it("distingue permissão concedida de menu montado", async () => {
    // É o estado exato do bug de `onAdded` perdido: acesso liberado, nada
    // montado. Sem essa distinção, a saída seria "ative a permissão" — que já
    // está ativa, e o QA fica em looping.
    ctx.estado.permissao = false;
    await ctx.listeners.permissaoRemovida();
    await flush();
    ctx.estado.permissao = true; // concedida por fora, sem evento

    const antes = await perguntar();
    expect(antes.permissao).toBe(true);
    expect(antes.menu).toBe(false);
  });
});
