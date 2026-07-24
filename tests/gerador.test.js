import { describe, it, expect } from "vitest";
import { gerar, TIPOS } from "../src/core/gerador.js";
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

  it("todo tipo registrado tem rótulo e função", () => {
    for (const def of Object.values(TIPOS)) {
      expect(typeof def.rotulo).toBe("string");
      expect(typeof def.gerar).toBe("function");
    }
  });
});
