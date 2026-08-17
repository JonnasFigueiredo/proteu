import { describe, it, expect } from "vitest";
import { gerarPersona, usuarioDeEmail } from "../src/core/persona.js";
import { PAISES } from "../src/core/gerador.js";
import { validarCpf } from "../src/core/documents/cpf.js";
import { validarAadhaar } from "../src/core/documents/in.js";
import { validarSsn } from "../src/core/documents/us.js";

const cfg = (pais, contador = 0) => ({
  pais, seed: "abc123", contador, documentos: { mascara: true },
  insercao: { modo: "valor" }, tema: "auto", idiomaFixo: null,
});

describe("usuarioDeEmail", () => {
  it("normaliza acentos e monta primeiro.ultimo", () => {
    expect(usuarioDeEmail("María José Souza")).toBe("maria.souza");
    expect(usuarioDeEmail("João Silva")).toBe("joao.silva");
    expect(usuarioDeEmail("Ana")).toBe("ana");
  });
  it("devolve vazio para escrita não-latina (sem transliteração offline)", () => {
    expect(usuarioDeEmail("朱磊")).toBe("");
    expect(usuarioDeEmail("نورة الزهراني")).toBe("");
  });
});

describe("persona — coerência", () => {
  it("o e-mail é derivado do nome", () => {
    const p = gerarPersona(cfg("br"));
    const nome = p.porSlot.nome;
    const esperado = `${usuarioDeEmail(nome)}@example.com`;
    expect(p.porSlot.email).toBe(esperado);
  });

  it("nome não-latino cai no e-mail de fallback, ainda válido", () => {
    for (const pais of ["cn", "sa"]) {
      const p = gerarPersona(cfg(pais));
      expect(p.porSlot.email).toMatch(/^usuario\d{4}@example\.com$/);
    }
  });

  it("o código postal entra mesmo tendo nome próprio (CEP/ZIP/CPA)", () => {
    // Regressão: o slot só procurava doc_postal e deixava BR/US/AR sem CEP.
    for (const pais of ["br", "us", "ar", "mx", "de", "in", "cn", "ca", "sa"]) {
      expect(gerarPersona(cfg(pais)).porSlot.postal, pais).toBeTruthy();
    }
  });

  it("o documento principal do país é válido de verdade", () => {
    expect(validarCpf(gerarPersona(cfg("br")).porSlot.documento)).toBe(true);
    expect(validarSsn(gerarPersona(cfg("us")).porSlot.documento)).toBe(true);
    expect(validarAadhaar(gerarPersona(cfg("in")).porSlot.documento)).toBe(true);
  });
});

describe("persona — reprodutibilidade", () => {
  it("mesma seed + contador ⇒ persona idêntica", () => {
    expect(gerarPersona(cfg("br", 7))).toEqual(gerarPersona(cfg("br", 7)));
  });
  it("contador diferente ⇒ persona diferente", () => {
    expect(gerarPersona(cfg("br", 1)).porSlot.nome).not.toBe(
      gerarPersona(cfg("br", 2)).porSlot.nome
    );
  });
  it("avança o contador uma única vez (a persona toda é 1 geração)", () => {
    const p = gerarPersona(cfg("br", 5));
    expect(p.contador).toBe(5);
    expect(p.proximoContador).toBe(6);
  });
});

describe("persona — funciona em todos os países", () => {
  for (const codigo of Object.keys(PAISES)) {
    it(`${codigo}: tem nome, e-mail e documento principal preenchidos`, () => {
      const p = gerarPersona(cfg(codigo));
      expect(p.porSlot.nome, "nome").toBeTruthy();
      expect(p.porSlot.email, "email").toMatch(/@example\.com$/);
      expect(p.porSlot.documento, "documento").toBeTruthy();
      // Nenhum campo pode sair vazio ou indefinido.
      for (const c of p.campos) {
        expect(c.valor, `${codigo}.${c.slot}`).toBeTruthy();
        expect(c.slot).toBeTruthy();
      }
    });
  }
});

