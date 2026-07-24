import { describe, it, expect } from "vitest";
import { criarRng } from "../src/core/seed.js";
import { validarCpf } from "../src/core/documents/cpf.js";
import { validarCnpj } from "../src/core/documents/cnpj.js";
import {
  gerarCpfInvalido,
  gerarCnpjInvalido,
  CPF_UNIFORMES,
  CNPJ_UNIFORMES,
} from "../src/core/invalid/documentos-invalidos.js";
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
import { contarTudo } from "../src/core/text/contagem.js";

describe("documentos inválidos", () => {
  it("CPF inválido é SEMPRE rejeitado pela validação, com motivo", () => {
    const rng = criarRng("cpf-inv");
    const motivos = new Set();
    for (let i = 0; i < 500; i++) {
      const { valor, motivo } = gerarCpfInvalido(rng);
      expect(validarCpf(valor), `deveria ser inválido: ${valor}`).toBe(false);
      motivos.add(motivo);
    }
    expect(motivos).toEqual(new Set(["dv-errado", "sequencia-uniforme"]));
  });

  it("CNPJ inválido é SEMPRE rejeitado", () => {
    const rng = criarRng("cnpj-inv");
    for (let i = 0; i < 500; i++) {
      const { valor } = gerarCnpjInvalido(rng);
      expect(validarCnpj(valor), `deveria ser inválido: ${valor}`).toBe(false);
    }
  });

  it("inválidos com máscara também são rejeitados", () => {
    const rng = criarRng("mask-inv");
    for (let i = 0; i < 100; i++) {
      expect(validarCpf(gerarCpfInvalido(rng, { mascara: true }).valor)).toBe(false);
      expect(validarCnpj(gerarCnpjInvalido(rng, { mascara: true }).valor)).toBe(false);
    }
  });

  it("sequências uniformes listadas realmente são inválidas", () => {
    for (const c of CPF_UNIFORMES) expect(validarCpf(c)).toBe(false);
    for (const c of CNPJ_UNIFORMES) expect(validarCnpj(c)).toBe(false);
  });

  it("é determinístico", () => {
    const a = criarRng("d");
    const b = criarRng("d");
    const la = Array.from({ length: 10 }, () => gerarCpfInvalido(a).valor);
    const lb = Array.from({ length: 10 }, () => gerarCpfInvalido(b).valor);
    expect(la).toEqual(lb);
  });
});

describe("fronteiras Unicode", () => {
  it("todo item tem rótulo, valor e nota", () => {
    for (const item of FRONTEIRAS_UNICODE) {
      expect(item.rotulo).toBeTruthy();
      expect(typeof item.valor).toBe("string");
      expect(item.nota).toBeTruthy();
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
  it("XSS, SQLI e FORMATO têm rótulo e valor", () => {
    for (const grupo of [XSS, SQLI, FORMATO]) {
      expect(grupo.length).toBeGreaterThan(0);
      for (const p of grupo) {
        expect(p.rotulo).toBeTruthy();
        expect(p.valor).toBeTruthy();
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
