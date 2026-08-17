import { describe, it, expect } from "vitest";
import { criarRng, normalizarSeed, normalizarReferencia, formatarReferencia } from "../src/core/seed.js";

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

describe("normalizarReferencia — o endereço de uma pessoa", () => {
  // A seed sozinha abre uma sequência; a pessoa é uma posição dentro dela.
  // Mandar só a seed para um colega entrega o começo da fila, não quem está
  // na tela. Por isso a UI trabalha com "seed#posição".

  it("seed sozinha vale como a primeira pessoa", () => {
    expect(normalizarReferencia("7f2a91")).toEqual({ seed: "7f2a91", contador: 0 });
  });

  it("lê a posição depois do #", () => {
    expect(normalizarReferencia("7f2a91#7")).toEqual({ seed: "7f2a91", contador: 7 });
    expect(normalizarReferencia("abc#0")).toEqual({ seed: "abc", contador: 0 });
    expect(normalizarReferencia("abc#1234")).toEqual({ seed: "abc", contador: 1234 });
  });

  it("normaliza caixa e espaços, como o campo aceita colado", () => {
    expect(normalizarReferencia("  7F2A91#3  ")).toEqual({ seed: "7f2a91", contador: 3 });
  });

  it("recusa posição que não é número inteiro positivo", () => {
    // Recusar dá retorno visível; aceitar em silêncio levaria a QA para outra
    // pessoa sem ela perceber que digitou errado.
    for (const ruim of ["abc#", "abc#x", "abc#1.5", "abc#-2", "abc#1e3", "abc# 1"]) {
      expect(normalizarReferencia(ruim), ruim).toBeNull();
    }
  });

  it("recusa seed inválida mesmo com posição boa", () => {
    for (const ruim of ["xyz#1", "#1", "12345678901234567#1", ""]) {
      expect(normalizarReferencia(ruim), ruim).toBeNull();
    }
  });

  it("recusa mais de um #", () => {
    expect(normalizarReferencia("abc#1#2")).toBeNull();
  });

  it("recusa posição absurda em vez de travar gerando", () => {
    expect(normalizarReferencia("abc#1000000")).toBeNull();
    expect(normalizarReferencia("abc#999999")).toEqual({ seed: "abc", contador: 999999 });
  });

  it("recusa entrada que não é string", () => {
    for (const ruim of [null, undefined, 42, {}]) expect(normalizarReferencia(ruim)).toBeNull();
  });
});

describe("formatarReferencia e a volta", () => {
  it("monta o texto que aparece no campo", () => {
    expect(formatarReferencia("7f2a91", 0)).toBe("7f2a91#0");
    expect(formatarReferencia("abc", 12)).toBe("abc#12");
  });

  it("ida e volta preserva seed e posição", () => {
    // É a garantia que o fluxo inteiro depende: copiar o campo, colar de volta
    // (ou em outra máquina) e cair na mesma pessoa.
    for (const seed of ["a", "7f2a91", "0123456789abcdef"]) {
      for (const contador of [0, 1, 7, 999, 999999]) {
        const texto = formatarReferencia(seed, contador);
        expect(normalizarReferencia(texto), texto).toEqual({ seed, contador });
      }
    }
  });
});
