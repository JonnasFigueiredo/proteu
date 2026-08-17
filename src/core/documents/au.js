// Austrália — geradores de documentos de pessoa e empresa. Rótulos em inglês.
// Determinísticos (recebem um rng de core/seed.js).
//
// Os três identificadores principais (TFN, ABN, ACN) têm dígito verificador
// publicado pelo ATO e pela ASIC. Gerar com DV válido é o que permite exercitar
// a validação do sistema testado, em vez de esbarrar nela.

const rndAu = (rng, s) => s[rng.inteiro(0, s.length - 1)];

// --- Nome ---
const PRIMEIROS_AU = [
  "Oliver", "Charlotte", "Jack", "Amelia", "William", "Isla", "Noah", "Mia",
  "Thomas", "Grace", "Henry", "Chloe", "Lucas", "Zoe", "Ethan", "Ruby",
];
const SOBRENOMES_AU = [
  "Smith", "Jones", "Williams", "Brown", "Wilson", "Taylor", "Nguyen",
  "Martin", "Anderson", "Thompson", "Walker", "Harris", "Ryan", "Robinson",
];

export function gerarNameAU(rng) {
  return `${rndAu(rng, PRIMEIROS_AU)} ${rndAu(rng, SOBRENOMES_AU)}`;
}

// --- TFN: Tax File Number, 9 dígitos -----------------------------------------
//
// Regra do ATO: soma ponderada dos 9 dígitos com os pesos abaixo tem de ser
// múltipla de 11. O nono dígito não é "o verificador" isolado — ele entra na
// mesma soma, então geramos os 8 primeiros e procuramos o último que fecha.
const PESOS_TFN = [1, 4, 3, 7, 5, 8, 6, 9, 10];

export function validarTfn(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 9) return false;
  const soma = PESOS_TFN.reduce((acc, p, i) => acc + p * Number(d[i]), 0);
  return soma % 11 === 0;
}

export function gerarTfn(rng, { mascara = false } = {}) {
  // Tenta até fechar: para alguns prefixos não existe último dígito de 0 a 9
  // que zere o módulo, e nesse caso vale sortear outro prefixo.
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const base = Array.from({ length: 8 }, () => rng.digito());
    const parcial = PESOS_TFN.slice(0, 8).reduce((a, p, i) => a + p * base[i], 0);
    for (let ultimo = 0; ultimo <= 9; ultimo++) {
      if ((parcial + PESOS_TFN[8] * ultimo) % 11 === 0) {
        const tfn = [...base, ultimo].join("");
        return mascara ? tfn.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3") : tfn;
      }
    }
  }
  // Inalcançável na prática; melhor estourar do que devolver TFN inválido.
  throw new Error("não foi possível gerar TFN válido");
}

// --- ABN: Australian Business Number, 11 dígitos -----------------------------
//
// Regra do ATO: subtrai 1 do primeiro dígito, aplica os pesos e a soma tem de
// ser múltipla de 89. Os 9 últimos dígitos de um ABN de empresa costumam ser o
// ACN — aqui geramos independente, que basta para massa de teste.
const PESOS_ABN = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

export function validarAbn(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 11 || d[0] === "0") return false;
  const nums = d.split("").map(Number);
  nums[0] -= 1;
  const soma = PESOS_ABN.reduce((acc, p, i) => acc + p * nums[i], 0);
  return soma % 89 === 0;
}

export function gerarAbn(rng, { mascara = false } = {}) {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    // Os 9 finais são livres; os 2 primeiros são o "check" que fecha o módulo.
    const corpo = Array.from({ length: 9 }, () => rng.digito());
    const parcial = corpo.reduce((a, n, i) => a + PESOS_ABN[i + 2] * n, 0);
    for (let d1 = 1; d1 <= 9; d1++) {
      for (let d2 = 0; d2 <= 9; d2++) {
        const soma = PESOS_ABN[0] * (d1 - 1) + PESOS_ABN[1] * d2 + parcial;
        if (soma % 89 === 0) {
          const abn = [d1, d2, ...corpo].join("");
          return mascara
            ? abn.replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4")
            : abn;
        }
      }
    }
  }
  throw new Error("não foi possível gerar ABN válido");
}

