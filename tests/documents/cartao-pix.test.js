import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarCartao,
  validarLuhn,
  mascararCartao,
  BANDEIRAS,
} from "../../src/core/documents/cartao.js";
import {
  gerarPix,
  formatoDaChave,
  FORMATOS_PIX,
} from "../../src/core/documents/pix.js";
import { validarCpf } from "../../src/core/documents/cpf.js";
import { validarTelefone } from "../../src/core/documents/telefone.js";

describe("Cartão de crédito", () => {
  it("toda bandeira gera número com prefixo, tamanho e Luhn corretos", () => {
    const rng = criarRng("cartao");
    for (const [chave, def] of Object.entries(BANDEIRAS)) {
      for (let i = 0; i < 100; i++) {
        const n = gerarCartao(rng, { bandeira: chave });
        expect(n).toHaveLength(def.tamanho);
        expect(def.prefixos.some((p) => n.startsWith(p)),
          `${chave}: ${n} não começa com prefixo esperado`).toBe(true);
        expect(validarLuhn(n), `${chave}: ${n} falhou no Luhn`).toBe(true);
      }
    }
  });

  it("validarLuhn: casos conhecidos", () => {
    expect(validarLuhn("4111111111111111")).toBe(true); // Visa clássico de teste
    expect(validarLuhn("4111111111111112")).toBe(false);
    expect(validarLuhn("378282246310005")).toBe(true); // Amex de teste
    expect(validarLuhn("123")).toBe(false);
  });

  it("máscara: 4-4-4-4 e 4-6-5 para Amex", () => {
    expect(mascararCartao("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(mascararCartao("378282246310005")).toBe("3782 822463 10005");
    const m = gerarCartao(criarRng("cm"), { bandeira: "visa", mascara: true });
    expect(m).toMatch(/^\d{4} \d{4} \d{4} \d{4}$/);
    expect(validarLuhn(m)).toBe(true);
  });

  it("sem bandeira, sorteia uma válida; bandeira inexistente lança", () => {
    const rng = criarRng("sorteio");
    for (let i = 0; i < 50; i++) {
      expect(validarLuhn(gerarCartao(rng))).toBe(true);
    }
    expect(() => gerarCartao(rng, { bandeira: "clube-z" })).toThrow();
  });

  it("é determinístico", () => {
    expect(gerarCartao(criarRng("d"))).toBe(gerarCartao(criarRng("d")));
  });
});

describe("Chave Pix", () => {
  it("cpf: gera CPF válido sem máscara", () => {
    const rng = criarRng("pix-cpf");
    for (let i = 0; i < 100; i++) {
      const chave = gerarPix(rng, { formato: "cpf" });
      expect(formatoDaChave(chave)).toBe("cpf");
      expect(validarCpf(chave)).toBe(true);
    }
  });

  it("telefone: E.164 com celular brasileiro válido", () => {
    const rng = criarRng("pix-tel");
    for (let i = 0; i < 100; i++) {
      const chave = gerarPix(rng, { formato: "telefone" });
      expect(chave).toMatch(/^\+55\d{11}$/);
      expect(validarTelefone(chave.slice(3))).toBe(true);
    }
  });

  it("email: domínio reservado a teste (nunca entrega de verdade)", () => {
    const rng = criarRng("pix-mail");
    for (let i = 0; i < 100; i++) {
      const chave = gerarPix(rng, { formato: "email" });
      expect(formatoDaChave(chave)).toBe("email");
      expect(chave).toMatch(/@(example\.com|example\.org|test\.example)$/);
    }
  });

  it("aleatoria: UUID v4 com variante correta", () => {
    const rng = criarRng("pix-uuid");
    for (let i = 0; i < 100; i++) {
      const chave = gerarPix(rng, { formato: "aleatoria" });
      expect(formatoDaChave(chave)).toBe("aleatoria");
      expect(chave[14]).toBe("4");
      expect("89ab").toContain(chave[19]);
    }
  });

  it("sem formato, sorteia entre os 4 e todos aparecem", () => {
    const rng = criarRng("pix-livre");
    const vistos = new Set();
    for (let i = 0; i < 200; i++) {
      const f = formatoDaChave(gerarPix(rng));
      expect(FORMATOS_PIX).toContain(f);
      vistos.add(f);
    }
    expect(vistos.size).toBe(4);
  });

  it("formato inexistente lança; é determinístico", () => {
    expect(() => gerarPix(criarRng("e"), { formato: "cheque" })).toThrow();
    expect(gerarPix(criarRng("d"))).toBe(gerarPix(criarRng("d")));
  });
});
