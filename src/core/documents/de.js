// Alemanha — geradores de documentos de pessoa e empresa. Rótulos em alemão.
// Determinísticos (recebem um rng de core/seed.js).

const p2 = (n) => String(n).padStart(2, "0");
const rndDe = (rng, s) => s[rng.inteiro(0, s.length - 1)];
const nDigitos = (rng, n) => Array.from({ length: n }, () => rng.digito()).join("");

// --- Nome ---
const VORNAMEN = [
  "Lukas", "Leon", "Finn", "Jonas", "Paul", "Elias", "Maximilian", "Felix",
  "Ben", "Noah", "Emma", "Mia", "Hannah", "Sophie", "Lena", "Anna", "Marie",
  "Laura", "Julia", "Katharina",
];
const NACHNAMEN = [
  "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner",
  "Becker", "Schulz", "Hoffmann", "Koch", "Bauer", "Richter", "Klein", "Wolf",
  "Schröder", "Neumann", "Braun", "Zimmermann", "Krüger",
];
export function gerarNameDE(rng) {
  return `${rndDe(rng, VORNAMEN)} ${rndDe(rng, NACHNAMEN)}`;
}

// --- ISO 7064 MOD 11,10 (Steuer-IdNr e USt-IdNr) ---
// Recebe os dígitos SEM o verificador e devolve o dígito verificador.
function mod1110(digitos) {
  let produto = 10;
  for (const ch of digitos) {
    let soma = (Number(ch) + produto) % 10;
    if (soma === 0) soma = 10;
    produto = (soma * 2) % 11;
  }
  return (11 - produto) % 10;
}

// --- Steuerliche Identifikationsnummer: 11 dígitos, DV MOD 11,10 ---
export function gerarSteuerId(rng) {
  const base = String(rng.inteiro(1, 9)) + nDigitos(rng, 9); // 10 dígitos, 1º ≠ 0
  return base + mod1110(base);
}
export function validarSteuerId(valor) {
  const d = String(valor).replace(/\s/g, "");
  if (!/^[1-9]\d{10}$/.test(d)) return false;
  return mod1110(d.slice(0, 10)) === Number(d[10]);
}

// --- Umsatzsteuer-IdNr: "DE" + 9 dígitos (8 + DV MOD 11,10) ---
export function gerarUstId(rng) {
  const base = String(rng.inteiro(1, 9)) + nDigitos(rng, 7); // 8 dígitos, 1º ≠ 0
  return "DE" + base + mod1110(base);
}
export function validarUstId(valor) {
  const v = String(valor).replace(/\s/g, "").toUpperCase();
  if (!/^DE\d{9}$/.test(v)) return false;
  const base = v.slice(2, 10);
  return mod1110(base) === Number(v[10]);
}

// --- IBAN (DE): "DE" + 2 DV + 8 BLZ + 10 Konto = 22 chars. DV mod-97-10. ---
function mod97(numStr) {
  let resto = 0;
  for (let i = 0; i < numStr.length; i++) {
    resto = (resto * 10 + (numStr.charCodeAt(i) - 48)) % 97;
  }
  return resto;
}
// Converte letras em números (A=10 … Z=35); dígitos ficam iguais.
function letrasParaNumeros(s) {
  let out = "";
  for (const ch of s) {
    out += /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
  }
  return out;
}

export function gerarIbanDE(rng, { mascara = false } = {}) {
  const blz = String(rng.inteiro(1, 8)) + nDigitos(rng, 7); // 8 dígitos (banco)
  const konto = nDigitos(rng, 10); // 10 dígitos (conta)
  const bban = blz + konto; // 18 dígitos
  const resto = mod97(bban + "1314" + "00"); // DE = 13,14
  const dv = p2(98 - resto);
  const iban = "DE" + dv + bban; // 22 chars
  return mascara ? iban.replace(/(.{4})/g, "$1 ").trim() : iban;
}
export function validarIbanDE(valor) {
  const v = String(valor).replace(/\s/g, "").toUpperCase();
  if (!/^DE\d{20}$/.test(v)) return false;
  const rearranjado = v.slice(4) + v.slice(0, 4); // BBAN + "DE" + DV
  return mod97(letrasParaNumeros(rearranjado)) === 1;
}

// --- Postleitzahl (PLZ): 5 dígitos (01000–99999) ---
export function gerarPlz(rng) {
  return p2(rng.inteiro(1000, 99999) % 100000).padStart(5, "0");
}

// --- Telefon (celular): 01(5|6|7)x + 8 dígitos ---
export function gerarTelefonDE(rng, { mascara = false } = {}) {
  const num = "01" + rndDe(rng, "567") + nDigitos(rng, 8); // 11 dígitos
  return mascara ? `${num.slice(0, 4)} ${num.slice(4)}` : num;
}

// --- Firmenname ---
const FANTASIE = ["Nordwind", "Rheintal", "Alpen", "Adler", "Bergmann", "Sternberg", "Königs", "Weißburg"];
const BRANCHE = ["Logistik", "Technik", "Handels", "Bau", "Software", "Industrie", "Maschinen"];
const RECHTSFORM = ["GmbH", "AG", "GmbH & Co. KG", "UG (haftungsbeschränkt)"];
export function gerarFirmennameDE(rng) {
  return `${rndDe(rng, FANTASIE)} ${rndDe(rng, BRANCHE)} ${rndDe(rng, RECHTSFORM)}`;
}
