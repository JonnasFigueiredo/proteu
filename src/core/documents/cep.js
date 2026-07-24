// CEP — coerente por região: cada UF tem uma faixa oficial dos Correios.
//
// A tabela usa a faixa PRINCIPAL de cada UF (alguns estados têm faixas
// suplementares; para massa de teste a principal basta e evita colisões).
// Valores em "milhares" do CEP: SP 01000–19999 significa 01000-000 a 19999-999.

export const FAIXAS_UF = {
  SP: [1000, 19999],
  RJ: [20000, 28999],
  ES: [29000, 29999],
  MG: [30000, 39999],
  BA: [40000, 48999],
  SE: [49000, 49999],
  PE: [50000, 56999],
  AL: [57000, 57999],
  PB: [58000, 58999],
  RN: [59000, 59999],
  CE: [60000, 63999],
  PI: [64000, 64999],
  MA: [65000, 65999],
  PA: [66000, 68899],
  AP: [68900, 68999],
  AM: [69000, 69299],
  RR: [69300, 69399],
  AC: [69900, 69999],
  DF: [70000, 72799],
  GO: [73700, 76799],
  RO: [76800, 76999],
  TO: [77000, 77999],
  MT: [78000, 78899],
  MS: [79000, 79999],
  PR: [80000, 87999],
  SC: [88000, 89999],
  RS: [90000, 99999],
};

/** Aplica a máscara 00000-000. */
export function mascararCep(cep) {
  return cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

/** Descobre a UF de um CEP pela faixa principal; null se fora de todas. */
export function ufDoCep(cep) {
  const limpo = String(cep).replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  const milhar = Number(limpo.slice(0, 5));
  for (const [uf, [ini, fim]] of Object.entries(FAIXAS_UF)) {
    if (milhar >= ini && milhar <= fim) return uf;
  }
  return null;
}

/**
 * Gera um CEP válido e coerente com a UF pedida (ou uma UF sorteada).
 * @param {object} rng
 * @param {{uf?: string, mascara?: boolean}} [opcoes]
 */
export function gerarCep(rng, { uf = null, mascara = false } = {}) {
  const escolhida = uf
    ? uf.toUpperCase()
    : rng.escolher(Object.keys(FAIXAS_UF));
  const faixa = FAIXAS_UF[escolhida];
  if (!faixa) throw new Error(`UF desconhecida: ${uf}`);

  const milhar = rng.inteiro(faixa[0], faixa[1]);
  const sufixo = rng.inteiro(0, 999);
  const cep =
    String(milhar).padStart(5, "0") + String(sufixo).padStart(3, "0");
  return mascara ? mascararCep(cep) : cep;
}
