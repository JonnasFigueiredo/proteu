// Estados Unidos — geradores de documentos de pessoa e empresa.
// Determinísticos (recebem um rng de core/seed.js). Rótulos ficam no país
// (inglês) porque a interface acompanha o país.

// --- Nome ---
const FIRST = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Susan", "Sarah", "Karen",
  "Emily", "Jessica", "Ashley", "Emma", "Olivia", "Sophia", "Daniel", "Matthew",
  "Christopher", "Andrew", "Joshua", "Ryan", "Nicole", "Amanda", "Megan", "Lauren",
];
const LAST = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White",
  "Harris", "Clark", "Lewis", "Walker", "Hall", "Allen", "Young", "King", "Wright",
];

export function gerarNomeUS(rng) {
  return `${rng.escolher(FIRST)} ${rng.escolher(LAST)}`;
}

// --- SSN (Social Security Number): AAA-GG-SSSS ---
// Regras de validade: área 001–899 exceto 666; grupo 01–99; série 0001–9999.
function areaSsn(rng) {
  let a;
  do { a = rng.inteiro(1, 899); } while (a === 666);
  return a;
}

export function gerarSsn(rng, { mascara = false } = {}) {
  const a = String(areaSsn(rng)).padStart(3, "0");
  const g = String(rng.inteiro(1, 99)).padStart(2, "0");
  const s = String(rng.inteiro(1, 9999)).padStart(4, "0");
  return mascara ? `${a}-${g}-${s}` : `${a}${g}${s}`;
}

export function validarSsn(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 9) return false;
  const area = Number(d.slice(0, 3));
  const grupo = Number(d.slice(3, 5));
  const serie = Number(d.slice(5));
  if (area === 0 || area === 666 || area >= 900) return false;
  if (grupo === 0) return false;
  if (serie === 0) return false;
  return true;
}

// --- EIN (Employer Identification Number): XX-XXXXXXX ---
// Prefixos de campus válidos (subconjunto real). Sem dígito verificador.
const PREFIXOS_EIN = [
  "01", "02", "03", "04", "05", "06", "10", "11", "12", "13", "14", "15", "16",
  "20", "21", "22", "23", "24", "25", "26", "27", "30", "31", "32", "33", "34",
  "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47",
  "48", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61",
  "62", "63", "64", "65", "66", "67", "68", "71", "72", "73", "74", "75", "76",
  "77", "80", "81", "82", "83", "84", "85", "86", "87", "88", "90", "91", "92",
  "93", "94", "95", "98", "99",
];

export function gerarEin(rng, { mascara = false } = {}) {
  const prefixo = rng.escolher(PREFIXOS_EIN);
  const resto = Array.from({ length: 7 }, () => rng.digito()).join("");
  return mascara ? `${prefixo}-${resto}` : `${prefixo}${resto}`;
}

export function validarEin(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 9) return false;
  return PREFIXOS_EIN.includes(d.slice(0, 2));
}

// --- ZIP code: 5 dígitos (ou ZIP+4 com máscara) ---
export function gerarZip(rng, { mascara = false } = {}) {
  const zip = String(rng.inteiro(501, 99950)).padStart(5, "0");
  if (!mascara) return zip;
  const mais4 = String(rng.inteiro(1, 9999)).padStart(4, "0");
  return `${zip}-${mais4}`;
}

// --- Telefone (NANP): (AAA) NXX-XXXX ---
export function gerarTelefoneUS(rng, { mascara = false } = {}) {
  const npa = `${rng.inteiro(2, 9)}${rng.digito()}${rng.digito()}`; // área
  const nxx = `${rng.inteiro(2, 9)}${rng.digito()}${rng.digito()}`; // central
  const linha = Array.from({ length: 4 }, () => rng.digito()).join("");
  return mascara ? `(${npa}) ${nxx}-${linha}` : `${npa}${nxx}${linha}`;
}

// --- Company name ---
const FANTASIA = [
  "Aurora", "Vertex", "Summit", "Pioneer", "Nexus", "Atlas", "Beacon", "Cobalt",
  "Keystone", "Northwind", "Silverline", "Redwood", "Blue Sky", "Ironclad",
  "Evergreen", "Brightline", "Cascade", "Meridian", "Granite", "Harbor",
];
const RAMO = [
  "Consulting", "Systems", "Solutions", "Logistics", "Technologies", "Industries",
  "Partners", "Holdings", "Services", "Group", "Labs", "Ventures",
];
const SUFIXO = ["LLC", "Inc.", "Corp.", "Co.", "LLP"];

export function gerarCompanyName(rng) {
  return `${rng.escolher(FANTASIA)} ${rng.escolher(RAMO)} ${rng.escolher(SUFIXO)}`;
}
