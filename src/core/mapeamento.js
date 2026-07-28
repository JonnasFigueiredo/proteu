// Mapeamento campo → slot da persona.
//
// Dado o descritor de um campo (o que o content script consegue ler do DOM),
// decide QUAL pedaço da persona vai ali. É o que separa "preencher com lixo"
// de "preencher com dado que passa na validação".
//
// Lógica pura: sem DOM, sem chrome.* — toda a decisão é testável em Node.
//
// Ordem de confiança (a primeira que casar vence):
//   1. autocomplete — é o padrão da web; quando existe, é a fonte mais confiável
//   2. type          — email/tel/date dizem muito sozinhos
//   3. texto do campo — name, id, placeholder, label, aria-label (multi-idioma)

// --- 1. autocomplete (WHATWG) → slot -----------------------------------------
const POR_AUTOCOMPLETE = {
  name: "nome",
  "given-name": "primeiroNome",
  "additional-name": "primeiroNome",
  "family-name": "sobrenome",
  nickname: "primeiroNome",
  username: "email",
  email: "email",
  tel: "telefone",
  "tel-national": "telefone",
  "postal-code": "postal",
  bday: "nascimento",
  organization: "empresa",
};

// --- 3. padrões textuais por slot (pt / en / es / de) -------------------------
// A ordem do array importa: o primeiro que casar vence. Slots mais específicos
// (documento, postal) vêm antes dos genéricos (nome) para evitar que um campo
// "Nome da empresa" caia em "nome".
const PADROES = [
  // Empresa antes de nome: "nome da empresa"/"company name" contêm "nome"/"name".
  { slot: "empresa", re: /(empresa|companhia|raz[aã]o.?social|company|business|organiza[cç][aã]o|organization|firma|unternehmen|razon.?social)/ },
  // Documento principal do país (siglas são inequívocas).
  { slot: "documento", re: /\b(cpf|ssn|dni|curp|rfc|nss|sin|aadhaar|pan|iban|steuer|hoyya|national.?id|tax.?id|documento|identidad|identidade|ausweis)\b/ },
  { slot: "email", re: /(e-?mail|correo|correio)/ },
  { slot: "telefone", re: /(telefone|telefono|tel[ée]fono|celular|m[oó]vil|phone|mobile|whatsapp|telefon|handy|\btel\b|\bfone\b)/ },
  { slot: "postal", re: /(cep|c[oó]digo.?postal|postal.?code|zip|\bplz\b|postleitzahl|pin.?code)/ },
  { slot: "nascimento", re: /(nascimento|nacimiento|birth|bday|geburt|dob|data.?nasc)/ },
  { slot: "sobrenome", re: /(sobrenome|apellido|last.?name|surname|family.?name|nachname)/ },
  { slot: "primeiroNome", re: /(primeiro.?nome|nombre|first.?name|given.?name|vorname)/ },
  // Nome genérico por último — é o padrão mais amplo.
  { slot: "nome", re: /(nome|name|nome.?completo|full.?name|titular)/ },
];

// Tipos de campo que nunca devem ser preenchidos automaticamente.
const TIPOS_IGNORADOS = new Set([
  "hidden", "submit", "reset", "button", "image", "file", "password",
  "checkbox", "radio", "color", "range",
]);

