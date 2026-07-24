import { describe, it, expect } from "vitest";
import { criarRng, normalizarSeed } from "../src/core/seed.js";

describe("criarRng", () => {
  it("mesma seed produz sequências idênticas", () => {
    const a = criarRng("7f2a91");
    const b = criarRng("7f2a91");
    const seqA = Array.from({ length: 1000 }, () => a.numero());
    const seqB = Array.from({ length: 1000 }, () => b.numero());
    expect(seqA).toEqual(seqB);
  });

  it("seeds diferentes produzem sequências diferentes", () => {
    const a = criarRng("7f2a91");
    const b = criarRng("7f2a92");
    const seqA = Array.from({ length: 100 }, () => a.numero());
    const seqB = Array.from({ length: 100 }, () => b.numero());
    expect(seqA).not.toEqual(seqB);
  });

  it("numero() fica em [0, 1)", () => {
    const rng = criarRng("abc123");
    for (let i = 0; i < 10000; i++) {
      const n = rng.numero();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it("inteiro() respeita os limites inclusivos e cobre as pontas", () => {
    const rng = criarRng("abc123");
    const vistos = new Set();
    for (let i = 0; i < 5000; i++) {
      const n = rng.inteiro(1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      vistos.add(n);
    }
    expect(vistos).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it("inteiro() rejeita intervalo inválido", () => {
    const rng = criarRng("abc123");
    expect(() => rng.inteiro(5, 1)).toThrow();
    expect(() => rng.inteiro(0.5, 2)).toThrow();
  });

  it("escolher() só devolve elementos do array", () => {
    const rng = criarRng("feed01");
    const itens = ["a", "b", "c"];
    for (let i = 0; i < 300; i++) {
      expect(itens).toContain(rng.escolher(itens));
    }
    expect(() => rng.escolher([])).toThrow();
  });

  it("stringDe() gera o tamanho pedido usando só o alfabeto", () => {
    const rng = criarRng("feed02");
    const s = rng.stringDe("XY9", 50);
    expect(s).toHaveLength(50);
    expect(s).toMatch(/^[XY9]+$/);
  });

  it("seed vazia ou não string é rejeitada", () => {
    expect(() => criarRng("")).toThrow();
    expect(() => criarRng(42)).toThrow();
  });
});

describe("normalizarSeed", () => {
  it("aceita hex de 1 a 16 caracteres e normaliza para minúsculas", () => {
    expect(normalizarSeed("7F2A91")).toBe("7f2a91");
    expect(normalizarSeed("  abc  ")).toBe("abc");
    expect(normalizarSeed("0")).toBe("0");
    expect(normalizarSeed("0123456789abcdef")).toBe("0123456789abcdef");
  });

  it("rejeita entradas inválidas", () => {
    expect(normalizarSeed("")).toBeNull();
    expect(normalizarSeed("xyz")).toBeNull();
    expect(normalizarSeed("0123456789abcdef0")).toBeNull();
    expect(normalizarSeed(null)).toBeNull();
  });
});
