// Canadá — geradores de documentos de pessoa e empresa. Rótulos em inglês.
// Determinísticos (recebem um rng de core/seed.js).

// --- Luhn (usado no SIN e no BN) ---
function digitoLuhn(semDv) {
  let soma = 0;
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

export function validarLuhn(num) {
  const d = String(num).replace(/\D/g, "");
  if (!/^\d+$/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  return soma % 10 === 0;
}

// --- Nome (mistura anglo + franco-canadense) ---
const FIRST = [
  "James", "William", "Olivia", "Emma", "Liam", "Noah", "Sophie", "Gabriel",
  "Ethan", "Ava", "Benjamin", "Charlotte", "Nathan", "Camille", "Samuel",
  "Zoé", "Lucas", "Léa", "Jacob", "Chloé", "Alexander", "Mia", "Logan", "Florence",
];
const LAST = [
  "Smith", "Brown", "Tremblay", "Roy", "Gagnon", "Lee", "Martin", "Wilson",
  "MacDonald", "Bouchard", "Nguyen", "Singh", "Côté", "Taylor", "Campbell",
  "Gauthier", "Patel", "Morin", "Bergeron", "Lavoie",
];
export function gerarNomeCA(rng) {
  return `${rng.escolher(FIRST)} ${rng.escolher(LAST)}`;
}

// --- SIN (Social Insurance Number): 9 dígitos com DV Luhn ---
// 1º dígito 1–9 (o 0 e o 8 não são atribuídos em SINs comuns).
export function gerarSin(rng, { mascara = false } = {}) {
  let primeiro;
  do { primeiro = rng.inteiro(1, 9); } while (primeiro === 8);
  const base = String(primeiro) + Array.from({ length: 7 }, () => rng.digito()).join("");
  const sin = base + digitoLuhn(base); // 9 dígitos
  return mascara ? `${sin.slice(0, 3)}-${sin.slice(3, 6)}-${sin.slice(6)}` : sin;
}

export function validarSin(valor) {
  const d = String(valor).replace(/\D/g, "");
  return d.length === 9 && validarLuhn(d);
}

// --- BN (Business Number): 9 dígitos com DV Luhn (+ programa RT0001 na máscara) ---
export function gerarBn(rng, { mascara = false } = {}) {
  const base = Array.from({ length: 8 }, () => rng.digito()).join("");
  const bn = base + digitoLuhn(base); // 9 dígitos
  return mascara ? `${bn} RT0001` : bn;
}

export function validarBn(valor) {
  const d = String(valor).replace(/\D/g, "").slice(0, 9);
  return d.length === 9 && validarLuhn(d);
}

// --- Código postal: A1A 1A1 ---
// Exclui D, F, I, O, Q, U; a 1ª letra também exclui W e Z.
const LETRAS = "ABCEGHJKLMNPRSTVWXYZ";
const LETRAS_INICIAL = "ABCEGHJKLMNPRSTVXY";
export function gerarPostalCA(rng) {
  const l1 = rng.escolher([...LETRAS_INICIAL]);
  const l2 = rng.escolher([...LETRAS]);
  const l3 = rng.escolher([...LETRAS]);
  return `${l1}${rng.digito()}${l2} ${rng.digito()}${l3}${rng.digito()}`;
}

// --- Company name ---
const FANTASIA = [
  "Maple", "Northern", "Aurora", "Summit", "Pioneer", "Cascade", "Granite",
  "Beacon", "Ironwood", "Blue Heron", "Redwood", "Evergreen", "Laurentide",
];
const RAMO = [
  "Consulting", "Systems", "Solutions", "Logistics", "Technologies",
  "Industries", "Ventures", "Group", "Services", "Holdings",
];
const TIPO = ["Inc.", "Ltd.", "Corp.", "Co."];
export function gerarCompanyNameCA(rng) {
  return `${rng.escolher(FANTASIA)} ${rng.escolher(RAMO)} ${rng.escolher(TIPO)}`;
}
