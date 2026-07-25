import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  configPadrao,
  normalizarConfig,
  garantirConfig,
  gerarSeedAleatoria,
} from "../src/core/config.js";

describe("configPadrao", () => {
  it("tem defaults sensatos para o primeiro clique", () => {
    const c = configPadrao();
    expect(c.documentos.mascara).toBe(true);
    expect(c.documentos.cnpjAlfanumerico).toBe(false);
    expect(c.insercao.modo).toBe("valor");
    expect(c.contador).toBe(0);
    expect(c.seed).toBeNull();
  });

  it("retorna objeto novo a cada chamada (sem estado compartilhado)", () => {
    const a = configPadrao();
    a.documentos.mascara = false;
    expect(configPadrao().documentos.mascara).toBe(true);
  });

  it("tema começa em 'auto' (segue o sistema)", () => {
    expect(configPadrao().tema).toBe("auto");
  });

  it("pais começa null (resolvido no primeiro uso)", () => {
    expect(configPadrao().pais).toBeNull();
  });
});

describe("normalizarConfig", () => {
  it("preenche defaults a partir de objeto vazio", () => {
    expect(normalizarConfig({})).toEqual(configPadrao());
  });

  it("nunca lança com entradas absurdas", () => {
    expect(() => normalizarConfig(null)).not.toThrow();
    expect(() => normalizarConfig(42)).not.toThrow();
    expect(() => normalizarConfig("lixo")).not.toThrow();
    expect(normalizarConfig(null)).toEqual(configPadrao());
  });

  it("preserva valores válidos do usuário", () => {
    const salvo = {
      seed: "ABC123",
      documentos: { mascara: false, cnpjAlfanumerico: true },
      insercao: { modo: "colar" },
      contador: 7,
    };
    const c = normalizarConfig(salvo);
    expect(c.seed).toBe("abc123"); // normalizada p/ minúsculas
    expect(c.documentos.mascara).toBe(false);
    expect(c.documentos.cnpjAlfanumerico).toBe(true);
    expect(c.documentos.cnpjExcluirAmbiguas).toBe(false); // ausente → default
    expect(c.insercao.modo).toBe("colar");
    expect(c.contador).toBe(7);
  });

  it("descarta tipos errados caindo no default", () => {
    const c = normalizarConfig({
      documentos: { mascara: "sim", cnpjAlfanumerico: 1 },
      insercao: { modo: "teletransporte" },
      contador: -5,
    });
    expect(c.documentos.mascara).toBe(true);
    expect(c.documentos.cnpjAlfanumerico).toBe(false);
    expect(c.insercao.modo).toBe("valor");
    expect(c.contador).toBe(0);
  });

  it("rejeita seed inválida (vira null)", () => {
    expect(normalizarConfig({ seed: "xyz!" }).seed).toBeNull();
    expect(normalizarConfig({ seed: "" }).seed).toBeNull();
  });

  it("aceita temas válidos e rejeita o resto", () => {
    expect(normalizarConfig({ tema: "claro" }).tema).toBe("claro");
    expect(normalizarConfig({ tema: "escuro" }).tema).toBe("escuro");
    expect(normalizarConfig({ tema: "auto" }).tema).toBe("auto");
    expect(normalizarConfig({ tema: "roxo" }).tema).toBe("auto");
  });

  it("aceita país válido e rejeita o resto (vira null)", () => {
    expect(normalizarConfig({ pais: "br" }).pais).toBe("br");
    expect(normalizarConfig({ pais: "us" }).pais).toBe("us");
    expect(normalizarConfig({ pais: "ar" }).pais).toBe("ar");
    expect(normalizarConfig({ pais: "zz" }).pais).toBeNull();
  });

  it("ignora chaves desconhecidas", () => {
    const c = normalizarConfig({ hacker: true, documentos: { x: 1 } });
    expect(c.hacker).toBeUndefined();
    expect(c).toEqual(configPadrao());
  });
});

describe("gerarSeedAleatoria", () => {
  it("gera 6 caracteres hex", () => {
    const s = gerarSeedAleatoria();
    expect(s).toMatch(/^[0-9a-f]{6}$/);
  });
});

describe("garantirConfig", () => {
  it("injeta seed nova quando não há seed válida", () => {
    const { config, seedNova } = garantirConfig({});
    expect(seedNova).toBe(true);
    expect(config.seed).toMatch(/^[0-9a-f]{6}$/);
  });

  it("mantém a seed existente e sinaliza que não é nova", () => {
    const { config, seedNova } = garantirConfig({ seed: "7f2a91" });
    expect(seedNova).toBe(false);
    expect(config.seed).toBe("7f2a91");
  });
});
