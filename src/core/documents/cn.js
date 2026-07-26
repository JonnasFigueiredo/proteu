// China — geradores de documentos de pessoa e empresa. Rótulos em chinês.
// Determinísticos (recebem um rng de core/seed.js).

const ehBissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const diasNoMes = (m, a) =>
  [31, ehBissexto(a) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
const p2 = (n) => String(n).padStart(2, "0");

// --- Nome (姓 + 名) ---
const SOBRENOMES = [
  "王", "李", "张", "刘", "陈", "杨", "黄", "赵", "吴", "周", "徐", "孙", "马",
  "朱", "胡", "郭", "何", "高", "林", "罗", "郑", "梁", "谢", "宋", "唐",
];
const NOMES = [
  "伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "军", "洋", "勇", "艳", "杰",
  "娟", "涛", "明", "超", "霞", "平", "刚", "秀英", "桂英", "建华", "文", "浩",
];
export function gerarNomeCN(rng) {
  return rng.escolher(SOBRENOMES) + rng.escolher(NOMES);
}

// --- Documento de identidade (居民身份证): 18 dígitos, DV ISO 7064 MOD 11-2 ---
const REGIOES = [
  "110101", "310101", "440305", "330106", "510107", "320106", "420106",
  "610103", "440101", "500103", "120101", "210102", "370102", "510104",
];
const PESOS_ID = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_ID = "10X98765432";

function dvId(base17) {
  let s = 0;
  for (let i = 0; i < 17; i++) s += Number(base17[i]) * PESOS_ID[i];
  return CHECK_ID[s % 11];
}

export function gerarIdCardCN(rng) {
  const regiao = rng.escolher(REGIOES);
  const ano = rng.inteiro(1950, 2007); // maior de idade (base ~2026)
  const mes = rng.inteiro(1, 12);
  const dia = rng.inteiro(1, diasNoMes(mes, ano));
  const nasc = `${ano}${p2(mes)}${p2(dia)}`;
  const seq = String(rng.inteiro(1, 999)).padStart(3, "0");
  const base = regiao + nasc + seq; // 17 caracteres
  return base + dvId(base);
}

export function validarIdCardCN(valor) {
  const d = String(valor).toUpperCase().replace(/\s/g, "");
  if (!/^\d{17}[\dX]$/.test(d)) return false;
  return dvId(d.slice(0, 17)) === d[17];
}

// --- USCC (统一社会信用代码): 18 caracteres, DV ISO 7064 MOD 31-3 ---
// Alfabeto de 31 símbolos (exclui I, O, S, V, Z).
const USCC_CHARS = "0123456789ABCDEFGHJKLMNPQRTUWXY";
const PESOS_USCC = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];

function dvUscc(base17) {
  let s = 0;
  for (let i = 0; i < 17; i++) s += USCC_CHARS.indexOf(base17[i]) * PESOS_USCC[i];
  let c = 31 - (s % 31);
  if (c === 31) c = 0;
  return USCC_CHARS[c];
}

export function gerarUscc(rng) {
  const dept = rng.escolher([..."159Y"]); // departamento de registro
  const categoria = rng.escolher([..."123459"]); // categoria da organização
  const regiao = Array.from({ length: 6 }, () => rng.digito()).join("");
  const orgCode = Array.from({ length: 9 }, () => rng.escolher([...USCC_CHARS])).join("");
  const base = dept + categoria + regiao + orgCode; // 17 caracteres
  return base + dvUscc(base);
}

export function validarUscc(valor) {
  const d = String(valor).toUpperCase();
  if (d.length !== 18) return false;
  if (![...d].every((ch) => USCC_CHARS.includes(ch))) return false;
  return dvUscc(d.slice(0, 17)) === d[17];
}

// --- Código postal: 6 dígitos (1º dígito 1–8) ---
export function gerarPostalCN(rng) {
  return String(rng.inteiro(1, 8)) + Array.from({ length: 5 }, () => rng.digito()).join("");
}

// --- Telefone celular: 11 dígitos, começa em 1[3-9] ---
export function gerarTelefoneCN(rng, { mascara = false } = {}) {
  const num = "1" + rng.inteiro(3, 9) + Array.from({ length: 9 }, () => rng.digito()).join("");
  return mascara ? `${num.slice(0, 3)} ${num.slice(3, 7)} ${num.slice(7)}` : num;
}

// --- Razão social ---
const CIDADES = ["北京", "上海", "深圳", "广州", "杭州", "成都", "南京", "武汉"];
const FANTASIA = ["华星", "恒信", "锦程", "天成", "泰和", "鑫源", "昊天", "博远", "盛通", "嘉禾"];
const RAMO = ["科技", "贸易", "信息", "网络", "实业", "电子", "智能", "文化"];
const TIPO = ["有限公司", "股份有限公司"];
export function gerarRazaoSocialCN(rng) {
  return rng.escolher(CIDADES) + rng.escolher(FANTASIA) + rng.escolher(RAMO) + rng.escolher(TIPO);
}
