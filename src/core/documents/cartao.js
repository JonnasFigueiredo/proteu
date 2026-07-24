// Cartão de crédito — número por bandeira com dígito verificador Luhn válido.
//
// São números ESTRUTURALMENTE válidos para teste de formulário; não
// correspondem a cartões reais nem passam em autorização.

export const BANDEIRAS = {
  visa: { rotulo: "Visa", prefixos: ["4"], tamanho: 16 },
  mastercard: { rotulo: "Mastercard", prefixos: ["51", "52", "53", "54", "55"], tamanho: 16 },
  amex: { rotulo: "Amex", prefixos: ["34", "37"], tamanho: 15 },
  elo: { rotulo: "Elo", prefixos: ["636368", "438935", "504175", "451416"], tamanho: 16 },
  hipercard: { rotulo: "Hipercard", prefixos: ["606282"], tamanho: 16 },
};

/** Dígito de verificação Luhn para uma sequência sem o DV. */
function digitoLuhn(semDv) {
  let soma = 0;
  // Percorre da direita para a esquerda; dobra as posições ímpares (0-based
  // a partir do fim), pois o DV ocupará a posição par 0.
  for (let i = 0; i < semDv.length; i++) {
    let d = Number(semDv[semDv.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
  }
  return (10 - (soma % 10)) % 10;
}

/** Valida um número de cartão pelo algoritmo de Luhn (com ou sem máscara). */
export function validarLuhn(valor) {
  const limpo = String(valor).replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(limpo)) return false;
  return digitoLuhn(limpo.slice(0, -1)) === Number(limpo[limpo.length - 1]);
}

/** Máscara por grupos: 4-4-4-4 (16) ou 4-6-5 (Amex, 15). */
export function mascararCartao(numero) {
  const limpo = String(numero).replace(/\D/g, "");
  if (limpo.length === 15) {
    return limpo.replace(/^(\d{4})(\d{6})(\d{5})$/, "$1 $2 $3");
  }
  return limpo.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/**
 * Gera um número de cartão válido (Luhn) de forma determinística.
 * @param {object} rng
 * @param {{bandeira?: keyof typeof BANDEIRAS, mascara?: boolean}} [opcoes]
 *   Sem bandeira definida, sorteia uma.
 */
export function gerarCartao(rng, { bandeira = null, mascara = false } = {}) {
  const chave = bandeira ?? rng.escolher(Object.keys(BANDEIRAS));
  const def = BANDEIRAS[chave];
  if (!def) throw new Error(`Bandeira desconhecida: ${bandeira}`);

  const prefixo = rng.escolher(def.prefixos);
  const faltam = def.tamanho - prefixo.length - 1; // -1 para o DV
  const meio = Array.from({ length: faltam }, () => rng.digito()).join("");
  const semDv = prefixo + meio;
  const numero = semDv + digitoLuhn(semDv);
  return mascara ? mascararCartao(numero) : numero;
}
