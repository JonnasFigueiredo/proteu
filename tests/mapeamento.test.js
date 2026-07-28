import { describe, it, expect } from "vitest";
import { slotDoCampo, planejarPreenchimento, paraDataIso } from "../src/core/mapeamento.js";
import { gerarPersona } from "../src/core/persona.js";

const campo = (extra) => ({ tag: "input", type: "text", indice: 0, ...extra });

describe("mapeamento — autocomplete tem prioridade (padrão da web)", () => {
  it("reconhece os tokens do WHATWG", () => {
    expect(slotDoCampo(campo({ autocomplete: "email" }))).toBe("email");
    expect(slotDoCampo(campo({ autocomplete: "given-name" }))).toBe("primeiroNome");
    expect(slotDoCampo(campo({ autocomplete: "family-name" }))).toBe("sobrenome");
    expect(slotDoCampo(campo({ autocomplete: "tel" }))).toBe("telefone");
    expect(slotDoCampo(campo({ autocomplete: "postal-code" }))).toBe("postal");
    expect(slotDoCampo(campo({ autocomplete: "organization" }))).toBe("empresa");
  });
  it("entende autocomplete composto (ex.: 'shipping postal-code')", () => {
    expect(slotDoCampo(campo({ autocomplete: "shipping postal-code" }))).toBe("postal");
  });
  it("ignora autocomplete='off' e cai nas outras heurísticas", () => {
    expect(slotDoCampo(campo({ autocomplete: "off", name: "email" }))).toBe("email");
  });
});

describe("mapeamento — type nativo", () => {
  it("email/tel/date são inequívocos", () => {
    expect(slotDoCampo(campo({ type: "email" }))).toBe("email");
    expect(slotDoCampo(campo({ type: "tel" }))).toBe("telefone");
    expect(slotDoCampo(campo({ type: "date" }))).toBe("nascimento");
  });
});

describe("mapeamento — texto do campo, multi-idioma", () => {
  it("acha o slot por name, id, placeholder, label ou aria-label", () => {
    expect(slotDoCampo(campo({ name: "nome_completo" }))).toBe("nome");
    expect(slotDoCampo(campo({ id: "user-email" }))).toBe("email");
    expect(slotDoCampo(campo({ placeholder: "Digite seu CPF" }))).toBe("documento");
    expect(slotDoCampo(campo({ label: "Código postal" }))).toBe("postal");
    expect(slotDoCampo(campo({ ariaLabel: "Telefone celular" }))).toBe("telefone");
  });

  it("funciona em inglês, espanhol e alemão", () => {
    expect(slotDoCampo(campo({ label: "Full name" }))).toBe("nome");
    expect(slotDoCampo(campo({ label: "Apellido" }))).toBe("sobrenome");
    expect(slotDoCampo(campo({ label: "Vorname" }))).toBe("primeiroNome");
    expect(slotDoCampo(campo({ label: "PLZ" }))).toBe("postal");
    expect(slotDoCampo(campo({ label: "Date of birth" }))).toBe("nascimento");
  });

  it("é insensível a acento e caixa", () => {
    expect(slotDoCampo(campo({ label: "TELEFONE" }))).toBe("telefone");
    expect(slotDoCampo(campo({ label: "Teléfono" }))).toBe("telefone");
  });

  it("'nome da empresa' vai para empresa, não para nome", () => {
    expect(slotDoCampo(campo({ label: "Nome da empresa" }))).toBe("empresa");
    expect(slotDoCampo(campo({ label: "Company name" }))).toBe("empresa");
    expect(slotDoCampo(campo({ name: "razao_social" }))).toBe("empresa");
  });

  it("reconhece os documentos dos países suportados", () => {
    for (const sigla of ["CPF", "SSN", "DNI", "CURP", "RFC", "Aadhaar", "IBAN"]) {
      expect(slotDoCampo(campo({ label: sigla })), sigla).toBe("documento");
    }
  });
});

