import { describe, it, expect } from "vitest";
import {
  t,
  resolverIdioma,
  IDIOMAS_UI,
  LANG_ATTR,
  _MENSAGENS,
} from "../src/core/i18n.js";

describe("i18n — estrutura", () => {
  it("tem exatamente 3 idiomas de UI (pt, es, en)", () => {
    expect(IDIOMAS_UI.map((i) => i.code)).toEqual(["pt", "es", "en"]);
  });

  it("todo idioma tem lang attr", () => {
    for (const { code } of IDIOMAS_UI) {
      expect(LANG_ATTR[code]).toBeTruthy();
    }
  });
});

describe("i18n — paridade de chaves", () => {
  const chavesPt = Object.keys(_MENSAGENS.pt).sort();

  for (const idioma of ["es", "en"]) {
    it(`${idioma} tem exatamente as mesmas chaves que pt (nenhuma faltando/sobrando)`, () => {
      const chaves = Object.keys(_MENSAGENS[idioma]).sort();
      expect(chaves).toEqual(chavesPt);
    });

    it(`${idioma} não deixa nenhuma tradução vazia`, () => {
      for (const [chave, valor] of Object.entries(_MENSAGENS[idioma])) {
        expect(valor, `${idioma}.${chave}`).toBeTruthy();
      }
    });
  }
});

describe("t()", () => {
  it("traduz por idioma", () => {
    expect(t("pt", "copiar")).toBe("Copiar");
    expect(t("es", "copiar")).toBe("Copiar");
    expect(t("en", "copiar")).toBe("Copy");
    expect(t("en", "inserir_campo")).toBe("Insert into field");
  });

  it("interpola parâmetros", () => {
    expect(t("en", "fb_overflow", { n: 500 })).toBe("500-char overflow generated");
    expect(t("pt", "fb_chip_inserido", { rotulo: "emoji ZWJ" })).toBe('"emoji ZWJ" inserido');
  });

  it("cai no pt para idioma desconhecido e na própria chave se não existir", () => {
    expect(t("fr", "copiar")).toBe("Copiar"); // fallback pt
    expect(t("pt", "chave_inexistente")).toBe("chave_inexistente");
  });
});

describe("resolverIdioma", () => {
  it("mapeia o idioma do navegador", () => {
    expect(resolverIdioma("es-ES")).toBe("es");
    expect(resolverIdioma("es")).toBe("es");
    expect(resolverIdioma("en-US")).toBe("en");
    expect(resolverIdioma("pt-BR")).toBe("pt");
    expect(resolverIdioma("fr-FR")).toBe("pt"); // default
    expect(resolverIdioma("")).toBe("pt");
    expect(resolverIdioma(null)).toBe("pt");
  });
});
