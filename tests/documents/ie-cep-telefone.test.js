import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarIe, validarIe, mascararIe } from "../../src/core/documents/ie.js";
import { gerarCep, mascararCep, ufDoCep, FAIXAS_UF, CEPS_REAIS, UFS_COM_CEP } from "../../src/core/documents/cep.js";
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

describe("CEP — o gerado precisa EXISTIR, não só ter formato", () => {
  // Bug relatado: o gerador sorteava prefixo dentro da faixa da UF e sufixo de
  // 0 a 999. O formato passava, mas os Correios nunca atribuíram aquele CEP —
  // quem valida contra o ViaCEP recebia "não encontrado" e o teste quebrava
  // por causa da massa, não do sistema testado.
  //
  // Os CEPs da tabela foram conferidos um a um contra o ViaCEP na coleta.
  // Estes testes garantem que o gerador só entrega o que está na tabela.

  const todosReais = new Set(Object.values(CEPS_REAIS).flat());

  it("por padrão, todo CEP gerado vem da tabela verificada", () => {
    const rng = criarRng("cep-real");
    for (const uf of UFS_COM_CEP) {
      for (let i = 0; i < 25; i++) {
        const cep = gerarCep(rng, { uf });
        expect(todosReais.has(cep), `${cep} não está na tabela de CEPs reais`).toBe(true);
      }
    }
  });

  it("sem UF também sai da tabela", () => {
    const rng = criarRng("cep-real-livre");
    for (let i = 0; i < 200; i++) {
      expect(todosReais.has(gerarCep(rng))).toBe(true);
    }
  });

  it("a tabela cobre as 27 UFs e todo CEP bate com a própria faixa", () => {
    expect(UFS_COM_CEP).toHaveLength(27);
    for (const [uf, lista] of Object.entries(CEPS_REAIS)) {
      expect(lista.length, `${uf} sem CEPs`).toBeGreaterThan(0);
      for (const cep of lista) {
        expect(cep, `${cep} fora do formato cru`).toMatch(/^\d{8}$/);
        expect(ufDoCep(cep), `${cep} não classifica como ${uf}`).toBe(uf);
      }
    }
  });

  it("não há CEP repetido entre UFs", () => {
    const todos = Object.values(CEPS_REAIS).flat();
    expect(new Set(todos).size).toBe(todos.length);
  });

  it("a máscara não inventa dígito", () => {
    const rng = criarRng("cep-mascara");
    for (let i = 0; i < 50; i++) {
      const cru = gerarCep(rng, { uf: "SP" });
      const comMascara = mascararCep(cru);
      expect(comMascara).toMatch(/^\d{5}-\d{3}$/);
      expect(comMascara.replace(/\D/g, "")).toBe(cru);
    }
  });

  it("continua determinístico: mesma seed, mesmo CEP", () => {
    const a = gerarCep(criarRng("fixa"), { uf: "MG" });
    const b = gerarCep(criarRng("fixa"), { uf: "MG" });
    expect(b).toBe(a);
  });
});

describe("CEP sintético — inexistente de propósito", () => {
  // Testar o caminho de erro de quem valida CEP é caso de uso legítimo. O que
  // não pode é isso ser o PADRÃO, que era o bug.

  it("respeita a faixa da UF, mesmo sem existir", () => {
    const rng = criarRng("sint");
    for (const uf of Object.keys(FAIXAS_UF)) {
      const cep = gerarCep(rng, { uf, sintetico: true });
      expect(cep).toMatch(/^\d{8}$/);
      expect(ufDoCep(cep)).toBe(uf);
    }
  });

  it("sai da tabela real quase sempre — senão não serviria para o caminho de erro", () => {
    const rng = criarRng("sint-2");
    const reais = new Set(Object.values(CEPS_REAIS).flat());
    let coincidencias = 0;
    for (let i = 0; i < 300; i++) {
      if (reais.has(gerarCep(rng, { uf: "SP", sintetico: true }))) coincidencias++;
    }
    expect(coincidencias).toBeLessThan(5);
  });

  it("UF desconhecida estoura nos dois modos", () => {
    const rng = criarRng("erro");
    expect(() => gerarCep(rng, { uf: "XX" })).toThrow();
    expect(() => gerarCep(rng, { uf: "XX", sintetico: true })).toThrow();
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
