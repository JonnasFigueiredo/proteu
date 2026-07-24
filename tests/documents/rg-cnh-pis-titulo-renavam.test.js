import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarRg, validarRg, mascararRg } from "../../src/core/documents/rg.js";
import { gerarCnh, validarCnh } from "../../src/core/documents/cnh.js";
import { gerarPis, validarPis, mascararPis } from "../../src/core/documents/pis.js";
import { gerarTitulo, validarTitulo } from "../../src/core/documents/titulo.js";
import { gerarRenavam, validarRenavam } from "../../src/core/documents/renavam.js";

// Round-trip: tudo que o gerador produz, o validador do mesmo módulo aceita.
// Determinismo: mesma seed → mesma lista.
function testeBasico(nome, gerar, validar, formato) {
  describe(nome, () => {
    it("round-trip: gerados são válidos e no formato esperado", () => {
      const rng = criarRng(`${nome}-seed`);
      for (let i = 0; i < 300; i++) {
        const v = gerar(rng);
        expect(v, `valor gerado: ${v}`).toMatch(formato);
        expect(validar(v), `deveria ser válido: ${v}`).toBe(true);
      }
    });

    it("é determinístico", () => {
      const a = criarRng("det");
      const b = criarRng("det");
      expect(Array.from({ length: 10 }, () => gerar(a)))
        .toEqual(Array.from({ length: 10 }, () => gerar(b)));
    });

    it("DV alterado invalida", () => {
      const rng = criarRng("dv-errado");
      const v = gerar(rng);
      // Troca o último caractere por outro diferente.
      const ultimo = v[v.length - 1];
      const trocado = ultimo === "0" ? "1" : "0";
      expect(validar(v.slice(0, -1) + trocado)).toBe(false);
    });
  });
}

testeBasico("RG", gerarRg, validarRg, /^\d{8}[\dX]$/);
testeBasico("CNH", gerarCnh, validarCnh, /^\d{11}$/);
testeBasico("PIS", gerarPis, validarPis, /^\d{11}$/);
testeBasico("Título de eleitor", gerarTitulo, validarTitulo, /^\d{12}$/);
testeBasico("RENAVAM", gerarRenavam, validarRenavam, /^\d{11}$/);

describe("máscaras e casos específicos", () => {
  it("RG com máscara: 00.000.000-0 (aceita X no DV)", () => {
    const rng = criarRng("rg-mask");
    const v = gerarRg(rng, { mascara: true });
    expect(v).toMatch(/^\d{2}\.\d{3}\.\d{3}-[\dX]$/);
    expect(validarRg(v)).toBe(true);
    expect(mascararRg("123456789")).toBe("12.345.678-9");
  });

  it("PIS com máscara: 000.00000.00-0", () => {
    const rng = criarRng("pis-mask");
    const v = gerarPis(rng, { mascara: true });
    expect(v).toMatch(/^\d{3}\.\d{5}\.\d{2}-\d$/);
    expect(validarPis(v)).toBe(true);
    expect(mascararPis("12345678901")).toBe("123.45678.90-1");
  });

  it("título com máscara: 0000 0000 0000 e UF entre 01 e 28", () => {
    const rng = criarRng("titulo-mask");
    for (let i = 0; i < 100; i++) {
      const v = gerarTitulo(rng);
      const uf = Number(v.slice(8, 10));
      expect(uf).toBeGreaterThanOrEqual(1);
      expect(uf).toBeLessThanOrEqual(28);
    }
    const mascarado = gerarTitulo(criarRng("t"), { mascara: true });
    expect(mascarado).toMatch(/^\d{4} \d{4} \d{4}$/);
    expect(validarTitulo(mascarado)).toBe(true);
  });

  it("título rejeita UF fora de 01..28", () => {
    // 8 dígitos + UF 99 + DVs quaisquer.
    expect(validarTitulo("123456789900")).toBe(false);
    expect(validarTitulo("123456780000")).toBe(false); // UF 00
  });

  it("PIS: caso conhecido válido", () => {
    // 120.16619.11-4 é um exemplo público de PIS estruturalmente válido.
    expect(validarPis("120.16619.11-4")).toBe(true);
    expect(validarPis("120.16619.11-5")).toBe(false);
  });

  it("sequências uniformes são rejeitadas", () => {
    expect(validarCnh("11111111111")).toBe(false);
    expect(validarPis("00000000000")).toBe(false);
    expect(validarRenavam("00000000000")).toBe(false);
  });
});