// --- ACN: Australian Company Number, 9 dígitos -------------------------------
//
// Regra da ASIC: pesos 8..1 sobre os 8 primeiros; o DV é o complemento de 10
// do resto da divisão por 10 (com 10 virando 0).
const PESOS_ACN = [8, 7, 6, 5, 4, 3, 2, 1];

function dvAcn(oito) {
  const soma = PESOS_ACN.reduce((acc, p, i) => acc + p * Number(oito[i]), 0);
  return (10 - (soma % 10)) % 10;
}

export function validarAcn(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 9) return false;
  return dvAcn(d.slice(0, 8)) === Number(d[8]);
}

export function gerarAcn(rng, { mascara = false } = {}) {
  const oito = Array.from({ length: 8 }, () => rng.digito()).join("");
  const acn = oito + dvAcn(oito);
  return mascara ? acn.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3") : acn;
}

// --- Medicare: 10 dígitos + dígito de emissão --------------------------------
//
// O primeiro dígito é 2–6; o nono é o verificador sobre os 8 primeiros; o
// décimo é o número da via do cartão (1–9), que não entra no cálculo.
const PESOS_MEDICARE = [1, 3, 7, 9, 1, 3, 7, 9];

export function validarMedicare(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 11) return false;
  if (!/[2-6]/.test(d[0])) return false;
  const soma = PESOS_MEDICARE.reduce((acc, p, i) => acc + p * Number(d[i]), 0);
  return soma % 10 === Number(d[8]);
}

export function gerarMedicare(rng, { mascara = false } = {}) {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const base = [rng.inteiro(2, 6), ...Array.from({ length: 7 }, () => rng.digito())];
    const dv = PESOS_MEDICARE.reduce((a, p, i) => a + p * base[i], 0) % 10;
    const via = rng.inteiro(1, 9);
    const num = [...base, dv, via].join("");
    if (validarMedicare(num)) {
      return mascara ? num.replace(/^(\d{4})(\d{5})(\d)$/, "$1 $2 $3") : num;
    }
  }
  throw new Error("não foi possível gerar Medicare válido");
}

// --- Postcode: 4 dígitos, coerente com o estado ------------------------------
//
// Faixa principal de cada estado/território. Diferente do CEP, o postcode
// australiano é uma faixa densa: quase todo número dentro dela existe.
export const FAIXAS_POSTCODE = {
  NSW: [2000, 2599],
  ACT: [2600, 2618],
  VIC: [3000, 3999],
  QLD: [4000, 4999],
  SA: [5000, 5799],
  WA: [6000, 6797],
  TAS: [7000, 7799],
  NT: [800, 899],
};

export function gerarPostcode(rng, { estado = null } = {}) {
  const uf = estado || rndAu(rng, Object.keys(FAIXAS_POSTCODE));
  const [ini, fim] = FAIXAS_POSTCODE[uf];
  return String(rng.inteiro(ini, fim)).padStart(4, "0");
}

// --- Telefone: celular 04xx xxx xxx ------------------------------------------
export function gerarPhoneAU(rng, { mascara = false } = {}) {
  const corpo = "4" + Array.from({ length: 8 }, () => rng.digito()).join("");
  const num = "0" + corpo;
  return mascara ? num.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3") : num;
}

// --- Nome de empresa ---
const NEGOCIO_AU = ["Coastal", "Outback", "Harbour", "Summit", "Redgum", "Bluestone"];
const RAMO_AU = ["Logistics", "Consulting", "Holdings", "Traders", "Services"];
const SUFIXO_AU = ["Pty Ltd", "Ltd", "Pty Limited"];

export function gerarCompanyAU(rng) {
  return `${rndAu(rng, NEGOCIO_AU)} ${rndAu(rng, RAMO_AU)} ${rndAu(rng, SUFIXO_AU)}`;
}
