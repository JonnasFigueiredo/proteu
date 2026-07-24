import { describe, it, expect, beforeEach } from "vitest";
import {
  carregarConfig,
  salvarConfig,
  persistirContador,
  carregarHistorico,
  adicionarHistorico,
  limparHistorico,
} from "../src/storage.js";

// chrome.storage falso, em memória, com a mesma semântica das partes que usamos:
// get(string) devolve { [chave]: valor } quando existe, senão {}.
function instalarChromeFake() {
  const criar = () => {
    const store = {};
    return {
      _store: store,
      async get(chave) {
        return chave in store ? { [chave]: structuredClone(store[chave]) } : {};
      },
      async set(obj) {
        Object.assign(store, structuredClone(obj));
      },
    };
  };
  globalThis.chrome = { storage: { sync: criar(), local: criar() } };
}

beforeEach(() => {
  instalarChromeFake();
});

describe("persistência de config (o requisito nº 1)", () => {
  it("na primeira carga gera uma seed e a PERSISTE", async () => {
    const c1 = await carregarConfig();
    expect(c1.seed).toMatch(/^[0-9a-f]{6}$/);
    // Segunda carga devolve exatamente a mesma seed (foi gravada, não regerada).
    const c2 = await carregarConfig();
    expect(c2.seed).toBe(c1.seed);
  });

  it("salva e recarrega mantendo as escolhas do usuário", async () => {
    await salvarConfig({
      seed: "7f2a91",
      documentos: { mascara: false, cnpjAlfanumerico: true, cnpjExcluirAmbiguas: true },
      insercao: { modo: "colar" },
      contador: 12,
    });
    const c = await carregarConfig();
    expect(c.seed).toBe("7f2a91");
    expect(c.documentos.mascara).toBe(false);
    expect(c.documentos.cnpjAlfanumerico).toBe(true);
    expect(c.insercao.modo).toBe("colar");
    expect(c.contador).toBe(12);
  });

  it("persistirContador altera só o contador", async () => {
    await salvarConfig({ seed: "abc123", insercao: { modo: "colar" } });
    await persistirContador(99);
    const c = await carregarConfig();
    expect(c.contador).toBe(99);
    expect(c.insercao.modo).toBe("colar"); // preservado
    expect(c.seed).toBe("abc123");
  });
});

describe("histórico", () => {
  it("começa vazio", async () => {
    expect(await carregarHistorico()).toEqual([]);
  });

  it("prepende (mais recente primeiro) e limita a 50", async () => {
    for (let i = 0; i < 60; i++) {
      await adicionarHistorico({ tipo: "cpf", valor: String(i) });
    }
    const hist = await carregarHistorico();
    expect(hist).toHaveLength(50);
    expect(hist[0].valor).toBe("59"); // último inserido no topo
    expect(hist[49].valor).toBe("10");
  });

  it("limparHistorico esvazia", async () => {
    await adicionarHistorico({ tipo: "cpf", valor: "x" });
    await limparHistorico();
    expect(await carregarHistorico()).toEqual([]);
  });
});
