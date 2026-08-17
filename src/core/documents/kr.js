// Coreia do Sul — geradores de documentos de pessoa e empresa. Rótulos em coreano.
// Determinísticos (recebem um rng de core/seed.js).
//
// O 주민등록번호 (RRN) identifica uma pessoa física e é dado sensível na Coreia.
// Aqui ele é FICTÍCIO como todo o resto: a data de nascimento é sorteada e o
// bloco de origem também, então o número satisfaz o dígito verificador sem
// corresponder a ninguém. É o que permite testar a validação sem usar o número
// de uma pessoa real.

const rndKr = (rng, s) => s[rng.inteiro(0, s.length - 1)];
const p2 = (n) => String(n).padStart(2, "0");

// --- 성명 (nome) ---
// Sobrenome primeiro, como se escreve em coreano.
const SOBRENOMES_KR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const NOMES_KR = [
  "민준", "서연", "지후", "지우", "예준", "하윤", "도윤", "서윤",
  "시우", "지아", "주원", "수아", "건우", "다은", "현우", "채원",
];

export function gerarNameKR(rng) {
  return `${rndKr(rng, SOBRENOMES_KR)}${rndKr(rng, NOMES_KR)}`;
}

// --- 주민등록번호 (RRN): 13 dígitos -------------------------------------------
//
// Formato YYMMDD-SBBBBNC:
//   S = século + sexo (1/2 = 1900s M/F, 3/4 = 2000s M/F)
//   BBBB = bloco de origem, N = sequência, C = dígito verificador
//
// DV: pesos 2,3,4,5,6,7,8,9,2,3,4,5 sobre os 12 primeiros dígitos;
//     C = (11 - (soma mod 11)) mod 10.
const PESOS_RRN = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];

function dvRrn(dozeDigitos) {
  const soma = PESOS_RRN.reduce((acc, p, i) => acc + p * Number(dozeDigitos[i]), 0);
  return (11 - (soma % 11)) % 10;
}

export function validarRrn(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 13) return false;
  const mes = Number(d.slice(2, 4));
  const dia = Number(d.slice(4, 6));
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  if (!/[1-8]/.test(d[6])) return false;
  return dvRrn(d.slice(0, 12)) === Number(d[12]);
}

export function gerarRrn(rng, { mascara = false, nascimento = null } = {}) {
  // Sem nascimento fixado (uso avulso), sorteia um que exista.
  const { ano: anoCheio, mes, dia } = nascimento || (() => {
    const a = rng.inteiro(1960, 2005);
    const m = rng.inteiro(1, 12);
    return { ano: a, mes: m, dia: rng.inteiro(1, new Date(a, m, 0).getDate()) };
  })();

  const seculo2000 = anoCheio >= 2000;
  // 1/2 para quem nasceu no século XX, 3/4 para o XXI.
  const s = seculo2000 ? rng.inteiro(3, 4) : rng.inteiro(1, 2);

  const corpo =
    p2(anoCheio % 100) + p2(mes) + p2(dia) + String(s) +
    Array.from({ length: 5 }, () => rng.digito()).join("");

  const num = corpo + dvRrn(corpo);
  return mascara ? `${num.slice(0, 6)}-${num.slice(6)}` : num;
}

// --- 사업자등록번호 (Business Registration Number): 10 dígitos -----------------
//
// DV: pesos 1,3,7,1,3,7,1,3,5 sobre os 9 primeiros; soma-se ainda a dezena do
// produto do nono dígito por 5; C = (10 - (soma mod 10)) mod 10.
const PESOS_BRN = [1, 3, 7, 1, 3, 7, 1, 3, 5];

function dvBrn(noveDigitos) {
  let soma = PESOS_BRN.reduce((acc, p, i) => acc + p * Number(noveDigitos[i]), 0);
  soma += Math.floor((Number(noveDigitos[8]) * 5) / 10);
  return (10 - (soma % 10)) % 10;
}

export function validarBrn(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 10) return false;
  return dvBrn(d.slice(0, 9)) === Number(d[9]);
}

export function gerarBrn(rng, { mascara = false } = {}) {
  const nove = Array.from({ length: 9 }, () => rng.digito()).join("");
  const num = nove + dvBrn(nove);
  return mascara ? num.replace(/^(\d{3})(\d{2})(\d{5})$/, "$1-$2-$3") : num;
}

// --- 법인등록번호 (Corporate Registration Number): 13 dígitos ------------------
//
// DV: pesos alternados 1,2 sobre os 12 primeiros; C = (10 - (soma mod 10)) mod 10.
function dvCorpKr(dozeDigitos) {
  const soma = dozeDigitos
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 2), 0);
  return (10 - (soma % 10)) % 10;
}

export function validarCorpKr(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 13) return false;
  return dvCorpKr(d.slice(0, 12)) === Number(d[12]);
}

export function gerarCorpKr(rng, { mascara = false } = {}) {
  const doze = Array.from({ length: 12 }, () => rng.digito()).join("");
  const num = doze + dvCorpKr(doze);
  return mascara ? num.replace(/^(\d{6})(\d{7})$/, "$1-$2") : num;
}

// --- 우편번호 (código postal): 5 dígitos ---------------------------------------
//
// Sistema novo, em vigor desde 2015. Os dois primeiros identificam a região.
const PREFIXOS_POSTAL_KR = [
  "01", "02", "03", "04", "05", "06", "07", "08", // Seul
  "10", "11", "12", "13", "14", "15", "16", "17", // Gyeonggi
  "18", "19", "21", "22", "24", "25", "26", "27", // Incheon, Gangwon
  "28", "30", "31", "32", "33", "34", "35", "36", // Chungcheong, Daejeon
  "37", "38", "39", "41", "42", "43", "44", "46", // Gyeongbuk, Daegu, Busan
  "47", "48", "49", "50", "51", "52", "53", "54", // Busan, Gyeongnam
  "55", "56", "57", "58", "59", "61", "62", "63", // Jeolla, Gwangju, Jeju
];

export function gerarPostalKR(rng) {
  return rndKr(rng, PREFIXOS_POSTAL_KR) +
    Array.from({ length: 3 }, () => rng.digito()).join("");
}

// --- 전화번호 (celular): 010 + 8 dígitos ---------------------------------------
export function gerarPhoneKR(rng, { mascara = false } = {}) {
  const corpo = Array.from({ length: 8 }, () => rng.digito()).join("");
  const num = "010" + corpo;
  return mascara ? `010-${corpo.slice(0, 4)}-${corpo.slice(4)}` : num;
}

// --- 회사명 (nome de empresa) ---
const NEGOCIO_KR = ["대한", "한빛", "새한", "동방", "미래", "삼정", "우리"];
const RAMO_KR = ["전자", "물산", "건설", "통상", "산업", "테크"];

export function gerarCompanyKR(rng) {
  return `${rndKr(rng, NEGOCIO_KR)}${rndKr(rng, RAMO_KR)} 주식회사`;
}
