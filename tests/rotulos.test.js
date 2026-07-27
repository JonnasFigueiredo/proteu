// Rótulos de documento traduzíveis: garante que todo tipo, em todo país, tem
// uma `rotuloKey` que resolve para texto não-vazio nos 4 idiomas de interface.
// É o que permite ao QA fixar um idioma (ex.: pt) e ainda entender os campos
// de um país cujos dados estão em outro idioma (ex.: China).
import { describe, it, expect } from "vitest";
import { PAISES } from "../src/core/gerador.js";
import { IDIOMAS_UI, t, rotuloDoTipo } from "../src/core/i18n.js";

const CODIGOS = IDIOMAS_UI.map((i) => i.code); // ["pt","es","en","zh"]

describe("rótulos de documento — traduzíveis em todos os países", () => {
  for (const [cod, pais] of Object.entries(PAISES)) {
    for (const [tipo, def] of Object.entries(pais.tipos)) {
      it(`${cod}.${tipo} tem rotuloKey e resolve nos 4 idiomas`, () => {
        expect(def.rotuloKey, `${cod}.${tipo} sem rotuloKey`).toBeTruthy();
        for (const idioma of CODIGOS) {
          const r = rotuloDoTipo(def, idioma);
          expect(r, `${cod}.${tipo} vazio em ${idioma}`).toBeTruthy();
          // A chave nunca deve "vazar" (i.e. cair no próprio nome da chave).
          expect(r).not.toBe(def.rotuloKey);
        }
      });
    }
  }
});

describe("modo automático preserva o nome nativo do país", () => {
  // Fixar o idioma do próprio país deve dar o mesmo rótulo literal do registro.
  const NATIVO = { br: "pt", us: "en", ar: "es", ca: "en", cn: "zh", sa: "ar", mx: "es" };
  for (const [cod, idioma] of Object.entries(NATIVO)) {
    it(`${cod}: rótulo no idioma nativo (${idioma}) == rotulo literal`, () => {
      for (const [tipo, def] of Object.entries(PAISES[cod].tipos)) {
        expect(rotuloDoTipo(def, idioma), `${cod}.${tipo}`).toBe(def.rotulo);
      }
    });
  }
});

describe("cenário do QA: China com interface em português", () => {
  it("rótulos dos campos chineses aparecem em português", () => {
    const cn = PAISES.cn.tipos;
    expect(rotuloDoTipo(cn.nome, "pt")).toBe("Nome");
    expect(rotuloDoTipo(cn.idCard, "pt")).toBe("Nº de identidade");
    expect(rotuloDoTipo(cn.postal, "pt")).toBe("Código postal");
    expect(rotuloDoTipo(cn.uscc, "pt")).toBe("Registro de empresa (USCC)");
    // Em chinês (automático), os mesmos campos mantêm o nome nativo.
    expect(rotuloDoTipo(cn.idCard, "zh")).toBe("身份证号");
    expect(rotuloDoTipo(cn.uscc, "zh")).toBe("统一社会信用代码");
  });
});

describe("cenário do QA: Arábia Saudita com interface em português", () => {
  it("rótulos dos campos sauditas aparecem em português", () => {
    const sa = PAISES.sa.tipos;
    expect(rotuloDoTipo(sa.nome, "pt")).toBe("Nome");
    expect(rotuloDoTipo(sa.nationalId, "pt")).toBe("Documento nacional (ID)");
    expect(rotuloDoTipo(sa.cr, "pt")).toBe("Registro comercial (CR)");
    expect(rotuloDoTipo(sa.vat, "pt")).toBe("Nº de IVA (VAT)");
    // Em árabe (automático), os mesmos campos mantêm o nome nativo.
    expect(rotuloDoTipo(sa.nationalId, "ar")).toBe("الهوية الوطنية");
    expect(rotuloDoTipo(sa.vat, "ar")).toBe("الرقم الضريبي");
  });
});
