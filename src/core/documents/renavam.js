// RENAVAM — Registro Nacional de Veículos Automotores.
//
// 11 dígitos: 10 de base + 1 DV. O DV aplica os pesos [2,3,4,5,6,7,8,9,2,3]
// sobre a base INVERTIDA; dv = 11 − (soma % 11), e resultado >= 10 vira 0.

const PESOS = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3];

function calcularDv(base) {
  const invertida = [...base].reverse();
  let soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += invertida[i] * PESOS[i];
  }
  const dv = 11 - (soma % 11);
  return dv >= 10 ? 0 : dv;
}

/** Valida um RENAVAM de 11 dígitos. */
export function validarRenavam(valor) {
  const limpo = String(valor).replace(/\D/g, "");
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;
  const base = limpo.slice(0, 10).split("").map(Number);
  return calcularDv(base) === Number(limpo[10]);
}

/**
 * Gera um RENAVAM válido de forma determinística (sem máscara oficial).
 * @param {object} rng
 */
export function gerarRenavam(rng) {
  let base;
  do {
    base = Array.from({ length: 10 }, () => rng.digito());
  } while (base.every((d) => d === base[0]));
  return base.join("") + calcularDv(base);
}
