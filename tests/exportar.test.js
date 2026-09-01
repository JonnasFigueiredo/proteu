import { describe, it, expect } from "vitest";
import {
  gerarLote, paraCsv, paraJson, paraPlaywright, serializar, COLUNAS,
  SEPARADORES, separadorSugerido,
} from "../src/core/exportar.js";
import { validarCpf } from "../src/core/documents/cpf.js";

const cfg = (pais = "br", contador = 0) => ({
  pais, seed: "abc123", contador, documentos: { mascara: true },
});

describe("gerarLote", () => {
  it("gera a quantidade pedida e avança o contador uma vez por persona", () => {
    const lote = gerarLote(cfg("br", 10), 5);
    expect(lote.personas).toHaveLength(5);
    expect(lote.contadorInicial).toBe(10);
    expect(lote.proximoContador).toBe(15);
  });

  it("as personas do lote são distintas entre si", () => {
    const lote = gerarLote(cfg(), 20);
    const documentos = new Set(lote.personas.map((p) => p.documento));
    expect(documentos.size).toBe(20);
  });

  it("é reproduzível: mesma seed + contador ⇒ mesmo lote", () => {
    expect(gerarLote(cfg("br", 3), 10)).toEqual(gerarLote(cfg("br", 3), 10));
  });

  it("todo documento do lote é válido de verdade", () => {
    for (const p of gerarLote(cfg("br"), 50).personas) {
      expect(validarCpf(p.documento), p.documento).toBe(true);
    }
  });

  it("rejeita quantidade inválida", () => {
    expect(() => gerarLote(cfg(), 0)).toThrow();
    expect(() => gerarLote(cfg(), -1)).toThrow();
    expect(() => gerarLote(cfg(), 1.5)).toThrow();
    expect(() => gerarLote(cfg(), 1001)).toThrow();
  });
});

describe("CSV (RFC 4180)", () => {
  it("tem cabeçalho com os slots e uma linha por persona", () => {
    const csv = paraCsv(gerarLote(cfg(), 3));
    const linhas = csv.split("\n");
    expect(linhas).toHaveLength(4); // cabeçalho + 3
    expect(linhas[0].split(",")).toContain("nome");
    expect(linhas[0].split(",")).toContain("documento");
  });

  it("escapa aspas, vírgula e quebra de linha", () => {
    const lote = {
      personas: [{ nome: 'Ana "A" Silva', empresa: "Silva, Souza & Cia" }],
      seed: "s", pais: "br", contadorInicial: 0,
    };
    const csv = paraCsv(lote);
    expect(csv).toContain('"Ana ""A"" Silva"');
    expect(csv).toContain('"Silva, Souza & Cia"');
  });

  // Bug real: em português o Excel usa ponto e vírgula como separador de
  // listas, então o arquivo com vírgula abria com tudo empilhado na coluna A.
  it("aceita ponto e vírgula e escapa o separador em uso", () => {
    const lote = {
      personas: [{ nome: "Ana; Maria", empresa: "Silva, Souza & Cia" }],
      seed: "s", pais: "br", contadorInicial: 0,
    };
    const csv = paraCsv(lote, ";");
    expect(csv.split("\n")[0]).toBe("nome;empresa");
    // O ";" do valor precisa de aspas; a "," deixa de precisar.
    expect(csv).toContain('"Ana; Maria"');
    expect(csv).toContain("Silva, Souza & Cia");
    expect(csv).not.toContain('"Silva, Souza & Cia"');
  });

  it("separador desconhecido cai na vírgula em vez de corromper o arquivo", () => {
    const lote = { personas: [{ nome: "Ana", empresa: "X" }], seed: "s", pais: "br", contadorInicial: 0 };
    expect(paraCsv(lote, "|")).toBe(paraCsv(lote, ","));
    expect(SEPARADORES).toEqual([",", ";"]);
  });

  it("sugere o separador que o Excel do idioma espera", () => {
    for (const idioma of ["pt", "es", "de"]) expect(separadorSugerido(idioma)).toBe(";");
    for (const idioma of ["en", "zh", "hi", "ar"]) expect(separadorSugerido(idioma)).toBe(",");
  });

  it("o cabeçalho usa os slots (estáveis), não rótulos traduzidos", () => {
    const csv = paraCsv(gerarLote(cfg("cn"), 2)); // país com UI em chinês
    expect(csv.split("\n")[0]).toMatch(/^[a-zA-Z,]+$/);
  });
});

describe("JSON", () => {
  it("leva a seed junto — é o que torna o lote reproduzível", () => {
    const obj = JSON.parse(paraJson(gerarLote(cfg("br", 7), 2)));
    expect(obj.seed).toBe("abc123");
    expect(obj.pais).toBe("br");
    expect(obj.contadorInicial).toBe(7);
    expect(obj.personas).toHaveLength(2);
  });

  it("é JSON válido mesmo com aspas nos valores", () => {
    const json = paraJson({
      personas: [{ nome: 'Ana "A"' }], seed: "s", pais: "br", contadorInicial: 0,
    });
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("fixture de Playwright", () => {
  it("exporta um módulo com a seed no cabeçalho", () => {
    const js = paraPlaywright(gerarLote(cfg("br", 4), 2));
    expect(js).toContain("export const personas =");
    expect(js).toContain("seed: abc123");
    expect(js).toContain("contador 4");
  });

  it("o array exportado é JSON parseável", () => {
    const js = paraPlaywright(gerarLote(cfg(), 3));
    const corpo = js.slice(js.indexOf("["), js.lastIndexOf("]") + 1);
    expect(JSON.parse(corpo)).toHaveLength(3);
  });
});

describe("serializar", () => {
  it("respeita o formato pedido e cai em CSV se for desconhecido", () => {
    const lote = gerarLote(cfg(), 2);
    expect(serializar(lote, "json")).toBe(paraJson(lote));
    expect(serializar(lote, "playwright")).toBe(paraPlaywright(lote));
    expect(serializar(lote, "xyz")).toBe(paraCsv(lote));
  });
});

describe("todos os países exportam", () => {
  for (const pais of ["br", "us", "ca", "ar", "cn", "sa", "mx", "in", "de"]) {
    it(`${pais}: CSV tem cabeçalho e linhas preenchidas`, () => {
      const lote = gerarLote(cfg(pais), 3);
      const linhas = paraCsv(lote).split("\n");
      expect(linhas).toHaveLength(4);
      // Nenhuma linha pode sair só com vírgulas (persona vazia).
      for (const l of linhas.slice(1)) expect(l.replace(/,/g, "").trim()).toBeTruthy();
      expect(COLUNAS).toContain("documento");
    });
  }
});
