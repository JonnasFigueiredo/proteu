import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarRg, validarRg, mascararRg } from "../../src/core/documents/rg.js";
import { gerarCnh, validarCnh } from "../../src/core/documents/cnh.js";

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
      const ultimo = v[v.length - 1];
      const trocado = ultimo === "0" ? "1" : "0";
      expect(validar(v.slice(0, -1) + trocado)).toBe(false);
    });
  });
}

testeBasico("RG", gerarRg, validarRg, /^\d{8}[\dX]$/);
testeBasico("CNH", gerarCnh, validarCnh, /^\d{11}$/);

describe("RG — máscara e casos", () => {
  it("RG com máscara: 00.000.000-0 (aceita X no DV)", () => {
    const rng = criarRng("rg-mask");
    const v = gerarRg(rng, { mascara: true });
    expect(v).toMatch(/^\d{2}\.\d{3}\.\d{3}-[\dX]$/);
    expect(validarRg(v)).toBe(true);
    expect(mascararRg("123456789")).toBe("12.345.678-9");
  });

  it("sequência uniforme de CNH é rejeitada", () => {
    expect(validarCnh("11111111111")).toBe(false);
  });
});
