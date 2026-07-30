import { describe, it, expect, beforeAll } from "vitest";
import { validarCpf } from "../src/core/documents/cpf.js";
import { validarCnpj } from "../src/core/documents/cnpj.js";

// Mock do chrome que captura os listeners registrados pelo service worker e
// grava as mensagens enviadas — permite disparar o menu de contexto / atalho
// e verificar toda a cadeia (gerar → contador → histórico → inserir).
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

  globalThis.chrome = {
    runtime: { onInstalled: capturar("instalado") },
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
      async query() { return [{ id: 1 }]; },
      async sendMessage(tabId, msg, opcoes) {
        enviadas.push({ tabId, msg, opcoes });
        return { ok: true };
      },
    },
    scripting: {
      async executeScript() { return [{ frameId: 0 }]; },
    },
    storage: {
      sync: armazenamento(sync),
      local: armazenamento(local),
      onChanged: capturar("storageChanged"),
    },
  };
  return { listeners, sync, local, enviadas, menusCriados, errosMenu };
}

const flush = () => new Promise((r) => setTimeout(r, 20));

let ctx;
beforeAll(async () => {
  ctx = instalarChromeFake();
  await import("../src/background/service-worker.js");
});

describe("service worker — menu de contexto", () => {
  it("onInstalled cria o menu raiz + um item por tipo (país ativo)", async () => {
    await ctx.listeners.instalado();
    await flush();
    const ids = ctx.menusCriados.map((m) => m.id);
    expect(ids).toContain("proteu:raiz");
    expect(ids).toContain("proteu:gerar:cpf");
    expect(ids).toContain("proteu:gerar:cnpj");
    // Todos os itens de gerar aparecem só em campo editável.
    for (const m of ctx.menusCriados) {
      expect(m.contexts).toContain("editable");
    }
  });

  it("clicar em 'Gerar CPF' gera, avança contador, registra histórico e manda inserir", async () => {
    await ctx.listeners.menuClicado(
      { menuItemId: "proteu:gerar:cpf", frameId: 0 },
      { id: 42 }
    );
    await flush();

    // Contador avançou de 0 para 1.
    expect(ctx.sync.config.contador).toBe(1);

    // Histórico recebeu o CPF gerado, e ele é válido.
    expect(ctx.local.historico).toHaveLength(1);
    const item = ctx.local.historico[0];
    expect(item.tipo).toBe("cpf");
    expect(validarCpf(item.valor)).toBe(true);

    // Mensagem de inserção foi enviada ao frame certo com o mesmo valor.
    const ultima = ctx.enviadas.at(-1);
    expect(ultima.tabId).toBe(42);
    expect(ultima.opcoes).toEqual({ frameId: 0 });
    expect(ultima.msg).toMatchObject({
      app: "proteu",
      tipo: "INSERIR",
      valor: item.valor,
    });
  });

  it("clicar em 'Gerar CNPJ' continua avançando o contador e gera CNPJ válido", async () => {
    await ctx.listeners.menuClicado(
      { menuItemId: "proteu:gerar:cnpj", frameId: 0 },
      { id: 42 }
    );
    await flush();
    expect(ctx.sync.config.contador).toBe(2);
    const item = ctx.local.historico[0];
    expect(item.tipo).toBe("cnpj");
    expect(validarCnpj(item.valor)).toBe(true);
  });

  it("ignora itens de menu que não são de geração", async () => {
    const antes = ctx.enviadas.length;
    await ctx.listeners.menuClicado({ menuItemId: "outro:qualquer", frameId: 0 }, { id: 42 });
    await flush();
    expect(ctx.enviadas.length).toBe(antes); // nada enviado
  });
});

describe("service worker — atalho 'repetir última geração'", () => {
  it("reenvia o último valor do histórico para o campo focado", async () => {
    const ultimoValor = ctx.local.historico[0].valor; // o CNPJ do teste anterior
    await ctx.listeners.comando("repetir-ultima-geracao");
    await flush();

    const ultima = ctx.enviadas.at(-1);
    expect(ultima.msg.tipo).toBe("INSERIR");
    expect(ultima.msg.valor).toBe(ultimoValor);
    // Sem frameId no atalho (insere no frame ativo).
    expect(ultima.opcoes).toBeUndefined();
  });

  it("ignora comandos desconhecidos", async () => {
    const antes = ctx.enviadas.length;
    await ctx.listeners.comando("outro-comando");
    await flush();
    expect(ctx.enviadas.length).toBe(antes);
  });
});

describe("service worker — menu de contexto sem ids duplicados", () => {
  // Bug real, visto ao carregar a extensão pela primeira vez: o console
  // enchia de "Cannot create item with duplicate id proteu:gerar:nome",
  // ":dataNascimento", ":cpf"… — a lista inteira de documentos do país.
  //
  // Causa: duas reconstruções concorrentes. Na instalação, `onInstalled`
  // dispara uma e o popup — ao gravar o país pela primeira vez (null → "br") —
  // dispara outra. Cada uma faz `await removeAll()`, e é nesse await que a
  // segunda entra: as duas limpam o menu e as duas criam os mesmos ids.

  it("reconstruções concorrentes não colidem", async () => {
    ctx.errosMenu.length = 0;
    // Exatamente o cenário da instalação: onInstalled + primeira gravação do
    // país, sem esperar uma terminar antes de disparar a outra.
    ctx.listeners.instalado();
    ctx.listeners.storageChanged(
      { config: { oldValue: { pais: null }, newValue: { pais: "br" } } },
      "sync"
    );
    await flush();

    expect(ctx.errosMenu, ctx.errosMenu.join(" | ")).toEqual([]);
  });

  it("o menu fica com um item por documento, sem repetição", async () => {
    ctx.errosMenu.length = 0;
    await ctx.listeners.instalado();
    await flush();

    const ids = ctx.menusCriados.map((m) => m.id);
    expect(ids.length).toBe(new Set(ids).size);
    expect(ids).toContain("proteu:raiz");
    // Todo item de documento pendura na raiz.
    for (const m of ctx.menusCriados.filter((x) => x.id !== "proteu:raiz")) {
      expect(m.parentId).toBe("proteu:raiz");
      expect(m.id.startsWith("proteu:gerar:")).toBe(true);
    }
  });

  it("uma enxurrada de trocas de país não gera colisão", async () => {
    ctx.errosMenu.length = 0;
    for (const pais of ["us", "cn", "de", "br", "in", "sa"]) {
      ctx.listeners.storageChanged(
        { config: { oldValue: { pais: "xx" }, newValue: { pais } } },
        "sync"
      );
    }
    await flush();
    expect(ctx.errosMenu, ctx.errosMenu.join(" | ")).toEqual([]);
  });
});
