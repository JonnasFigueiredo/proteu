// PIS/PASEP — 11 dígitos: 10 de base + 1 DV.
//
// DV por módulo 11 com pesos [3,2,9,8,7,6,5,4,3,2]; 11 − resto, e resultado
// 10 ou 11 vira 0.

const PESOS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function calcularDv(base) {
  let soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += base[i] * PESOS[i];
  }
  const dv = 11 - (soma % 11);
  return dv >= 10 ? 0 : dv;
}

/** Aplica a máscara 000.00000.00-0. */
export function mascararPis(pis) {
  return pis.replace(/^(\d{3})(\d{5})(\d{2})(\d)$/, "$1.$2.$3-$4");
}

/** Valida um PIS/PASEP (com ou sem máscara). */
export function validarPis(valor) {
  const limpo = String(valor).replace(/\D/g, "");
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;
  const base = limpo.slice(0, 10).split("").map(Number);
  return calcularDv(base) === Number(limpo[10]);
}

/**
 * Gera um PIS/PASEP válido de forma determinística.
 * @param {object} rng
 * @param {{mascara?: boolean}} [opcoes]
 */
export function gerarPis(rng, { mascara = false } = {}) {
  let base;
  do {
    base = Array.from({ length: 10 }, () => rng.digito());
  } while (base.every((d) => d === base[0]));
  const pis = base.join("") + calcularDv(base);
  return mascara ? mascararPis(pis) : pis;
}
