import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarNome } from "../../src/core/documents/nome.js";
import { gerarDataNascimento, gerarDataAdmissao } from "../../src/core/documents/datas.js";
import { gerarRazaoSocial } from "../../src/core/documents/razao-social.js";
import {
  gerarRaizCnpj,
  cnpjDeRaiz,
  validarCnpj,
} from "../../src/core/documents/cnpj.js";

describe("nome", () => {
  it("gera nome + 2 sobrenomes por padrão", () => {
    const rng = criarRng("nome");
    const n = gerarNome(rng);
    expect(n.split(" ")).toHaveLength(3);
    expect(n).toMatch(/^[A-Za-zÀ-ÿ]+( [A-Za-zÀ-ÿ]+){2}$/);
  });

  it("respeita a quantidade de sobrenomes e é determinístico", () => {
    expect(gerarNome(criarRng("x"), { sobrenomes: 1 }).split(" ")).toHaveLength(2);
    expect(gerarNome(criarRng("y"))).toBe(gerarNome(criarRng("y")));
  });
});

describe("data de nascimento — sempre maior de idade", () => {
  it("formato DD/MM/AAAA válido e idade >= 18 (base 2026)", () => {
    const rng = criarRng("nasc");
    for (let i = 0; i < 500; i++) {
      const d = gerarDataNascimento(rng);
      expect(d).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      const [dia, mes, ano] = d.split("/").map(Number);
      expect(mes).toBeGreaterThanOrEqual(1);
      expect(mes).toBeLessThanOrEqual(12);
      expect(dia).toBeGreaterThanOrEqual(1);
      expect(dia).toBeLessThanOrEqual(31);
      // Nasceu em ano <= 2026-18 = 2008 → sempre 18+.
      expect(ano).toBeLessThanOrEqual(2008);
      expect(ano).toBeGreaterThanOrEqual(2026 - 75);
    }
  });

  it("nunca gera dia inválido para o mês (ex.: 30/02)", () => {
    const rng = criarRng("dias");
    for (let i = 0; i < 2000; i++) {
      const [dia, mes, ano] = gerarDataNascimento(rng).split("/").map(Number);
      const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
      const max = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
      expect(dia).toBeLessThanOrEqual(max);
    }
  });

  it("é determinístico", () => {
    expect(gerarDataNascimento(criarRng("d"))).toBe(gerarDataNascimento(criarRng("d")));
  });
});

describe("data de admissão", () => {
  it("formato válido, dentro dos últimos ~25 anos, determinístico", () => {
    const rng = criarRng("adm");
    for (let i = 0; i < 200; i++) {
      const d = gerarDataAdmissao(rng);
      expect(d).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      const ano = Number(d.split("/")[2]);
      expect(ano).toBeGreaterThanOrEqual(2026 - 25);
      expect(ano).toBeLessThanOrEqual(2026);
    }
    expect(gerarDataAdmissao(criarRng("a"))).toBe(gerarDataAdmissao(criarRng("a")));
  });
});

describe("razão social", () => {
  it("gera <fantasia> <ramo> <tipo> e termina em tipo societário", () => {
    const rng = criarRng("razao");
    for (let i = 0; i < 100; i++) {
      const r = gerarRazaoSocial(rng);
      expect(r.split(" ").length).toBeGreaterThanOrEqual(3);
      expect(r).toMatch(/(Ltda|S\.A\.|ME|EIRELI|EPP)$/);
    }
    expect(gerarRazaoSocial(criarRng("z"))).toBe(gerarRazaoSocial(criarRng("z")));
  });
});

describe("CNPJ mesma raiz (matriz + filiais)", () => {
  it("matriz é 0001 e filiais compartilham a raiz, todos válidos", () => {
    const rng = criarRng("raiz");
    const raiz = gerarRaizCnpj(rng);
    expect(raiz).toHaveLength(8);

    const matriz = cnpjDeRaiz(raiz, 1);
    expect(matriz.slice(0, 8)).toBe(raiz);
    expect(matriz.slice(8, 12)).toBe("0001");
    expect(validarCnpj(matriz)).toBe(true);

    for (let ordem = 2; ordem <= 10; ordem++) {
      const filial = cnpjDeRaiz(raiz, ordem);
      expect(filial.slice(0, 8), "mesma raiz").toBe(raiz);
      expect(filial.slice(8, 12)).toBe(String(ordem).padStart(4, "0"));
      expect(validarCnpj(filial), `filial ${ordem}: ${filial}`).toBe(true);
    }
  });

  it("raiz alfanumérica funciona e respeita excluir ambíguas", () => {
    const rng = criarRng("raiz-alfa");
    for (let i = 0; i < 200; i++) {
      const raiz = gerarRaizCnpj(rng, { alfanumerico: true, excluirAmbiguas: true });
      expect(raiz).toMatch(/^[0-9A-Z]{8}$/);
      expect(raiz).not.toMatch(/[IOUQF]/);
      expect(validarCnpj(cnpjDeRaiz(raiz, 1))).toBe(true);
    }
  });

  it("cnpjDeRaiz aplica máscara e valida raiz/ordem", () => {
    expect(cnpjDeRaiz("12ABC345", 7, { mascara: true })).toMatch(
      /^12\.ABC\.345\/0007-\d{2}$/
    );
    expect(() => cnpjDeRaiz("123", 1)).toThrow();
    expect(() => cnpjDeRaiz("12345678", 100000)).toThrow();
  });

  it("é determinístico", () => {
    expect(gerarRaizCnpj(criarRng("r"))).toBe(gerarRaizCnpj(criarRng("r")));
  });
});