describe("persona — trocar formato não troca a pessoa", () => {
  // O popup reaplica as opções de formato à persona que já está na tela, sem
  // avançar o contador. É o que faz "Com máscara" atualizar o CPF logo abaixo
  // do interruptor sem sortear outra pessoa — a QA pediu outro formato, não
  // outra pessoa.
  const base = {
    pais: "br",
    seed: "formato",
    contador: 7,
    documentos: { mascara: false, cnpjAlfanumerico: false, cnpjExcluirAmbiguas: false },
  };
  const com = (opcoes) =>
    gerarPersona({ ...base, documentos: { ...base.documentos, ...opcoes } });

  const soAlfanumerico = (v) => String(v || "").replace(/[^\dA-Za-z]/g, "");
  const doc = (p, chave) => p.campos.find((c) => c.rotuloKey === chave)?.valor;

  it("a pessoa é a mesma com e sem máscara", () => {
    const a = com({ mascara: false });
    const b = com({ mascara: true });
    expect(b.porSlot.nome).toBe(a.porSlot.nome);
    expect(b.porSlot.primeiroNome).toBe(a.porSlot.primeiroNome);
    expect(doc(b, "doc_nascimento")).toBe(doc(a, "doc_nascimento"));
  });

  it("o contador não avança ao reformatar", () => {
    // Avançar aqui trocaria a pessoa exibida a cada clique no interruptor.
    const a = com({ mascara: false });
    const b = com({ mascara: true });
    expect(b.contador).toBe(a.contador);
    expect(b.contador).toBe(base.contador);
  });

  it("a máscara muda só a forma: os dígitos por trás são os mesmos", () => {
    const a = com({ mascara: false });
    const b = com({ mascara: true });
    const cpfA = doc(a, "doc_cpf");
    const cpfB = doc(b, "doc_cpf");
    expect(cpfA).not.toBe(cpfB); // a forma mudou
    expect(soAlfanumerico(cpfB)).toBe(soAlfanumerico(cpfA)); // o número não
    expect(cpfB).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
  });

  it("ligar o CNPJ alfanumérico mantém a pessoa e troca só o CNPJ", () => {
    const a = com({ cnpjAlfanumerico: false });
    const b = com({ cnpjAlfanumerico: true });
    expect(b.porSlot.nome).toBe(a.porSlot.nome);
    expect(soAlfanumerico(doc(b, "doc_cnpj"))).toMatch(/[A-Z]/);
    expect(soAlfanumerico(doc(a, "doc_cnpj"))).toMatch(/^\d+$/);
  });
});

describe("persona — a reprodutibilidade não pode vazar para Math.random", () => {
  // A promessa da extensão é "mesma seed, mesma pessoa". Basta um gerador novo
  // chamar Math.random() para ela virar mentira — e de um jeito que os testes
  // de igualdade não pegam, porque comparar duas gerações seguidas continua
  // passando enquanto o resto do campo diverge. Aqui a chamada estoura.
  const semMathRandom = (fn) => {
    const original = Math.random;
    Math.random = () => {
      throw new Error("Math.random() foi chamado: a geração deixou de ser reproduzível");
    };
    try {
      fn();
    } finally {
      Math.random = original;
    }
  };

  it("nenhum país usa Math.random ao gerar persona", () => {
    semMathRandom(() => {
      for (const codigo of Object.keys(PAISES)) {
        for (let contador = 0; contador < 25; contador++) {
          gerarPersona(cfg(codigo, contador));
        }
      }
    });
  });

  it("nem com máscara e CNPJ alfanumérico ligados", () => {
    semMathRandom(() => {
      for (const codigo of Object.keys(PAISES)) {
        gerarPersona({
          ...cfg(codigo, 3),
          documentos: { mascara: true, cnpjAlfanumerico: true },
        });
      }
    });
  });
});

describe("persona — reproduzir do meio de uma sequência", () => {
  // O fluxo real: a QA gera várias pessoas, anota a seed e o contador daquela
  // que quebrou, e o dev precisa recuperar SÓ ela — sem regerar as anteriores.
  // Se o contador não bastasse, o relato de bug perderia o dado.

  it("a 7ª pessoa da sequência é recuperável sozinha", () => {
    const c = cfg("br");
    let contadorDaSetima = null;
    let setima = null;

    for (let i = 0; i < 10; i++) {
      const p = gerarPersona(c);
      if (i === 6) {
        setima = p.porSlot;
        contadorDaSetima = p.contador;
      }
      c.contador = p.proximoContador;
    }

    const recuperada = gerarPersona(cfg("br", contadorDaSetima)).porSlot;
    expect(recuperada).toEqual(setima);
  });

  it("uma sequência inteira é refeita igual em outra execução", () => {
    const rodar = () => {
      const c = cfg("br");
      const nomes = [];
      for (let i = 0; i < 20; i++) {
        const p = gerarPersona(c);
        nomes.push(p.porSlot.nome);
        c.contador = p.proximoContador;
      }
      return nomes;
    };
    expect(rodar()).toEqual(rodar());
  });

  it("20 gerações seguidas não repetem a mesma pessoa", () => {
    // Contador que não avança daria 20 clones — e o bug passaria despercebido
    // porque cada geração isolada continua "correta".
    const c = cfg("br");
    const nomes = new Set();
    for (let i = 0; i < 20; i++) {
      const p = gerarPersona(c);
      nomes.add(`${p.porSlot.nome}|${p.porSlot.cpf}`);
      c.contador = p.proximoContador;
    }
    expect(nomes.size).toBe(20);
  });
});
