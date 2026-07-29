// Regra de país no perfil completo.
//
// Ao gerar TODOS os documentos de uma vez, o risco é vazar documento de outro
// país (um CPF aparecendo num perfil dos EUA) ou gerar valor que não passa no
// validador oficial. Estes testes travam as duas coisas para os 9 países.

import { describe, it, expect } from "vitest";
import { gerarPersona } from "../src/core/persona.js";
import { PAISES, tiposDoPais } from "../src/core/gerador.js";

import { validarCpf } from "../src/core/documents/cpf.js";
import { validarCnpj } from "../src/core/documents/cnpj.js";
import { validarSsn } from "../src/core/documents/us.js";
import { validarCuit, validarCuil } from "../src/core/documents/ar.js";
import { validarSin, validarBn } from "../src/core/documents/ca.js";
import { validarIdCardCN, validarUscc } from "../src/core/documents/cn.js";
import { validarNationalIdSA, validarVatSA, validarCrSA } from "../src/core/documents/sa.js";
import { validarCurpMX, validarRfcMX, validarNssMX } from "../src/core/documents/mx.js";
import { validarAadhaar, validarPan, validarGstin } from "../src/core/documents/in.js";
import { validarIbanDE, validarSteuerId, validarUstId } from "../src/core/documents/de.js";

const CODIGOS = Object.keys(PAISES);

const cfg = (pais, mascara = true, contador = 0) => ({
  pais, seed: "regra-pais", contador, documentos: {
    mascara, cnpjAlfanumerico: false, cnpjExcluirAmbiguas: false,
  },
});

// Validador oficial de cada tipo, por país. O que não estiver aqui não tem
// dígito verificador (nome, data, CEP…) e é coberto pelo teste de formato.
const VALIDADORES = {
  br: { cpf: validarCpf, cnpj: validarCnpj },
  us: { ssn: validarSsn },
  ar: { cuit: validarCuit, cuil: validarCuil },
  ca: { sin: validarSin, bn: validarBn },
  cn: { idCard: validarIdCardCN, uscc: validarUscc },
  sa: { nationalId: validarNationalIdSA, vat: validarVatSA, cr: validarCrSA },
  mx: { curp: validarCurpMX, rfc: validarRfcMX, rfcMoral: validarRfcMX, nss: validarNssMX },
  in: { aadhaar: validarAadhaar, pan: validarPan, gstin: validarGstin },
  de: { iban: validarIbanDE, steuerId: validarSteuerId, ustId: validarUstId },
};

describe("regra de país — nada vaza de outro país", () => {
  for (const pais of CODIGOS) {
    it(`${pais}: todo campo do perfil vem do registro do próprio país`, () => {
      const perfil = gerarPersona(cfg(pais));
      const doPais = new Set(Object.keys(tiposDoPais(pais)));
      for (const campo of perfil.campos) {
        // O e-mail é derivado (não é um tipo de país) — único com chave nula.
        if (campo.chaveTipo === null) {
          expect(campo.slot).toBe("email");
          continue;
        }
        expect(doPais.has(campo.chaveTipo), `${pais}: ${campo.chaveTipo} não é deste país`).toBe(true);
      }
      expect(perfil.pais).toBe(pais);
    });

    it(`${pais}: cobre todos os tipos do país (menos os sequenciais)`, () => {
      const perfil = gerarPersona(cfg(pais));
      const esperados = Object.entries(tiposDoPais(pais))
        .filter(([, def]) => !def.raiz)
        .map(([chave]) => chave);
      const gerados = perfil.campos.filter((c) => c.chaveTipo).map((c) => c.chaveTipo);
      expect(new Set(gerados)).toEqual(new Set(esperados));
    });

    it(`${pais}: nenhum campo repetido`, () => {
      const perfil = gerarPersona(cfg(pais));
      const chaves = perfil.campos.filter((c) => c.chaveTipo).map((c) => c.chaveTipo);
      expect(chaves.length).toBe(new Set(chaves).size);
    });
  }
});

describe("regra de país — documentos válidos no validador oficial", () => {
  for (const pais of CODIGOS) {
    for (const mascara of [true, false]) {
      it(`${pais}: DV correto com máscara=${mascara}`, () => {
        const validadores = VALIDADORES[pais] || {};
        // Várias gerações: um DV errado costuma aparecer só em alguns sorteios.
        for (let i = 0; i < 30; i++) {
          const perfil = gerarPersona(cfg(pais, mascara, i));
          for (const campo of perfil.campos) {
            const validar = validadores[campo.chaveTipo];
            if (!validar) continue;
            expect(validar(campo.valor), `${pais}.${campo.chaveTipo} = ${campo.valor}`).toBe(true);
          }
        }
      });
    }
  }
});

describe("regra de país — trocar de país não deixa resíduo", () => {
  it("o mesmo contador em países diferentes gera perfis independentes", () => {
    const br = gerarPersona(cfg("br", true, 5));
    const us = gerarPersona(cfg("us", true, 5));
    // Nenhum valor do perfil brasileiro pode reaparecer no americano.
    const valoresBr = new Set(br.campos.map((c) => c.valor));
    for (const campo of us.campos) {
      expect(valoresBr.has(campo.valor), `vazou: ${campo.valor}`).toBe(false);
    }
  });

  it("voltar ao país anterior com o mesmo contador reproduz o perfil", () => {
    expect(gerarPersona(cfg("br", true, 5))).toEqual(gerarPersona(cfg("br", true, 5)));
  });
});

describe("perfil — categorias e essenciais para a UI", () => {
  for (const pais of CODIGOS) {
    it(`${pais}: todo campo tem categoria e flag essencial`, () => {
      for (const campo of gerarPersona(cfg(pais)).campos) {
        expect(["Pessoa", "Empresa"]).toContain(campo.categoria);
        expect(typeof campo.essencial).toBe("boolean");
      }
    });

    it(`${pais}: os essenciais incluem nome, e-mail e documento principal`, () => {
      const essenciais = gerarPersona(cfg(pais)).campos.filter((c) => c.essencial);
      const slots = essenciais.map((c) => c.slot);
      expect(slots).toContain("nome");
      expect(slots).toContain("email");
      expect(slots).toContain("documento");
    });
  }
});
