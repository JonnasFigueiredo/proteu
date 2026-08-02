# Chrome Web Store — Listing

Use this content when filling out the Chrome Web Store developer dashboard.

---

## Name

Proteu QA

## Short description (132 chars max)

Dados de teste, seletores e preenchimento de formulários para QA. 100% offline, sem coleta de dados.

## Detailed description

Proteu QA é um toolkit completo para QA que roda inteiramente no navegador — sem rede, sem dependências, sem coleta de dados.

🧑 PERSONAS REALISTAS
Gere CPF, CNPJ, RG, CNH, SSN, DNI, CUIT e dezenas de outros documentos válidos para 10 países (Brasil, EUA, Argentina, Chile, México, Uruguai, Paraguai, Canadá, China, Índia, Alemanha e Arábia Saudita). Cada persona vem com nome, data de nascimento, telefone e e-mail. Tudo determinístico: a mesma seed gera exatamente a mesma pessoa.

📝 PREENCHIMENTO DE FORMULÁRIOS
Um clique preenche todos os campos que a extensão reconhece (nome, CPF, e-mail, telefone, data, CEP...). Funciona com React, Vue e formulários nativos.

🔍 SELETORES DE ELEMENTOS
Clique com o botão direito em qualquer elemento e copie o melhor seletor — CSS, XPath relativo, XPath absoluto, por id ou por texto. A extensão avisa quando o seletor é ambíguo. Funciona dentro de Shadow DOM e iframes.

📏 TEXTO POR TAMANHO EXATO
Gere texto com tamanho exato em grafemas, code points, code units ou bytes UTF-8. Ideal para testar limites de campo. Inclui pseudolocalização e fakebidi.

💥 CASOS-LIMITE
Biblioteca de entradas que costumam quebrar sistemas: Unicode exótico, payloads de segurança, números extremos, formatos inválidos, strings gigantes.

🌐 7 IDIOMAS
Interface traduzida em português, espanhol, inglês, chinês, árabe (RTL), hindi e alemão.

⌨️ ATALHOS
Ctrl+Shift+9 abre a extensão. Ctrl+Shift+8 repete a última geração no campo focado.

🔒 PRIVACIDADE TOTAL
Zero requisições de rede. Zero coleta. Tudo fica no seu navegador.

---

## Category

Developer Tools

## Language

Portuguese (Brazil)

## Screenshots needed

1. Aba Perfil — persona com documentos brasileiros (1280x800)
2. Aba Texto — geração por tamanho exato (1280x800)
3. Aba Casos-limite — entradas que quebram sistemas (1280x800)
4. Seletores — menu de contexto simulado com feedback (1280x800)
5. Seletores inteligentes — detalhes técnicos (1280x800)
6. Interface em 7 idiomas — tela de configuração (1280x800)
7. 100% offline — privacidade total (1280x800)

Gerar em: `node tests/e2e/servir.mjs` → abrir `http://localhost:8791/tests/e2e/screenshots.html`
Capturar: F12 → clique direito no `<div class="slide">` → "Capture node screenshot"

## Promotional tile (optional)

440x280 — logo do Proteu QA com fundo escuro

## Privacy practices (Chrome Web Store form)

- Single purpose: "Generate test data, copy element selectors, and fill forms for QA testing"
- Does the extension use remote code? **No**
- Data use disclosures: **This extension does not collect or use any user data**
- Permissions justification:
  - contextMenus: "Adds selector copy options to the right-click context menu"
  - storage: "Stores user preferences (country, theme, language) locally"
  - activeTab: "Inserts generated values into the focused input field via keyboard shortcut"
  - scripting: "Registers a content script to detect which element the user right-clicked"
  - host permissions (optional): "Enables the right-click selector menu on all pages — opt-in only"

## Privacy policy URL

https://<seu-usuario>.github.io/proteu-qa/privacy-policy
