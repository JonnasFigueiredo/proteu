import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarCpf, validarCpf, mascararCpf } from "../../src/core/documents/cpf.js";

describe("validarCpf", () => {
  it("aceita CPFs válidos conhecidos (com e sem máscara)", () => {
    expect(validarCpf("529.982.247-25")).toBe(true);
    expect(validarCpf("52998224725")).toBe(true);
  });

  it("rejeita DV errado", () => {
    expect(validarCpf("529.982.247-24")).toBe(false);
  });

  it("rejeita tamanho errado", () => {
    expect(validarCpf("529982247")).toBe(false);
    expect(validarCpf("529982247259")).toBe(false);
  });

  it("rejeita sequências uniformes", () => {
    expect(validarCpf("00000000000")).toBe(false);
    expect(validarCpf("111.111.111-11")).toBe(false);
  });
});

describe("gerarCpf", () => {
  it("gera CPFs válidos", () => {
    const rng = criarRng("cpf-teste");
    for (let i = 0; i < 500; i++) {
      expect(validarCpf(gerarCpf(rng))).toBe(true);
    }
  });

  it("é determinístico para a mesma seed", () => {
    const a = criarRng("mesma-seed");
    const b = criarRng("mesma-seed");
    const listaA = Array.from({ length: 20 }, () => gerarCpf(a));
    const listaB = Array.from({ length: 20 }, () => gerarCpf(b));
    expect(listaA).toEqual(listaB);
  });

  it("respeita a opção de máscara", () => {
    const rng = criarRng("mascara");
    const semMascara = gerarCpf(rng, { mascara: false });
    expect(semMascara).toMatch(/^\d{11}$/);

    const rng2 = criarRng("mascara");
    const comMascara = gerarCpf(rng2, { mascara: true });
    expect(comMascara).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    // Mesma seed → mesmo número por baixo da máscara.
    expect(comMascara.replace(/\D/g, "")).toBe(semMascara);
  });
});

describe("mascararCpf", () => {
  it("formata 11 dígitos", () => {
    expect(mascararCpf("52998224725")).toBe("529.982.247-25");
  });
});
