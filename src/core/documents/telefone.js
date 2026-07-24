// Telefone brasileiro — fixo e celular com DDD válido.
//
// DDDs realmente atribuídos pela Anatel (não é qualquer 2 dígitos).
// Celular: 9 dígitos começando em 9 (2º dígito 6–9, faixa real de móvel).
// Fixo: 8 dígitos começando em 2–5.

export const DDDS_VALIDOS = [
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
];

/** Aplica a máscara (00) 00000-0000 ou (00) 0000-0000. */
export function mascararTelefone(telefone) {
  const limpo = String(telefone).replace(/\D/g, "");
  if (limpo.length === 11) {
    return limpo.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  return limpo.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
}

/** Valida DDD + estrutura (celular 11 dígitos com 9; fixo 10 com 2–5). */
export function validarTelefone(valor) {
  const limpo = String(valor).replace(/\D/g, "");
  if (limpo.length !== 10 && limpo.length !== 11) return false;
  const ddd = Number(limpo.slice(0, 2));
  if (!DDDS_VALIDOS.includes(ddd)) return false;
  if (limpo.length === 11) {
    return limpo[2] === "9" && /[6-9]/.test(limpo[3]);
  }
  return /[2-5]/.test(limpo[2]);
}

/**
 * Gera um telefone válido de forma determinística.
 * @param {object} rng
 * @param {{celular?: boolean, mascara?: boolean}} [opcoes]
 */
export function gerarTelefone(rng, { celular = true, mascara = false } = {}) {
  const ddd = rng.escolher(DDDS_VALIDOS);
  let numero;
  if (celular) {
    const segundo = rng.inteiro(6, 9);
    const resto = Array.from({ length: 7 }, () => rng.digito()).join("");
    numero = `9${segundo}${resto}`;
  } else {
    const primeiro = rng.inteiro(2, 5);
    const resto = Array.from({ length: 7 }, () => rng.digito()).join("");
    numero = `${primeiro}${resto}`;
  }
  const completo = String(ddd) + numero;
  return mascara ? mascararTelefone(completo) : completo;
}