describe("mapeamento — o que NÃO deve ser tocado", () => {
  it("ignora senha, hidden, submit, checkbox, file…", () => {
    for (const type of ["password", "hidden", "submit", "checkbox", "radio", "file", "button"]) {
      expect(slotDoCampo(campo({ type, name: "nome" })), type).toBeNull();
    }
  });
  it("ignora readonly e disabled", () => {
    expect(slotDoCampo(campo({ name: "nome", readonly: true }))).toBeNull();
    expect(slotDoCampo(campo({ name: "nome", disabled: true }))).toBeNull();
  });
  it("devolve null quando não dá para decidir", () => {
    expect(slotDoCampo(campo({ name: "campo_xyz_123" }))).toBeNull();
    expect(slotDoCampo(null)).toBeNull();
  });
});

describe("paraDataIso — <input type=date> só aceita ISO", () => {
  it("converte os formatos dos países suportados", () => {
    expect(paraDataIso("13/10/1953", "br")).toBe("1953-10-13"); // DD/MM
    expect(paraDataIso("13.10.1953", "de")).toBe("1953-10-13"); // DD.MM
    expect(paraDataIso("1953-10-13", "cn")).toBe("1953-10-13"); // já ISO
  });
  it("usa o país para desempatar quando dia e mês são ambos ≤ 12", () => {
    expect(paraDataIso("05/10/1953", "br")).toBe("1953-10-05"); // 5 de outubro
    expect(paraDataIso("05/10/1953", "us")).toBe("1953-05-10"); // 10 de maio
  });
  it("quando um dos números passa de 12, não há ambiguidade", () => {
    expect(paraDataIso("10/13/1953", "us")).toBe("1953-10-13");
    expect(paraDataIso("13/10/1953", "us")).toBe("1953-10-13");
  });
  it("devolve null no que não é data", () => {
    expect(paraDataIso("não é data", "br")).toBeNull();
    expect(paraDataIso("", "br")).toBeNull();
    expect(paraDataIso("99/99/1953", "br")).toBeNull();
  });
});

describe("planejarPreenchimento", () => {
  const persona = gerarPersona({
    pais: "br", seed: "abc123", contador: 0, documentos: { mascara: true },
  });

  const campos = [
    { indice: 0, tag: "input", type: "text", name: "nome" },
    { indice: 1, tag: "input", type: "email", name: "email" },
    { indice: 2, tag: "input", type: "text", placeholder: "CPF" },
    { indice: 3, tag: "input", type: "password", name: "senha" },
    { indice: 4, tag: "input", type: "text", name: "campo_misterioso" },
  ];

  it("preenche o que reconhece e deixa o resto de fora", () => {
    const { plano, ignorados } = planejarPreenchimento(campos, persona);
    expect(plano.map((p) => p.indice)).toEqual([0, 1, 2]);
    expect(ignorados).toBe(2); // senha + campo misterioso
    expect(plano[0].valor).toBe(persona.porSlot.nome);
    expect(plano[1].valor).toBe(persona.porSlot.email);
    expect(plano[2].valor).toBe(persona.porSlot.documento);
  });

  it("com preencherDesconhecidos, completa o campo desconhecido", () => {
    const { plano } = planejarPreenchimento(campos, persona, { preencherDesconhecidos: true });
    const misterioso = plano.find((p) => p.indice === 4);
    expect(misterioso.valor).toBe("teste");
    expect(misterioso.slot).toBeNull();
  });

  it("NUNCA toca em campo de senha, nem no modo preencher tudo", () => {
    const { plano } = planejarPreenchimento(campos, persona, { preencherDesconhecidos: true });
    expect(plano.find((p) => p.indice === 3)).toBeUndefined();
  });

  it("NUNCA toca em readonly/disabled, nem no modo preencher tudo", () => {
    const travados = [
      { indice: 0, tag: "input", type: "text", name: "nome", readonly: true },
      { indice: 1, tag: "input", type: "text", name: "email", disabled: true },
    ];
    const { plano, ignorados } = planejarPreenchimento(travados, persona, {
      preencherDesconhecidos: true,
    });
    expect(plano).toHaveLength(0);
    expect(ignorados).toBe(2);
  });

  it("nunca devolve valor não-string", () => {
    const { plano } = planejarPreenchimento(campos, persona);
    for (const p of plano) expect(typeof p.valor).toBe("string");
  });

  it("campo type=date recebe a data em ISO (senão o navegador descarta)", () => {
    const comData = [{ indice: 0, tag: "input", type: "date", name: "nascimento" }];
    const { plano } = planejarPreenchimento(comData, persona);
    expect(plano).toHaveLength(1);
    expect(plano[0].valor).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
