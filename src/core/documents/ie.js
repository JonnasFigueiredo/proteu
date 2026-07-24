// Inscrição Estadual — algoritmo de SÃO PAULO (12 dígitos, 2 DVs embutidos).
//
// Cada UF tem regra própria; SP é a mais usada em massa de teste e a única
// implementada por ora (as demais ficam no backlog). Estrutura:
//   D1..D8  DV1  D10 D11  DV2
// DV1 (9ª posição): pesos [1,3,4,5,6,7,8,10] sobre D1..D8; dv = (soma % 11) % 10.
// DV2 (12ª posição): pesos [3,2,10,9,8,7,6,5,4,3,2] sobre as 11 primeiras;
// dv = (soma % 11) % 10.

const PESOS_DV1 = [1, 3, 4, 5, 6, 7, 8, 10];
const PESOS_DV2 = [3, 2, 10, 9, 8, 7, 6, 5, 4, 3, 2];

function dvMod11Trunc(digitos, pesos) {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) {
    soma += digitos[i] * pesos[i];
  }
  return (soma % 11) % 10;
}

/** Aplica a máscara 000.000.000.000. */
export function mascararIe(ie) {
  return ie.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3.$4");
}

/** Valida uma Inscrição Estadual de SP (com ou sem máscara). */
export function validarIe(valor) {
  const limpo = String(valor).replace(/\D/g, "");
  if (limpo.length !== 12) return false;
  const d = limpo.split("").map(Number);
  const dv1 = dvMod11Trunc(d.slice(0, 8), PESOS_DV1);
  const dv2 = dvMod11Trunc(d.slice(0, 11), PESOS_DV2);
  return dv1 === d[8] && dv2 === d[11];
}

/**
 * Gera uma Inscrição Estadual de SP válida de forma determinística.
 * @param {object} rng
 * @param {{mascara?: boolean}} [opcoes]
 */
export function gerarIe(rng, { mascara = false } = {}) {
  const base8 = Array.from({ length: 8 }, () => rng.digito());
  const dv1 = dvMod11Trunc(base8, PESOS_DV1);
  const d10 = rng.digito();
  const d11 = rng.digito();
  const onze = [...base8, dv1, d10, d11];
  const dv2 = dvMod11Trunc(onze, PESOS_DV2);
  const ie = onze.join("") + dv2;
  return mascara ? mascararIe(ie) : ie;
}