/** Junta os textos do campo num só, minúsculo e sem acento, para casar regex. */
function textoDoCampo(d) {
  return [d.autocomplete, d.name, d.id, d.placeholder, d.label, d.ariaLabel, d.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Campo que a extensão NUNCA preenche, nem no modo "preencher tudo": senha,
 * upload, botões, hidden, readonly/disabled. Distinguir isso de "não sei qual
 * slot é" importa — um campo de senha com lixo pode até ser submetido.
 */
export function ehIgnorado(d) {
  if (!d || typeof d !== "object") return true;
  const tipo = (d.type || "").toLowerCase();
  return TIPOS_IGNORADOS.has(tipo) || !!d.readonly || !!d.disabled;
}

/**
 * Decide o slot da persona para um campo.
 * @param {object} d - descritor do campo
 * @returns {string|null} nome do slot, ou null se não der para decidir
 */
export function slotDoCampo(d) {
  if (ehIgnorado(d)) return null;
  const tipo = (d.type || "").toLowerCase();

  // 1. autocomplete — o padrão da web. Pode vir como "shipping postal-code".
  const auto = String(d.autocomplete || "").toLowerCase().trim();
  if (auto && auto !== "off" && auto !== "on") {
    for (const token of auto.split(/\s+/)) {
      if (POR_AUTOCOMPLETE[token]) return POR_AUTOCOMPLETE[token];
    }
  }

  // 2. type nativo — email/tel/date são inequívocos.
  if (tipo === "email") return "email";
  if (tipo === "tel") return "telefone";
  if (tipo === "date") return "nascimento";

  // 3. texto do campo.
  const texto = textoDoCampo(d);
  if (texto) {
    for (const { slot, re } of PADROES) {
      if (re.test(texto)) return slot;
    }
  }

  return null;
}

/**
 * Converte uma data para o formato ISO que `<input type="date">` exige.
 *
 * Sem isto o navegador **descarta o valor em silêncio** — o campo fica vazio e
 * parece que a extensão não funcionou. Cada país escreve a data do seu jeito
 * (13/10/1953 no Brasil, 10/13/1953 nos EUA, 13.10.1953 na Alemanha), então o
 * país entra como desempate quando dia e mês são ambos ≤ 12.
 *
 * @returns {string|null} "YYYY-MM-DD", ou null se não der para converter
 */
export function paraDataIso(valor, pais) {
  const s = String(valor || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // já é ISO

  const partes = s.split(/[/.\-]/).map((p) => p.trim());
  if (partes.length !== 3 || partes.some((p) => !/^\d+$/.test(p))) return null;

  const [a, b, c] = partes.map(Number);
  if (String(partes[0]).length === 4) {
    // YYYY-MM-DD com outro separador
    return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
  }
  // Dia e mês: o que passa de 12 só pode ser dia.
  let dia = a;
  let mes = b;
  if (a > 12) { dia = a; mes = b; }
  else if (b > 12) { dia = b; mes = a; }
  else if (pais === "us") { mes = a; dia = b; } // MM/DD/AAAA
  const ano = c;
  if (!(mes >= 1 && mes <= 12) || !(dia >= 1 && dia <= 31)) return null;
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Monta o plano de preenchimento: para cada campo, qual valor entra.
 *
 * Campos sem slot reconhecido ficam de fora por padrão — encher tudo com lixo
 * é justamente o que as concorrentes fazem de errado. Com `preencherDesconhecidos`,
 * eles recebem um texto genérico (útil para "só quero o form completo").
 *
 * @param {Array<object>} campos - descritores vindos do content script (com .indice)
 * @param {object} persona - saída de gerarPersona()
 * @param {{preencherDesconhecidos?: boolean, textoGenerico?: string}} [opcoes]
 * @returns {{plano: Array<{indice,slot,valor}>, ignorados: number}}
 */
export function planejarPreenchimento(campos, persona, opcoes = {}) {
  const { preencherDesconhecidos = false, textoGenerico = "teste" } = opcoes;
  const porSlot = (persona && persona.porSlot) || {};
  const plano = [];
  let ignorados = 0;

  for (const campo of campos || []) {
    // Senha/upload/readonly ficam de fora sempre — nem o modo "preencher tudo"
    // encosta neles.
    if (ehIgnorado(campo)) {
      ignorados++;
      continue;
    }
    const slot = slotDoCampo(campo);
    let valor = slot ? porSlot[slot] : undefined;

    if (valor === undefined || valor === null || valor === "") {
      if (!preencherDesconhecidos) {
        ignorados++;
        continue;
      }
      valor = textoGenerico;
    }

    // <input type="date"> só aceita ISO; qualquer outro formato é descartado
    // pelo navegador sem aviso.
    if ((campo.type || "").toLowerCase() === "date") {
      const iso = paraDataIso(valor, persona && persona.pais);
      if (!iso) {
        ignorados++;
        continue;
      }
      valor = iso;
    }

    plano.push({ indice: campo.indice, slot: slot || null, valor: String(valor) });
  }

  return { plano, ignorados };
}
