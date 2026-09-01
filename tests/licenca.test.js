// Licenciamento.
//
// O projeto afirma, no README e na descrição da loja, que é código aberto. Sem
// arquivo de licença isso é falso — o padrão legal é "todos os direitos
// reservados". Estes testes mantêm a promessa e a realidade juntas.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");

const LICENCA = "AGPL-3.0-or-later";
const TITULAR = "Jonnas Figueiredo";

describe("licença — os arquivos existem e são os oficiais", () => {
  it("LICENSE é o texto da GNU AGPL 3.0", () => {
    const txt = ler("LICENSE");
    expect(txt).toContain("GNU AFFERO GENERAL PUBLIC LICENSE");
    expect(txt).toContain("Version 3, 19 November 2007");
    // A seção 13 é o que distingue a AGPL da GPL comum: quem roda o programa
    // em rede também precisa oferecer a fonte. Copiar o texto errado aqui é um
    // engano fácil e silencioso, porque o resto das duas licenças é igual.
    expect(txt).toContain("13. Remote Network Interaction");
    expect(txt).toContain("15. Disclaimer of Warranty");
    expect(txt).toContain("END OF TERMS AND CONDITIONS");
    // O texto canônico tem ~34 KB; muito menos indica versão truncada.
    expect(txt.length).toBeGreaterThan(30000);
  });

  it("NOTICE traz o titular do copyright e aponta para a licença", () => {
    const txt = ler("NOTICE");
    expect(txt).toContain(TITULAR);
    expect(txt).toMatch(/Copyright \(C\) \d{4}/);
    expect(txt).toContain("GNU Affero General Public License");
  });

  it("o NOTICE diz onde está a fonte — a AGPL exige que ela seja alcancavel", () => {
    expect(ler("NOTICE")).toMatch(/github\.com\/\S+/);
  });

  it("o NOTICE preserva os avisos que protegem o autor e o usuário", () => {
    const txt = ler("NOTICE");
    expect(txt, "aviso de dados fictícios").toMatch(/FICT[ÍI]CIOS/i);
    expect(txt, "aviso de uso defensivo dos payloads").toMatch(/defensivo/i);
    expect(txt, "reserva de marca").toMatch(/MARCAS|marca/);
  });
});

describe("licença — coerência com o que o projeto declara", () => {
  it("package.json declara a mesma licença e o autor", () => {
    const pkg = JSON.parse(ler("package.json"));
    expect(pkg.license).toBe(LICENCA);
    expect(pkg.author).toContain(TITULAR);
  });

  it("o README aponta para a licença, sem 'a definir'", () => {
    const readme = ler("README.md");
    expect(readme).toContain("AGPL-3.0");
    expect(readme).toContain("(LICENSE)");
    expect(readme).not.toMatch(/A definir/i);
  });

  it("se algum texto público diz 'código aberto', a licença existe", () => {
    // Antes isto olhava só o PUBLICACAO.md. Ele saiu do projeto, mas a promessa
    // continua podendo aparecer em qualquer texto que vai para fora — e
    // prometer abertura sem LICENSE é promessa que não se cumpre.
    const publicos = ["README.md", "NOTICE"];
    const pastaDocs = path.join(RAIZ, "docs");
    if (fs.existsSync(pastaDocs)) {
      // Só arquivos de texto: docs/ também guarda as imagens da listagem, e
      // varrer a pasta inteira faria o teste tentar ler um diretório.
      for (const e of fs.readdirSync(pastaDocs, { withFileTypes: true })) {
        if (e.isFile() && /\.(md|txt)$/i.test(e.name)) publicos.push(`docs/${e.name}`);
      }
    }

    const prometem = publicos.filter((rel) =>
      /c[óo]digo\s+(é\s+)?aberto|open[- ]source/i.test(ler(rel))
    );

    if (prometem.length) {
      expect(
        fs.existsSync(path.join(RAIZ, "LICENSE")),
        `${prometem.join(", ")} prometem código aberto, mas não há LICENSE`
      ).toBe(true);
    }
  });
});
