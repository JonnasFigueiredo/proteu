// Massa de documentos INVÁLIDOS — para exercitar a rejeição da validação.
//
// Dois tipos de invalidez, ambos comuns em bug de produção:
//   - DV errado: a estrutura está certa, só o dígito verificador não fecha
//     (pega validador que confere só o formato/tamanho, não o DV).
//   - sequência uniforme: 000.000.000-00 etc. passam no módulo 11 mas nunca são
//     documentos reais (pega validador que esquece esse caso).

import { gerarCpf, mascararCpf } from "../documents/cpf.js";
import { gerarCnpj, mascararCnpj } from "../documents/cnpj.js";

/** Sequências uniformes clássicas que enganam o módulo 11. */
export const CPF_UNIFORMES = [
  "00000000000", "11111111111", "22222222222", "33333333333",
  "44444444444", "55555555555", "66666666666", "77777777777",
  "88888888888", "99999999999",
];

export const CNPJ_UNIFORMES = [
  "00000000000000", "11111111111111", "99999999999999",
];

/** Troca um dígito por outro diferente (garante alteração). */
function outroDigito(rng, atual) {
  let d;
  do {
    d = String(rng.digito());
  } while (d === atual);
  return d;
}

/**
 * Gera um CPF inválido de forma determinística.
 * @returns {{ valor: string, motivo: "dv-errado"|"sequencia-uniforme" }}
 */
export function gerarCpfInvalido(rng, { mascara = false } = {}) {
  if (rng.numero() < 0.5) {
    const valido = gerarCpf(rng, { mascara: false });
    const ultimo = valido[valido.length - 1];
    const corrompido = valido.slice(0, -1) + outroDigito(rng, ultimo);
    return { valor: mascara ? mascararCpf(corrompido) : corrompido, motivo: "dv-errado" };
  }
  const base = rng.escolher(CPF_UNIFORMES);
  return { valor: mascara ? mascararCpf(base) : base, motivo: "sequencia-uniforme" };
}

/**
 * Gera um CNPJ inválido de forma determinística.
 * @returns {{ valor: string, motivo: "dv-errado"|"sequencia-uniforme" }}
 */
export function gerarCnpjInvalido(rng, { mascara = false } = {}) {
  if (rng.numero() < 0.5) {
    const valido = gerarCnpj(rng, { mascara: false });
    const ultimo = valido[valido.length - 1];
    const corrompido = valido.slice(0, -1) + outroDigito(rng, ultimo);
    return { valor: mascara ? mascararCnpj(corrompido) : corrompido, motivo: "dv-errado" };
  }
  const base = rng.escolher(CNPJ_UNIFORMES);
  return { valor: mascara ? mascararCnpj(base) : base, motivo: "sequencia-uniforme" };
}
