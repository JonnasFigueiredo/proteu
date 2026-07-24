import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarCnpj,
  validarCnpj,
  mascararCnpj,
} from "../../src/core/documents/cnpj.js";

describe("validarCnpj — caso oficial SERPRO", () => {
  it("aceita 12.ABC.345/01DE-35 (alfanumérico)", () => {
    expect(validarCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(validarCnpj("12ABC34501DE35")).toBe(true);
  });

  it("rejeita o mesmo CNPJ com DV errado", () => {
    expect(validarCnpj("12.ABC.345/01DE-34")).toBe(false);
    expect(validarCnpj("12ABC34501DE00")).toBe(false);
  });
});

describe("validarCnpj — numérico (retrocompatível)", () => {
  it("aceita CNPJ numérico válido conhecido", () => {
    expect(validarCnpj("11.222.333/0001-81")).toBe(true);
    expect(validarCnpj("11222333000181")).toBe(true);
  });

  it("rejeita DV numérico errado", () => {
    expect(validarCnpj("11.222.333/0001-80")).toBe(false);
  });
});

describe("validarCnpj — rejeições estruturais", () => {
  it("rejeita tamanho diferente de 14", () => {
    expect(validarCnpj("12ABC34501DE3")).toBe(false);
    expect(validarCnpj("12ABC34501DE355")).toBe(false);
  });

  it("rejeita DV não numérico", () => {
    expect(validarCnpj("12ABC34501DEA5")).toBe(false);
  });

  it("rejeita caractere fora de [0-9A-Z] na base", () => {
    expect(validarCnpj("12-BC.34501DE35")).toBe(false);
  });

  it("rejeita sequências uniformes", () => {
    expect(validarCnpj("00000000000000")).toBe(false);
    expect(validarCnpj("AAAAAAAAAAAA00")).toBe(false);
  });
});

describe("gerarCnpj — numérico (default)", () => {
  it("gera CNPJs numéricos válidos", () => {
    const rng = criarRng("cnpj-num");
    for (let i = 0; i < 500; i++) {
      const c = gerarCnpj(rng);
      expect(c).toMatch(/^\d{14}$/);
      expect(validarCnpj(c)).toBe(true);
    }
  });
});

describe("gerarCnpj — alfanumérico", () => {
  it("gera CNPJs alfanuméricos válidos com DV numérico", () => {
    const rng = criarRng("cnpj-alfa");
    let viuLetra = false;
    for (let i = 0; i < 500; i++) {
      const c = gerarCnpj(rng, { alfanumerico: true });
      expect(c).toMatch(/^[0-9A-Z]{12}\d{2}$/);
      expect(validarCnpj(c)).toBe(true);
      if (/[A-Z]/.test(c.slice(0, 12))) viuLetra = true;
    }
    expect(viuLetra).toBe(true); // deve realmente usar letras
  });

  it("excluirAmbiguas remove I, O, U, Q, F da base", () => {
    const rng = criarRng("cnpj-sem-ambiguas");
    for (let i = 0; i < 1000; i++) {
      const base = gerarCnpj(rng, {
        alfanumerico: true,
        excluirAmbiguas: true,
      }).slice(0, 12);
      expect(base).not.toMatch(/[IOUQF]/);
    }
  });
});

describe("gerarCnpj — determinismo e máscara", () => {
  it("é determinístico para a mesma seed", () => {
    const a = criarRng("seed-cnpj");
    const b = criarRng("seed-cnpj");
    const listaA = Array.from({ length: 20 }, () =>
      gerarCnpj(a, { alfanumerico: true })
    );
    const listaB = Array.from({ length: 20 }, () =>
      gerarCnpj(b, { alfanumerico: true })
    );
    expect(listaA).toEqual(listaB);
  });

  it("respeita a opção de máscara", () => {
    const rng = criarRng("mascara-cnpj");
    const semMascara = gerarCnpj(rng, { alfanumerico: true });
    const rng2 = criarRng("mascara-cnpj");
    const comMascara = gerarCnpj(rng2, { alfanumerico: true, mascara: true });
    expect(comMascara).toMatch(/^.{2}\..{3}\..{3}\/.{4}-\d{2}$/);
    expect(comMascara.replace(/[.\-/]/g, "")).toBe(semMascara);
  });
});

describe("mascararCnpj", () => {
  it("formata 14 posições", () => {
    expect(mascararCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });
});
