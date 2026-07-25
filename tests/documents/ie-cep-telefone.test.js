import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarIe, validarIe, mascararIe } from "../../src/core/documents/ie.js";
import { gerarCep, mascararCep, ufDoCep, FAIXAS_UF } from "../../src/core/documents/cep.js";
import {
  gerarTelefone,
  validarTelefone,
  mascararTelefone,
  DDDS_VALIDOS,
} from "../../src/core/documents/telefone.js";

describe("Inscrição Estadual (SP)", () => {
  it("round-trip: geradas são válidas", () => {
    const rng = criarRng("ie");
    for (let i = 0; i < 300; i++) {
      const v = gerarIe(rng);
      expect(v).toMatch(/^\d{12}$/);
      expect(validarIe(v)).toBe(true);
    }
  });

  it("caso público conhecido: 110.042.490.114", () => {
    expect(validarIe("110.042.490.114")).toBe(true);
    expect(validarIe("110.042.490.115")).toBe(false);
  });

  it("máscara 000.000.000.000", () => {
    const v = gerarIe(criarRng("ie-m"), { mascara: true });
    expect(v).toMatch(/^\d{3}\.\d{3}\.\d{3}\.\d{3}$/);
    expect(validarIe(v)).toBe(true);
    expect(mascararIe("110042490114")).toBe("110.042.490.114");
  });
});

describe("CEP por região", () => {
  it("CEP gerado para uma UF cai na faixa daquela UF", () => {
    const rng = criarRng("cep");
    for (const uf of Object.keys(FAIXAS_UF)) {
      for (let i = 0; i < 20; i++) {
        const cep = gerarCep(rng, { uf });
        expect(cep).toMatch(/^\d{8}$/);
        expect(ufDoCep(cep), `cep ${cep} deveria ser de ${uf}`).toBe(uf);
      }
    }
  });

  it("sem UF, sorteia uma e continua coerente", () => {
    const rng = criarRng("cep-livre");
    for (let i = 0; i < 100; i++) {
      expect(ufDoCep(gerarCep(rng))).not.toBeNull();
    }
  });

  it("máscara 00000-000 e ufDoCep com exemplos reais", () => {
    expect(mascararCep("01310100")).toBe("01310-100");
    expect(ufDoCep("01310-100")).toBe("SP");
    expect(ufDoCep("70040-010")).toBe("DF");
    expect(ufDoCep("90010-000")).toBe("RS");
  });
});

describe("Telefone", () => {
  it("celular: 11 dígitos, DDD válido, começa com 9[6-9]", () => {
    const rng = criarRng("cel");
    for (let i = 0; i < 300; i++) {
      const v = gerarTelefone(rng, { celular: true });
      expect(v).toMatch(/^\d{11}$/);
      expect(DDDS_VALIDOS).toContain(Number(v.slice(0, 2)));
      expect(v[2]).toBe("9");
      expect(validarTelefone(v)).toBe(true);
    }
  });

  it("fixo: 10 dígitos, começa com 2-5 após o DDD", () => {
    const rng = criarRng("fixo");
    for (let i = 0; i < 300; i++) {
      const v = gerarTelefone(rng, { celular: false });
      expect(v).toMatch(/^\d{10}$/);
      expect(v[2]).toMatch(/[2-5]/);
      expect(validarTelefone(v)).toBe(true);
    }
  });

  it("rejeita DDD inexistente e mascara certo", () => {
    expect(validarTelefone("20987654321")).toBe(false);
    expect(mascararTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(mascararTelefone("1134567890")).toBe("(11) 3456-7890");
  });
});
