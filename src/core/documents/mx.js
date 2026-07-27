// México — geradores de documentos de pessoa e empresa. Rótulos em espanhol.
// Determinísticos (recebem um rng de core/seed.js).

const p2 = (n) => String(n).padStart(2, "0");
const ehBissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const diasNoMes = (m, a) =>
  [31, ehBissexto(a) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

const VOGAIS = "AEIOU";
const CONSOANTES = "BCDFGHJKLMNPQRSTVWXYZ"; // sem vogais nem Ñ (regra do CURP/RFC)
const LETRAS = "ABCDEFGHIJKLMNPQRSTUVWXYZ";
const ALFANUM = "ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789";
// Códigos de entidade federativa aceitos no CURP (NE = nascido no estrangeiro).
const ESTADOS = [
  "AS", "BC", "BS", "CC", "CL", "CM", "CS", "CH", "DF", "DG", "GT", "GR", "HG",
  "JC", "MC", "MN", "MS", "NT", "NL", "OC", "PL", "QT", "QR", "SP", "SL", "SR",
  "TC", "TS", "TL", "VZ", "YN", "ZS", "NE",
];

const rndDe = (rng, s) => s[rng.inteiro(0, s.length - 1)];

// Data de nascimento embutida (adulto): devolve { yy, mm, dd, ano }.
function fechaNacimiento(rng) {
  const ano = rng.inteiro(1950, 2005);
  const mes = rng.inteiro(1, 12);
  const dia = rng.inteiro(1, diasNoMes(mes, ano));
  return { yy: p2(ano % 100), mm: p2(mes), dd: p2(dia), ano };
}

// --- Nombre ---
const NOMBRES = [
  "José", "María", "Guadalupe", "Juan", "Luis", "Carlos", "Miguel", "Alejandro",
  "Fernando", "Jorge", "Sofía", "Valeria", "Ximena", "Regina", "Diego",
  "Santiago", "Ana", "Fátima", "Emiliano", "Mateo",
];
const APELLIDOS = [
  "Hernández", "García", "Martínez", "López", "González", "Rodríguez", "Pérez",
  "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Reyes",
  "Cruz", "Morales", "Ortiz", "Gutiérrez", "Mendoza",
];
export function gerarNombreMX(rng) {
  return `${rndDe(rng, NOMBRES)} ${rndDe(rng, APELLIDOS)} ${rndDe(rng, APELLIDOS)}`;
}

// --- CURP (18): 4 letras + AAMMDD + sexo + estado + 3 consoantes + homoclave +
// dígito verificador (mod 10 sobre as 17 primeiras). ---
const DICT_CURP = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

function dvCurp(base17) {
  let soma = 0;
  for (let i = 0; i < 17; i++) soma += DICT_CURP.indexOf(base17[i]) * (18 - i);
  const d = 10 - (soma % 10);
  return String(d === 10 ? 0 : d);
}

export function gerarCurpMX(rng) {
  const f = fechaNacimiento(rng);
  const iniciais =
    rndDe(rng, LETRAS) + rndDe(rng, VOGAIS) + rndDe(rng, LETRAS) + rndDe(rng, LETRAS);
  const sexo = rng.inteiro(0, 1) ? "H" : "M";
  const estado = rndDe(rng, ESTADOS);
  const cons = rndDe(rng, CONSOANTES) + rndDe(rng, CONSOANTES) + rndDe(rng, CONSOANTES);
  // Homoclave: dígito p/ nascidos antes de 2000, letra p/ 2000+.
  const homoclave = f.ano < 2000 ? String(rng.inteiro(0, 9)) : rndDe(rng, LETRAS);
  const base17 = iniciais + f.yy + f.mm + f.dd + sexo + estado + cons + homoclave;
  return base17 + dvCurp(base17);
}

const RE_CURP =
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;

export function validarCurpMX(valor) {
  const v = String(valor).toUpperCase();
  if (!RE_CURP.test(v)) return false;
  return dvCurp(v.slice(0, 17)) === v[17];
}

// --- RFC: dígito verificador (mod 11). Física = 13 (4 letras), moral = 12
// (3 letras); ambos com AAMMDD + 2 alfanum + verificador. ---
const DICT_RFC = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ"; // valor = índice

function dvRfc(sinDigito) {
  // Alinha em 12 posições (moral tem 11): prefixa espaço (valor 37).
  const s = sinDigito.length === 11 ? " " + sinDigito : sinDigito;
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += DICT_RFC.indexOf(s[i]) * (13 - i);
  const d = 11 - (soma % 11);
  if (d === 11) return "0";
  if (d === 10) return "A";
  return String(d);
}

function homoclave2(rng) {
  return rndDe(rng, ALFANUM) + rndDe(rng, ALFANUM);
}

export function gerarRfcMX(rng) {
  const f = fechaNacimiento(rng);
  const letras = rndDe(rng, LETRAS) + rndDe(rng, VOGAIS) + rndDe(rng, LETRAS) + rndDe(rng, LETRAS);
  const base = letras + f.yy + f.mm + f.dd + homoclave2(rng); // 12
  return base + dvRfc(base);
}

export function gerarRfcMoralMX(rng) {
  const f = fechaNacimiento(rng);
  const letras = rndDe(rng, LETRAS) + rndDe(rng, LETRAS) + rndDe(rng, LETRAS);
  const base = letras + f.yy + f.mm + f.dd + homoclave2(rng); // 11
  return base + dvRfc(base);
}

export function validarRfcMX(valor) {
  const v = String(valor).toUpperCase();
  if (/^[A-ZÑ&]{4}\d{6}[A-Z\d]{2}[A-Z\d]$/.test(v)) return dvRfc(v.slice(0, 12)) === v[12];
  if (/^[A-ZÑ&]{3}\d{6}[A-Z\d]{2}[A-Z\d]$/.test(v)) return dvRfc(v.slice(0, 11)) === v[11];
  return false;
}

// --- NSS (IMSS): 11 dígitos, verificador Luhn sobre os 10 primeiros. ---
function digitoLuhn(dez) {
  let soma = 0;
  for (let i = 0; i < dez.length; i++) {
    let d = Number(dez[i]);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    soma += d;
  }
  return (10 - (soma % 10)) % 10;
}

export function gerarNssMX(rng) {
  const base = Array.from({ length: 10 }, () => rng.digito()).join("");
  return base + digitoLuhn(base);
}

export function validarNssMX(valor) {
  const v = String(valor).replace(/\D/g, "");
  if (!/^\d{11}$/.test(v)) return false;
  return digitoLuhn(v.slice(0, 10)) === Number(v[10]);
}

// --- Código postal: 5 dígitos (2 primeiros = estado, 01–99) ---
export function gerarCpMX(rng) {
  const estado = p2(rng.inteiro(1, 99));
  return estado + Array.from({ length: 3 }, () => rng.digito()).join("");
}

// --- Teléfono: 10 dígitos (lada + número); 1º dígito 2–9 ---
export function gerarTelefonoMX(rng, { mascara = false } = {}) {
  const num = String(rng.inteiro(2, 9)) + Array.from({ length: 9 }, () => rng.digito()).join("");
  return mascara ? `${num.slice(0, 2)} ${num.slice(2, 6)} ${num.slice(6)}` : num;
}

// --- Razón social ---
const PREFIJO = ["Grupo", "Comercializadora", "Servicios", "Corporativo", "Distribuidora"];
const FANTASIA = ["Azteca", "del Valle", "Insurgentes", "Reforma", "del Norte", "Maya", "Anáhuac", "Cumbres"];
const TIPO = ["S.A. de C.V.", "S. de R.L. de C.V.", "S.C."];
export function gerarRazonSocialMX(rng) {
  return `${rndDe(rng, PREFIJO)} ${rndDe(rng, FANTASIA)} ${rndDe(rng, TIPO)}`;
}
