import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarIe, validarIe, mascararIe } from "../../src/core/documents/ie.js";
import { gerarCep, mascararCep, ufDoCep, FAIXAS_UF } from "../../src/core/documents/cep.js";
import { gerarTelefone, validarTelefone, mascararTelefone, DDDS_VALIDOS } from "../../src/core/documents/telefone.js";
import { gerarPlaca, validarPlaca } from "../../src/core/documents/placa.js";

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

  it("é determinístico", () => {
    expect(gerarIe(criarRng("x"))).toBe(gerarIe(criarRng("x")));
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
      const cep = gerarCep(rng);
      expect(ufDoCep(cep)).not.toBeNull();
    }
  });

  it("UF desconhecida lança erro", () => {
    expect(() => gerarCep(criarRng("z"), { uf: "XX" })).toThrow();
  });

  it("máscara 00000-000 e ufDoCep com exemplos reais", () => {
    expect(mascararCep("01310100")).toBe("01310-100");
    expect(ufDoCep("01310-100")).toBe("SP"); // Av. Paulista
    expect(ufDoCep("70040-010")).toBe("DF"); // Esplanada
    expect(ufDoCep("90010-000")).toBe("RS");
    expect(ufDoCep("123")).toBeNull();
  });

  it("é determinístico", () => {
    expect(gerarCep(criarRng("c"), { uf: "SP" }))
      .toBe(gerarCep(criarRng("c"), { uf: "SP" }));
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
      expect(v[3]).toMatch(/[6-9]/);
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

  it("rejeita DDD inexistente", () => {
    expect(validarTelefone("20987654321")).toBe(false); // DDD 20 não existe
    expect(validarTelefone("10987654321")).toBe(false);
  });

  it("máscaras de celular e fixo", () => {
    expect(mascararTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(mascararTelefone("1134567890")).toBe("(11) 3456-7890");
    const v = gerarTelefone(criarRng("m"), { celular: true, mascara: true });
    expect(v).toMatch(/^\(\d{2}\) \d{5}-\d{4}$/);
  });

  it("é determinístico", () => {
    expect(gerarTelefone(criarRng("t"))).toBe(gerarTelefone(criarRng("t")));
  });
});

describe("Placa", () => {
  it("Mercosul: LLLNLNN", () => {
    const rng = criarRng("mercosul");
    for (let i = 0; i < 300; i++) {
      const v = gerarPlaca(rng, { padrao: "mercosul" });
      expect(v).toMatch(/^[A-Z]{3}\d[A-Z]\d{2}$/);
      expect(validarPlaca(v)).toBe(true);
    }
  });

  it("antiga: LLLNNNN, com hífen quando mascarada", () => {
    const rng = criarRng("antiga");
    const v = gerarPlaca(rng, { padrao: "antiga" });
    expect(v).toMatch(/^[A-Z]{3}\d{4}$/);
    const m = gerarPlaca(criarRng("antiga2"), { padrao: "antiga", mascara: true });
    expect(m).toMatch(/^[A-Z]{3}-\d{4}$/);
    expect(validarPlaca(m)).toBe(true);
  });

  it("rejeita formatos errados", () => {
    expect(validarPlaca("AB12345")).toBe(false);
    expect(validarPlaca("ABCD123")).toBe(false);
    expect(validarPlaca("ABC12D3")).toBe(false);
  });

  it("é determinístico", () => {
    expect(gerarPlaca(criarRng("p"))).toBe(gerarPlaca(criarRng("p")));
  });
});
