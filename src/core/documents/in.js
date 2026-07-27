// Índia — geradores de documentos de pessoa e empresa. Rótulos em híndi.
// Determinísticos (recebem um rng de core/seed.js).
//
// Os nomes são romanizados (Latin): é como a maioria dos sistemas armazena
// dados indianos. A interface fica em híndi (Devanágari); o valor, não.

const p2 = (n) => String(n).padStart(2, "0");
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const rndDe = (rng, s) => s[rng.inteiro(0, s.length - 1)];

// --- Verhoeff (checksum do Aadhaar) ----------------------------------------
// Grupo diédrico D5 — detecta mais erros que mod 10/11 (inclui transposições).
const D_TAB = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P_TAB = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const INV_TAB = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/** Dígito verificador de Verhoeff para um número (sem o dígito). */
function verhoeffDv(numStr) {
  let c = 0;
  const rev = [...numStr].reverse();
  for (let i = 0; i < rev.length; i++) {
    c = D_TAB[c][P_TAB[(i + 1) % 8][Number(rev[i])]];
  }
  return INV_TAB[c];
}

/** Valida um número completo (com o dígito verificador de Verhoeff). */
export function validarVerhoeff(numStr) {
  let c = 0;
  const rev = [...numStr].reverse();
  for (let i = 0; i < rev.length; i++) {
    c = D_TAB[c][P_TAB[i % 8][Number(rev[i])]];
  }
  return c === 0;
}

// --- Nome (romanizado) ---
const NOMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Rohan",
  "Karan", "Ananya", "Diya", "Saanvi", "Aadhya", "Priya", "Neha", "Pooja",
  "Ishaan", "Kabir", "Meera", "Riya",
];
const SOBRENOMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Nair",
  "Iyer", "Rao", "Das", "Bose", "Chopra", "Mehta", "Joshi", "Malhotra",
  "Agarwal", "Chauhan", "Pillai", "Menon",
];
export function gerarNomeIN(rng) {
  return `${rndDe(rng, NOMES)} ${rndDe(rng, SOBRENOMES)}`;
}

// --- Aadhaar: 12 dígitos, 1º dígito 2–9, verificador Verhoeff ---
export function gerarAadhaar(rng, { mascara = false } = {}) {
  const base = String(rng.inteiro(2, 9)) + Array.from({ length: 10 }, () => rng.digito()).join("");
  const num = base + verhoeffDv(base); // 12 dígitos
  return mascara ? `${num.slice(0, 4)} ${num.slice(4, 8)} ${num.slice(8)}` : num;
}
export function validarAadhaar(valor) {
  const d = String(valor).replace(/\s/g, "");
  if (!/^[2-9]\d{11}$/.test(d)) return false;
  return validarVerhoeff(d);
}

// --- PAN: AAAAA9999A. 4º char = tipo de titular; validação estrutural. ---
const TIPOS_PAN = "ABCFGHJLPT"; // P=pessoa, C=empresa, F=firma, H=HUF, T=trust…
export function gerarPan(rng) {
  const s3 = Array.from({ length: 3 }, () => rndDe(rng, LETRAS)).join("");
  const tipo = rndDe(rng, TIPOS_PAN);
  const inicialNome = rndDe(rng, LETRAS);
  const seq = Array.from({ length: 4 }, () => rng.digito()).join("");
  const dv = rndDe(rng, LETRAS);
  return s3 + tipo + inicialNome + seq + dv;
}
export function validarPan(valor) {
  return /^[A-Z]{3}[ABCFGHJLPT][A-Z]\d{4}[A-Z]$/.test(String(valor).toUpperCase());
}

// --- GSTIN: 15 chars, verificador base-36 (mod 36) sobre os 14 primeiros. ---
const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 36

function gstinDv(base14) {
  const mod = GSTIN_CHARS.length; // 36
  let fator = 2;
  let soma = 0;
  for (let i = base14.length - 1; i >= 0; i--) {
    let d = fator * GSTIN_CHARS.indexOf(base14[i]);
    fator = fator === 2 ? 1 : 2;
    d = Math.floor(d / mod) + (d % mod);
    soma += d;
  }
  return GSTIN_CHARS[(mod - (soma % mod)) % mod];
}

export function gerarGstin(rng) {
  const estado = p2(rng.inteiro(1, 37)); // código do estado (01–37)
  const pan = gerarPan(rng); // 10 chars embutidos
  const entidade = rndDe(rng, "123456789ABCDEFGHJKLMNPQRSTUVWXYZ"); // nº de registro
  const base14 = estado + pan + entidade + "Z";
  return base14 + gstinDv(base14);
}
export function validarGstin(valor) {
  const v = String(valor).toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v)) return false;
  return gstinDv(v.slice(0, 14)) === v[14];
}

// --- PIN code: 6 dígitos (1º dígito 1–8) ---
export function gerarPinIN(rng) {
  return String(rng.inteiro(1, 8)) + Array.from({ length: 5 }, () => rng.digito()).join("");
}

// --- Celular: 10 dígitos, 1º dígito 6–9 ---
export function gerarTelefoneIN(rng, { mascara = false } = {}) {
  const num = String(rng.inteiro(6, 9)) + Array.from({ length: 9 }, () => rng.digito()).join("");
  return mascara ? `${num.slice(0, 5)} ${num.slice(5)}` : num;
}

// --- Razão social (romanizada) ---
const FANTASIA = ["Bharat", "Ganga", "Lotus", "Deccan", "Himalaya", "Konark", "Sunrise", "Ashoka"];
const SETOR = ["Technologies", "Textiles", "Industries", "Solutions", "Enterprises", "Traders"];
const TIPO = ["Private Limited", "Pvt. Ltd.", "LLP", "Limited"];
export function gerarRazaoSocialIN(rng) {
  return `${rndDe(rng, FANTASIA)} ${rndDe(rng, SETOR)} ${rndDe(rng, TIPO)}`;
}
