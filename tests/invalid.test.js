import { describe, it, expect } from "vitest";
import {
  FRONTEIRAS_UNICODE,
  valoresUnicode,
} from "../src/core/invalid/unicode.js";
import {
  XSS,
  SQLI,
  FORMATO,
  gerarOverflow,
  todosPayloads,
} from "../src/core/invalid/payloads.js";
import {
  NUMEROS_DATAS,
  ESPACOS_CONTROLE,
  FORMATOS_INVALIDOS,
} from "../src/core/invalid/valores-limite.js";
import { FAMILIAS_LIMITE, todosCasos } from "../src/core/invalid/casos-limite.js";
import { contarTudo } from "../src/core/text/contagem.js";

describe("fronteiras Unicode", () => {
  it("todo item tem rótulo, valor (string) e porquê", () => {
    for (const item of FRONTEIRAS_UNICODE) {
      expect(item.rotulo).toBeTruthy();
      expect(typeof item.valor).toBe("string");
      expect(item.porque).toBeTruthy();
    }
  });

  it("a família ZWJ realmente diverge nas contagens", () => {
    const familia = FRONTEIRAS_UNICODE.find((i) => i.rotulo.includes("ZWJ"));
    const c = contarTudo(familia.valor);
    expect(c.grafemas).toBe(1);
    expect(c.codePoints).toBeGreaterThan(1);
  });

  it("valoresUnicode devolve só as strings", () => {
    expect(valoresUnicode()).toHaveLength(FRONTEIRAS_UNICODE.length);
    expect(valoresUnicode().every((v) => typeof v === "string")).toBe(true);
  });
});

describe("payloads (uso defensivo)", () => {
  it("XSS, SQLI e FORMATO têm rótulo, valor e porquê", () => {
    for (const grupo of [XSS, SQLI, FORMATO]) {
      expect(grupo.length).toBeGreaterThan(0);
      for (const p of grupo) {
        expect(p.rotulo).toBeTruthy();
        expect(p.valor).toBeTruthy();
        expect(p.porque).toBeTruthy();
      }
    }
  });

  it("todosPayloads junta os três grupos", () => {
    expect(todosPayloads()).toHaveLength(XSS.length + SQLI.length + FORMATO.length);
  });

  it("gerarOverflow produz o tamanho pedido", () => {
    expect(gerarOverflow(10000)).toHaveLength(10000);
    expect(gerarOverflow(0)).toBe("");
    expect(gerarOverflow(5, { char: "x" })).toBe("xxxxx");
  });

  it("gerarOverflow rejeita tamanho inválido", () => {
    expect(() => gerarOverflow(-1)).toThrow();
    expect(() => gerarOverflow(1.5)).toThrow();
  });
});

describe("valores-limite (números/datas, espaços/controle, formatos)", () => {
  it("números & datas: string vazia proibida, porquê presente", () => {
    for (const c of NUMEROS_DATAS) {
      expect(typeof c.valor).toBe("string");
      expect(c.valor.length).toBeGreaterThan(0);
      expect(c.porque).toBeTruthy();
    }
  });

  it("espaços & controle carregam de fato caracteres invisíveis", () => {
    const vazio = ESPACOS_CONTROLE.find((c) => c.rotulo === "string vazia");
    expect(vazio.valor).toBe("");
    const nbsp = ESPACOS_CONTROLE.find((c) => c.rotulo.includes("NBSP"));
    expect([...nbsp.valor].map((ch) => ch.codePointAt(0))).toContain(0x00a0);
    const nul = ESPACOS_CONTROLE.find((c) => c.rotulo.includes("NUL"));
    expect([...nul.valor].map((ch) => ch.codePointAt(0))).toContain(0x0000);
    // todos marcados como invisíveis
    expect(ESPACOS_CONTROLE.every((c) => c.invisivel === true)).toBe(true);
  });

  it("formatos inválidos têm rótulo e valor", () => {
    for (const c of FORMATOS_INVALIDOS) {
      expect(c.rotulo).toBeTruthy();
      expect(typeof c.valor).toBe("string");
    }
  });
});

describe("casos-limite (assembler das famílias)", () => {
  it("expõe as 5 famílias esperadas, na ordem", () => {
    expect(FAMILIAS_LIMITE.map((f) => f.id)).toEqual([
      "unicode", "seguranca", "numeros", "espacos", "formatos",
    ]);
  });

  it("toda família tem tituloKey e ao menos um caso", () => {
    for (const fam of FAMILIAS_LIMITE) {
      expect(fam.tituloKey).toMatch(/^lim_fam_/);
      expect(fam.casos.length).toBeGreaterThan(0);
    }
  });

  it("todo caso tem rótulo, valor (string) e porquê", () => {
    for (const c of todosCasos()) {
      expect(c.rotulo).toBeTruthy();
      expect(typeof c.valor).toBe("string");
      expect(c.porque).toBeTruthy();
    }
  });

  it("só a família de segurança é marcada como perigo; só a Unicode conta", () => {
    expect(FAMILIAS_LIMITE.find((f) => f.perigo).id).toBe("seguranca");
    expect(FAMILIAS_LIMITE.find((f) => f.contar).id).toBe("unicode");
  });
});
