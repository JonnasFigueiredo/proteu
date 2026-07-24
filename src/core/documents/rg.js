// RG — Registro Geral (algoritmo SSP-SP, o mais difundido).
//
// 8 dígitos + 1 DV por módulo 11 com pesos 2..9. DV 10 vira "X" e 11 vira "0".
// Outros estados usam regras próprias ou nenhum DV; para massa de teste, a
// estrutura SSP-SP é a convenção aceita pelos validadores comuns.

function calcularDv(digitos) {
  let soma = 0;
  for (let i = 0; i < 8; i++) {
    soma += digitos[i] * (2 + i); // pesos 2..9
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  if (dv === 10) return "X";
  if (dv === 11) return "0";
  return String(dv);
}

/** Aplica a máscara 00.000.000-0. */
export function mascararRg(rg) {
  return rg.replace(/^(.{2})(.{3})(.{3})(.)$/, "$1.$2.$3-$4");
}

/** Valida um RG no formato SSP-SP (com ou sem máscara). */
export function validarRg(valor) {
  const limpo = String(valor).replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{8}[\dX]$/.test(limpo)) return false;
  const digitos = limpo.slice(0, 8).split("").map(Number);
  return calcularDv(digitos) === limpo[8];
}

/**
 * Gera um RG válido (SSP-SP) de forma determinística.
 * @param {object} rng
 * @param {{mascara?: boolean}} [opcoes]
 */
export function gerarRg(rng, { mascara = false } = {}) {
  const digitos = Array.from({ length: 8 }, () => rng.digito());
  const rg = digitos.join("") + calcularDv(digitos);
  return mascara ? mascararRg(rg) : rg;
}
