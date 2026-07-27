// Arábia Saudita — geradores de documentos de pessoa e empresa. Rótulos em
// árabe. Determinísticos (recebem um rng de core/seed.js).

const p2 = (n) => String(n).padStart(2, "0");

// --- Nome (اسم + عائلة) ---
const NOMES = [
  "محمد", "أحمد", "عبدالله", "علي", "فهد", "خالد", "سعود", "عبدالعزيز",
  "فيصل", "ناصر", "فاطمة", "نورة", "سارة", "ريم", "هند", "لطيفة", "منيرة",
  "عبدالرحمن", "بندر", "تركي",
];
const SOBRENOMES = [
  "العتيبي", "القحطاني", "الغامدي", "الشهري", "الحربي", "الدوسري", "المطيري",
  "الزهراني", "السبيعي", "الشمري", "البقمي", "العنزي", "الرشيدي", "الجهني",
];
export function gerarNomeSA(rng) {
  return `${rng.escolher(NOMES)} ${rng.escolher(SOBRENOMES)}`;
}

// --- Data (calendário gregoriano; formato ISO YYYY-MM-DD) ---
const ehBissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const diasNoMes = (m, a) =>
  [31, ehBissexto(a) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

// --- Documento nacional de identidade (الهوية الوطنية): 10 dígitos.
// 1º dígito 1 (cidadão) ou 2 (residente/إقامة). DV Luhn (dobra as posições
// pares 0-indexadas; total mod 10 == 0). ---
function somaLuhnSA(dig) {
  let soma = 0;
  for (let i = 0; i < dig.length; i++) {
    const d = Number(dig[i]);
    if (i % 2 === 0) {
      const x = d * 2;
      soma += x > 9 ? x - 9 : x;
    } else {
      soma += d;
    }
  }
  return soma;
}

export function gerarNationalIdSA(rng) {
  const dig = [rng.inteiro(1, 2)]; // 1 = cidadão, 2 = residente
  for (let i = 0; i < 8; i++) dig.push(rng.digito());
  const dv = (10 - (somaLuhnSA(dig) % 10)) % 10; // posição 9 (ímpar) entra sem dobrar
  dig.push(dv);
  return dig.join("");
}

export function validarNationalIdSA(valor) {
  const d = String(valor).replace(/\s/g, "");
  if (!/^[12]\d{9}$/.test(d)) return false;
  return somaLuhnSA(d) % 10 === 0;
}

// --- Registro comercial (السجل التجاري): 10 dígitos. Prefixo de 4 dígitos
// identifica a região (ex.: 1010 Riade, 4030 Jidá). Sem DV público. ---
const REGIOES_CR = ["1010", "2050", "4030", "3350", "5855", "1131", "2051", "4700"];
export function gerarCrSA(rng) {
  const regiao = rng.escolher(REGIOES_CR);
  const seq = Array.from({ length: 6 }, () => rng.digito()).join("");
  return regiao + seq;
}
export function validarCrSA(valor) {
  return /^\d{10}$/.test(String(valor).replace(/\s/g, ""));
}

// --- Número de IVA / VAT (الرقم الضريبي): 15 dígitos. Começa e termina em 3;
// forma canônica 3 + 9 dígitos + "00003" (grupo de filial + verificação). ---
export function gerarVatSA(rng) {
  const meio = Array.from({ length: 9 }, () => rng.digito()).join("");
  return "3" + meio + "00003";
}
export function validarVatSA(valor) {
  return /^3\d{9}00003$/.test(String(valor).replace(/\s/g, ""));
}

// --- Código postal: 5 dígitos (1º dígito 1–9) ---
export function gerarPostalSA(rng) {
  return String(rng.inteiro(1, 9)) + Array.from({ length: 4 }, () => rng.digito()).join("");
}

// --- Telefone celular: 05X + 7 dígitos (X ∈ 0,3,4,5,6,7,8,9) ---
const PREFIXOS_CEL = ["0", "3", "4", "5", "6", "7", "8", "9"];
export function gerarTelefoneSA(rng, { mascara = false } = {}) {
  const num = "05" + rng.escolher(PREFIXOS_CEL) + Array.from({ length: 7 }, () => rng.digito()).join("");
  return mascara ? `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}` : num; // 10 dígitos
}

// --- Razão social (اسم الشركة) ---
const FANTASIA = ["الفهد", "النخبة", "الرياض", "الواحة", "المستقبل", "الأمانة", "التقنية", "الرواد"];
const SETOR = ["للتجارة", "للمقاولات", "للتقنية", "للاستثمار", "للخدمات", "للصناعة"];
const TIPO = ["المحدودة", "القابضة", "ش.م.م"];
export function gerarRazaoSocialSA(rng) {
  return `شركة ${rng.escolher(FANTASIA)} ${rng.escolher(SETOR)} ${rng.escolher(TIPO)}`;
}
