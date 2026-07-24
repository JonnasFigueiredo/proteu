// CNH — Carteira Nacional de Habilitação.
//
// 11 dígitos: 9 de base + 2 DVs (algoritmo DENATRAN).
// DV1: pesos 9..1 sobre a base; resto do módulo 11 (>= 10 vira 0 e liga um
// desconto de 2 no DV2 — peculiaridade histórica do algoritmo).
// DV2: pesos 1..9 sobre a base; aplica o desconto; >= 10 vira 0.

function calcularDvs(base) {
  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += base[i] * (9 - i); // pesos 9,8,...,1
  }
  let dv1 = soma1 % 11;
  let desconto = 0;
  if (dv1 >= 10) {
    dv1 = 0;
    desconto = 2;
  }

  let soma2 = 0;
  for (let i = 0; i < 9; i++) {
    soma2 += base[i] * (1 + i); // pesos 1,2,...,9
  }
  let dv2 = (soma2 % 11) - desconto;
  if (dv2 < 0) dv2 += 11;
  if (dv2 >= 10) dv2 = 0;

  return [dv1, dv2];
}

/** Valida uma CNH de 11 dígitos. */
export function validarCnh(valor) {
  const limpo = String(valor).replace(/\D/g, "");
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;
  const base = limpo.slice(0, 9).split("").map(Number);
  const [dv1, dv2] = calcularDvs(base);
  return dv1 === Number(limpo[9]) && dv2 === Number(limpo[10]);
}

/**
 * Gera uma CNH válida de forma determinística. CNH não tem máscara oficial;
 * é sempre exibida como 11 dígitos corridos.
 * @param {object} rng
 */
export function gerarCnh(rng) {
  let base;
  do {
    base = Array.from({ length: 9 }, () => rng.digito());
  } while (base.every((d) => d === base[0]));
  const [dv1, dv2] = calcularDvs(base);
  return base.join("") + dv1 + dv2;
}
