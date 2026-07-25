import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  IDIOMAS,
  CODIGOS_IDIOMA,
  RTL,
  gerarPalavras,
  gerarFrase,
  gerarFrases,
} from "../../src/core/text/idiomas.js";

describe("idiomas — estrutura", () => {
  it("são exatamente 9 idiomas", () => {
    expect(CODIGOS_IDIOMA).toHaveLength(9);
    expect(CODIGOS_IDIOMA).toEqual(
      expect.arrayContaining(["pt", "es", "ar", "tr", "ru", "zh", "hi", "ja", "he"])
    );
  });

  it("cada idioma tem rótulo, palavras e frases não vazias", () => {
    for (const [cod, idioma] of Object.entries(IDIOMAS)) {
      expect(idioma.rotulo, cod).toBeTruthy();
      expect(idioma.palavras.length, cod).toBeGreaterThanOrEqual(10);
      expect(idioma.frases.length, cod).toBeGreaterThanOrEqual(3);
    }
  });

  it("árabe e hebraico são marcados como RTL", () => {
    expect(RTL.has("ar")).toBe(true);
    expect(RTL.has("he")).toBe(true);
    expect(RTL.has("pt")).toBe(false);
  });
});

describe("idiomas — o script certo (sem contaminação latina)", () => {
  const faixas = {
    ru: /[Ѐ-ӿ]/, // cirílico
    ar: /[؀-ۿ]/, // árabe
    he: /[֐-׿]/, // hebraico
    hi: /[ऀ-ॿ]/, // devanágari
    zh: /[一-鿿]/, // CJK
  };
  for (const [cod, faixa] of Object.entries(faixas)) {
    it(`${cod}: toda palavra contém caractere do script esperado`, () => {
      for (const p of IDIOMAS[cod].palavras) {
        expect(faixa.test(p), `${cod}: "${p}"`).toBe(true);
      }
    });
  }
});

describe("idiomas — os perigos que motivam cada um", () => {
  it("turco: toUpperCase() ingênuo corrompe 'i' (perde o ponto do İ)", () => {
    // Documenta o hazard: em JS, "i".toUpperCase() === "I", não "İ".
    expect("işlem".toUpperCase()).not.toBe("İŞLEM");
  });

  it("russo: contém homoglifos que PARECEM latinos mas não são", () => {
    // 'р' cirílico (U+0440) != 'p' latino (U+0070).
    const temHomoglifo = IDIOMAS.ru.palavras.some((p) => /[аеорс]/.test(p));
    expect(temHomoglifo).toBe(true);
    expect("привет".includes("p")).toBe(false); // nenhum 'p' latino ali
  });
});

describe("geração determinística", () => {
  it("gerarPalavras: quantidade certa, só palavras do idioma, reproduzível", () => {
    const a = criarRng("idiomas");
    const b = criarRng("idiomas");
    const pa = gerarPalavras(a, "ja", 5);
    const pb = gerarPalavras(b, "ja", 5);
    expect(pa).toBe(pb);
    for (const palavra of pa.split(" ")) {
      expect(IDIOMAS.ja.palavras).toContain(palavra);
    }
    expect(pa.split(" ")).toHaveLength(5);
  });

  it("gerarFrase: vem do conjunto do idioma e é determinística", () => {
    const f = gerarFrase(criarRng("f"), "pt");
    expect(IDIOMAS.pt.frases).toContain(f);
    expect(gerarFrase(criarRng("f"), "pt")).toBe(f);
  });

  it("gerarFrases: determinística e monta a partir das frases do idioma", () => {
    expect(gerarFrases(criarRng("fs"), "es", 3)).toBe(gerarFrases(criarRng("fs"), "es", 3));
    // Com n=1 deve ser exatamente uma das frases do idioma.
    const uma = gerarFrases(criarRng("u"), "pt", 1);
    expect(IDIOMAS.pt.frases).toContain(uma);
    // n maior gera texto mais longo.
    expect(gerarFrases(criarRng("g"), "pt", 5).length)
      .toBeGreaterThan(gerarFrases(criarRng("g"), "pt", 1).length);
  });

  it("idioma desconhecido lança", () => {
    expect(() => gerarPalavras(criarRng("x"), "kl", 3)).toThrow();
    expect(() => gerarFrase(criarRng("x"), "kl")).toThrow();
  });
});
