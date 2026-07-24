import { describe, it, expect } from "vitest";
import {
  contarGrafemas,
  contarCodePoints,
  contarCodeUnits,
  contarBytes,
  contarTudo,
  paraGrafemas,
} from "../../src/core/text/contagem.js";

describe("contagem — ASCII simples", () => {
  it("as 4 unidades coincidem para ASCII", () => {
    expect(contarTudo("hello")).toEqual({
      grafemas: 5,
      codePoints: 5,
      codeUnits: 5,
      bytes: 5,
    });
  });
});

describe("contagem — onde as unidades divergem", () => {
  it('"é" (NFC): 1 grafema, 1 code point, 1 code unit, 2 bytes', () => {
    expect(contarTudo("é")).toEqual({
      grafemas: 1,
      codePoints: 1,
      codeUnits: 1,
      bytes: 2,
    });
  });

  it('emoji com tom de pele "👩🏽": 1 / 2 / 4 / 8', () => {
    expect(contarTudo("👩🏽")).toEqual({
      grafemas: 1,
      codePoints: 2,
      codeUnits: 4,
      bytes: 8,
    });
  });

  it('família ZWJ "👩‍👩‍👧‍👦": 1 grafema mas 7 / 11 / 25', () => {
    expect(contarTudo("👩‍👩‍👧‍👦")).toEqual({
      grafemas: 1,
      codePoints: 7,
      codeUnits: 11,
      bytes: 25,
    });
  });

  it("as funções individuais batem com contarTudo", () => {
    const t = "a👩‍👩‍👧‍👦b";
    expect(contarGrafemas(t)).toBe(3);
    expect(contarCodePoints(t)).toBe(9);
    expect(contarCodeUnits(t)).toBe(13);
    expect(contarBytes(t)).toBe(27);
  });
});

describe("contagem — bordas", () => {
  it("string vazia e null", () => {
    expect(contarTudo("")).toEqual({ grafemas: 0, codePoints: 0, codeUnits: 0, bytes: 0 });
    expect(contarTudo(null)).toEqual({ grafemas: 0, codePoints: 0, codeUnits: 0, bytes: 0 });
  });

  it("ordem esperada: grafemas ≤ code points ≤ code units ≤ bytes", () => {
    for (const t of ["hello", "café", "👩🏽", "日本語", "👩‍👩‍👧‍👦"]) {
      const c = contarTudo(t);
      expect(c.grafemas).toBeLessThanOrEqual(c.codePoints);
      expect(c.codePoints).toBeLessThanOrEqual(c.codeUnits);
      expect(c.codeUnits).toBeLessThanOrEqual(c.bytes);
    }
  });
});

describe("paraGrafemas", () => {
  it("mantém clusters inteiros", () => {
    expect(paraGrafemas("a👩‍👩‍👧‍👦b")).toEqual(["a", "👩‍👩‍👧‍👦", "b"]);
  });

  it("reconstrói o texto original ao juntar", () => {
    const t = "café 日本語 👍🏾";
    expect(paraGrafemas(t).join("")).toBe(t);
  });
});
