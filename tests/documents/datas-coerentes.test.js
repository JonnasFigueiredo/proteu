import { describe, it, expect } from "vitest";
import { datasDaPersona, nascimentoDaPersona, admissaoDaPersona } from "../../src/core/documents/datas.js";
import { gerarPersona } from "../../src/core/persona.js";
import { PAISES } from "../../src/core/gerador.js";

const cfg = (contador, seed = "datas") => ({ seed, contador });

describe("datas da persona — admissão nunca antes de poder trabalhar", () => {
  // Bug real e visível na tela: uma persona nascida em 2006 e admitida em 2003,
  // contratada três anos antes de nascer. Cada data, isolada, era válida — por
  // isso passou despercebido. As duas eram sorteadas sem se enxergarem.

  it("em 3000 personas, a admissão nunca precede o nascimento", () => {
    for (let i = 0; i < 3000; i++) {
      const { nascimento: n, admissao: a } = datasDaPersona(cfg(i));
      const nasc = new Date(n.ano, n.mes - 1, n.dia);
      const adm = new Date(a.ano, a.mes - 1, a.dia);
      expect(adm.getTime(), `#${i}: nasceu ${nasc.toISOString()} e foi admitido ${adm.toISOString()}`)
        .toBeGreaterThan(nasc.getTime());
    }
  });

  it("a pessoa tem pelo menos 16 anos na admissão", () => {
    for (let i = 0; i < 3000; i++) {
      const { nascimento: n, admissao: a } = datasDaPersona(cfg(i));
      let idade = a.ano - n.ano;
      if (a.mes < n.mes || (a.mes === n.mes && a.dia < n.dia)) idade -= 1;
      expect(idade, `#${i}: admitido com ${idade} anos`).toBeGreaterThanOrEqual(16);
    }
  });

  it("a admissão não cai no futuro", () => {
    for (let i = 0; i < 1000; i++) {
      const { admissao: a } = datasDaPersona(cfg(i));
      expect(a.ano).toBeLessThanOrEqual(2026);
    }
  });

  it("as datas geradas existem no calendário", () => {
    // 31 de fevereiro passa em qualquer validação de formato e quebra no parse.
    for (let i = 0; i < 2000; i++) {
      const d = datasDaPersona(cfg(i));
      for (const [rotulo, x] of Object.entries(d)) {
        const dt = new Date(x.ano, x.mes - 1, x.dia);
        expect(dt.getMonth() + 1, `${rotulo} #${i} não existe`).toBe(x.mes);
        expect(dt.getDate()).toBe(x.dia);
      }
    }
  });

  it("é determinística: mesma seed e contador, mesmas datas", () => {
    for (const i of [0, 7, 42, 999]) {
      expect(datasDaPersona(cfg(i))).toEqual(datasDaPersona(cfg(i)));
    }
  });

  it("seeds diferentes dão datas diferentes", () => {
    const vistas = new Set();
    for (let i = 0; i < 200; i++) {
      const d = datasDaPersona(cfg(i));
      vistas.add(`${d.nascimento.ano}-${d.nascimento.mes}-${d.nascimento.dia}`);
    }
    expect(vistas.size).toBeGreaterThan(150);
  });
});

describe("formatação por país", () => {
  it("respeita a convenção de cada formato", () => {
    expect(nascimentoDaPersona(cfg(1), "br")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(nascimentoDaPersona(cfg(1), "us")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(nascimentoDaPersona(cfg(1), "iso")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nascimentoDaPersona(cfg(1), "de")).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it("o formato muda a escrita, não a data", () => {
    const { nascimento: n } = datasDaPersona(cfg(5));
    const iso = nascimentoDaPersona(cfg(5), "iso");
    expect(iso).toBe(
      `${n.ano}-${String(n.mes).padStart(2, "0")}-${String(n.dia).padStart(2, "0")}`
    );
  });

  it("nascimento e admissão vêm da mesma derivação", () => {
    const d = datasDaPersona(cfg(11));
    expect(admissaoDaPersona(cfg(11), "iso")).toBe(
      `${d.admissao.ano}-${String(d.admissao.mes).padStart(2, "0")}-${String(d.admissao.dia).padStart(2, "0")}`
    );
  });
});

describe("todos os 12 países entregam datas coerentes", () => {
  // A coerência não pode depender do arranjo do registro de cada país: antes,
  // qualquer ordem de campos produzia o mesmo sorteio independente.
  const base = { documentos: { mascara: false }, insercao: { modo: "valor" }, tema: "auto", idiomaFixo: null };
  const anoDe = (v) => Number(String(v).match(/\d{4}/)[0]);

  for (const pais of Object.keys(PAISES)) {
    it(`${pais}: ninguém é admitido antes de nascer`, () => {
      for (let contador = 0; contador < 60; contador++) {
        const p = gerarPersona({ ...base, pais, seed: "paises", contador });
        const n = p.campos.find((c) => c.rotuloKey === "doc_nascimento");
        const a = p.campos.find((c) => c.rotuloKey === "doc_admissao");
        if (!n || !a) return; // país sem um dos campos
        expect(anoDe(a.valor) - anoDe(n.valor), `${pais} #${contador}: ${n.valor} → ${a.valor}`)
          .toBeGreaterThanOrEqual(16);
      }
    });
  }
});
