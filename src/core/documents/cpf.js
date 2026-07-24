// CPF — Cadastro de Pessoa Física.
//
// 11 dígitos: 9 de base + 2 dígitos verificadores (DV) por módulo 11.
// Geração determinística (recebe um rng de core/seed.js).

/** Calcula um DV de CPF por módulo 11 sobre os dígitos já existentes. */
function calcularDv(digitos) {
  // Pesos decrescem a partir de (quantidade de dígitos + 1).
  let peso = digitos.length + 1;
  let soma = 0;
  for (const d of digitos) {
    soma += d * peso;
    peso--;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Aplica a máscara 000.000.000-00 a uma string de 11 dígitos. */
export function mascararCpf(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/** Remove tudo que não for dígito. */
function apenasDigitos(valor) {
  return String(valor).replace(/\D/g, "");
}

/**
 * Valida um CPF (com ou sem máscara).
 * Rejeita sequências uniformes (000..., 111...), que passam no módulo 11
 * mas nunca são CPFs reais.
 */
export function validarCpf(valor) {
  const limpo = apenasDigitos(valor);
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  const base = limpo.split("").map(Number);
  const dv1 = calcularDv(base.slice(0, 9));
  const dv2 = calcularDv(base.slice(0, 10));
  return dv1 === base[9] && dv2 === base[10];
}

/**
 * Gera um CPF válido de forma determinística.
 * @param {object} rng - gerador de core/seed.js
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.mascara=false] - retornar com máscara
 * @returns {string}
 */
export function gerarCpf(rng, { mascara = false } = {}) {
  let base;
  // Evita as sequências uniformes; na prática quase nunca repete.
  do {
    base = Array.from({ length: 9 }, () => rng.digito());
  } while (base.every((d) => d === base[0]));

  const dv1 = calcularDv(base);
  const dv2 = calcularDv([...base, dv1]);
  const cpf = [...base, dv1, dv2].join("");
  return mascara ? mascararCpf(cpf) : cpf;
}
