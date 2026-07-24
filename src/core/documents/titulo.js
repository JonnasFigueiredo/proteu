// Título de eleitor — 12 dígitos: 8 sequenciais + 2 de UF (01..28) + 2 DVs.
//
// DV1: pesos 2..9 sobre os 8 primeiros; DV2: pesos 7,8,9 sobre UF1, UF2 e DV1.
// Regra especial do TSE: resto 0 vira 1 para SP (01) e MG (02) e 0 para as
// demais UFs; resto 10 vira 0.

// Códigos de UF do TSE: 01=SP, 02=MG, 03=RJ ... 28=Exterior(ZZ).
const UF_MIN = 1;
const UF_MAX = 28;

function ajustarResto(resto, codigoUf) {
  if (resto === 10) return 0;
  if (resto === 0) return codigoUf <= 2 ? 1 : 0; // SP/MG
  return resto;
}

function calcularDvs(sequencial, codigoUf) {
  let soma1 = 0;
  for (let i = 0; i < 8; i++) {
    soma1 += sequencial[i] * (2 + i); // pesos 2..9
  }
  const dv1 = ajustarResto(soma1 % 11, codigoUf);

  const uf1 = Math.floor(codigoUf / 10);
  const uf2 = codigoUf % 10;
  const soma2 = uf1 * 7 + uf2 * 8 + dv1 * 9;
  const dv2 = ajustarResto(soma2 % 11, codigoUf);

  return [dv1, dv2];
}

/** Aplica a máscara 0000 0000 0000. */
export function mascararTitulo(titulo) {
  return titulo.replace(/^(\d{4})(\d{4})(\d{4})$/, "$1 $2 $3");
}

/** Valida um título de eleitor (com ou sem máscara). */
export function validarTitulo(valor) {
  const limpo = String(valor).replace(/\D/g, "");
  if (limpo.length !== 12) return false;
  const codigoUf = Number(limpo.slice(8, 10));
  if (codigoUf < UF_MIN || codigoUf > UF_MAX) return false;
  const sequencial = limpo.slice(0, 8).split("").map(Number);
  const [dv1, dv2] = calcularDvs(sequencial, codigoUf);
  return dv1 === Number(limpo[10]) && dv2 === Number(limpo[11]);
}

/**
 * Gera um título de eleitor válido de forma determinística.
 * @param {object} rng
 * @param {{mascara?: boolean}} [opcoes]
 */
export function gerarTitulo(rng, { mascara = false } = {}) {
  const sequencial = Array.from({ length: 8 }, () => rng.digito());
  const codigoUf = rng.inteiro(UF_MIN, UF_MAX);
  const [dv1, dv2] = calcularDvs(sequencial, codigoUf);
  const titulo =
    sequencial.join("") +
    String(codigoUf).padStart(2, "0") +
    String(dv1) +
    String(dv2);
  return mascara ? mascararTitulo(titulo) : titulo;
}
