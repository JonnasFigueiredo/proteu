import { describe, it, expect } from "vitest";
import {
  gerar, tiposDoPais, idiomaDoPais, paisMostraOpcoesCnpj, paisDoIdioma, PAIS_PADRAO,
} from "../src/core/gerador.js";

const TIPOS = tiposDoPais("br");
import { configPadrao } from "../src/core/config.js";
import { validarCpf } from "../src/core/documents/cpf.js";
import { validarCnpj } from "../src/core/documents/cnpj.js";

function configCom(overrides = {}) {
  return { ...configPadrao(), seed: "7f2a91", ...overrides };
}

describe("gerar", () => {
  it("gera CPF válido e devolve próximo contador", () => {
    const r = gerar("cpf", configCom({ contador: 0 }));
    expect(r.tipo).toBe("cpf");
    expect(validarCpf(r.valor)).toBe(true);
    expect(r.contador).toBe(0);
    expect(r.proximoContador).toBe(1);
  });

  it("gera CNPJ válido", () => {
    const r = gerar("cnpj", configCom({ contador: 3 }));
    expect(validarCnpj(r.valor)).toBe(true);
    expect(r.proximoContador).toBe(4);
  });

  it("mesma seed + mesmo contador = mesmo valor (reproduzível)", () => {
    const a = gerar("cpf", configCom({ contador: 5 }));
    const b = gerar("cpf", configCom({ contador: 5 }));
    expect(a.valor).toBe(b.valor);
  });

  it("contadores diferentes produzem valores diferentes", () => {
    const a = gerar("cpf", configCom({ contador: 0 }));
    const b = gerar("cpf", configCom({ contador: 1 }));
    expect(a.valor).not.toBe(b.valor);
  });

  it("seeds diferentes produzem valores diferentes no mesmo contador", () => {
    const a = gerar("cpf", { ...configPadrao(), seed: "aaa111", contador: 0 });
    const b = gerar("cpf", { ...configPadrao(), seed: "bbb222", contador: 0 });
    expect(a.valor).not.toBe(b.valor);
  });

  it("respeita opções de documento da config (CNPJ alfanumérico)", () => {
    const r = gerar("cnpj", configCom({
      contador: 0,
      documentos: { mascara: false, cnpjAlfanumerico: true, cnpjExcluirAmbiguas: false },
    }));
    expect(r.valor).toMatch(/^[0-9A-Z]{12}\d{2}$/);
  });

  it("não muta a config recebida", () => {
    const cfg = configCom({ contador: 2 });
    const snapshot = JSON.stringify(cfg);
    gerar("cpf", cfg);
    expect(JSON.stringify(cfg)).toBe(snapshot);
  });

  it("rejeita tipo desconhecido e config sem seed", () => {
    expect(() => gerar("inexistente", configCom())).toThrow();
    expect(() => gerar("cpf", { ...configPadrao(), seed: null })).toThrow();
  });

  it("país determina idioma e opções de CNPJ", () => {
    expect(idiomaDoPais("br")).toBe("pt");
    expect(idiomaDoPais("us")).toBe("en");
    expect(idiomaDoPais("ar")).toBe("es");
    // Só o Brasil tem as opções de CNPJ alfanumérico.
    expect(paisMostraOpcoesCnpj("br")).toBe(true);
    expect(paisMostraOpcoesCnpj("us")).toBe(false);
    expect(paisMostraOpcoesCnpj("ar")).toBe(false);
  });

  it("todo tipo registrado tem rótulo e função", () => {
    for (const def of Object.values(TIPOS)) {
      expect(typeof def.rotulo).toBe("string");
      expect(typeof def.gerar).toBe("function");
    }
  });

  it("todo tipo registrado gera string não vazia e é determinístico", () => {
    for (const tipo of Object.keys(TIPOS)) {
      const a = gerar(tipo, configCom({ contador: 3 }));
      const b = gerar(tipo, configCom({ contador: 3 }));
      expect(a.valor, `tipo ${tipo}`).toBeTypeOf("string");
      expect(a.valor.length, `tipo ${tipo}`).toBeGreaterThan(0);
      expect(a.valor, `tipo ${tipo} não determinístico`).toBe(b.valor);
    }
  });

  it("máscara desligada nunca deixa pontuação de máscara em documentos numéricos", () => {
    const semMascara = configCom({
      contador: 0,
      documentos: { mascara: false, cnpjAlfanumerico: false, cnpjExcluirAmbiguas: false },
    });
    for (const tipo of ["cpf", "cnpj", "cnpjRaiz", "rg", "ie", "cep", "telefone"]) {
      const { valor } = gerar(tipo, { ...semMascara });
      expect(valor, `tipo ${tipo}: ${valor}`).not.toMatch(/[.\-/() ]/);
    }
  });
});

describe("país no primeiro uso, a partir do idioma do navegador", () => {
  // Antes o primeiro uso cravava Brasil. Com a listagem traduzida, quem instala
  // vendo o título em inglês precisa abrir a extensão já no país dele.
  it("a região manda mais que o idioma", () => {
    expect(paisDoIdioma("en-AU")).toBe("au");
    expect(paisDoIdioma("en-CA")).toBe("ca");
    expect(paisDoIdioma("en-IN")).toBe("in");
    // Argentina como REGIÃO de espanhol, não árabe como idioma.
    expect(paisDoIdioma("es-AR")).toBe("ar");
    expect(paisDoIdioma("es-MX")).toBe("mx");
  });

  it("sem região, decide pelo idioma", () => {
    expect(paisDoIdioma("pt")).toBe("br");
    expect(paisDoIdioma("en")).toBe("us");
    expect(paisDoIdioma("es")).toBe("mx");
    expect(paisDoIdioma("de")).toBe("de");
    expect(paisDoIdioma("zh")).toBe("cn");
    expect(paisDoIdioma("ja")).toBe("jp");
    expect(paisDoIdioma("ko")).toBe("kr");
    expect(paisDoIdioma("hi")).toBe("in");
    // "ar" sozinho é árabe, e leva à Arábia Saudita.
    expect(paisDoIdioma("ar")).toBe("sa");
  });

  it("região que não atendemos cai no idioma", () => {
    expect(paisDoIdioma("en-GB")).toBe("us");
    expect(paisDoIdioma("pt-PT")).toBe("br");
    expect(paisDoIdioma("zh-TW")).toBe("cn");
    expect(paisDoIdioma("ar-AE")).toBe("sa");
  });

  it("aceita as duas grafias de locale e ignora caixa", () => {
    expect(paisDoIdioma("pt_BR")).toBe("br");
    expect(paisDoIdioma("EN-au")).toBe("au");
  });

  it("entrada inútil não quebra: cai no padrão", () => {
    for (const v of [undefined, null, "", "xx", "klingon", 42, {}]) {
      expect(paisDoIdioma(v)).toBe(PAIS_PADRAO);
    }
  });

  it("todo país devolvido é um país implementado de verdade", () => {
    const locales = ["pt-BR", "en-US", "en-AU", "es-AR", "de-DE", "zh-CN", "ar-SA", "hi-IN", "ja-JP", "ko-KR", "fr-CA"];
    for (const l of locales) {
      const pais = paisDoIdioma(l);
      expect(Object.keys(tiposDoPais(pais)).length, `${l} caiu em ${pais}, que não gera nada`).toBeGreaterThan(0);
    }
  });
});
