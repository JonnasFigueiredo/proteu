# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
o projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Planejado
- Inscrição Estadual das demais UFs (hoje só SP).

## [0.4.0] — 2026-07-23

### Adicionado
- Seção **"Inválidos & payloads"** no popup: botões de CPF/CNPJ inválidos
  (determinísticos pela seed, com o motivo no feedback); chips das fronteiras
  Unicode e dos payloads (XSS/SQLi/formato); campo de overflow que gera a string
  e mostra as 4 contagens no bloco Texto.
- Clique num chip insere no campo ativo; sem campo focado, cai para a área de
  transferência automaticamente.

## [0.3.0] — 2026-07-23

### Adicionado
- `core/text/contagem.js`: contagem nas 4 unidades (grafemas via
  `Intl.Segmenter`, code points, code units UTF-16, bytes UTF-8).
- `core/text/idiomas.js`: geração de texto em 9 idiomas (pt, es, ar, tr, ru,
  zh, hi, ja, he), cada um documentando o problema de i18n que expõe.
- `core/text/tamanho.js`: geração por tamanho **exata** na unidade escolhida,
  inclusive com filler multibyte.
- `core/text/pseudolocale.js`: pseudolocalização (transliteração acentuada,
  expansão ~40%, marcadores `⟦…⟧`, preservação de placeholders, modo
  `fakebidi` com controles RLO/PDF).
- `core/invalid/`: documentos inválidos (DV errado, sequências uniformes),
  fronteiras Unicode canônicas e payloads XSS/SQLi/formato/overflow (uso
  defensivo).
- Bloco **Texto** no popup: idioma + geração por tamanho com unidade, e as **4
  contagens exibidas lado a lado**; botão de pseudolocalização; direção RTL
  automática para árabe e hebraico.

### Notas
- 178 testes no total.

## [0.2.0] — 2026-07-23

### Adicionado
- `core/field.js`: detecção de campo → **set de fronteira automático**
  (maxlength/minlength ±1, number min/max + `1e999`/`NaN`, datas de fronteira
  sem bug de fuso, e-mails que passam em regex de front, URLs, strings Unicode
  traiçoeiras), exibido como chips clicáveis no bloco "Campo detectado".
- Onze novos tipos de documento, todos determinísticos e com testes:
  - **RG** (SSP-SP, DV com "X"), **CNH** (DENATRAN), **PIS/PASEP**,
    **título de eleitor** (UF 01–28 e regra especial SP/MG), **RENAVAM**;
  - **Inscrição Estadual de SP** (2 DVs embutidos), **CEP** coerente com a
    faixa principal de cada uma das 27 UFs (+ `ufDoCep`), **telefone**
    fixo/celular com DDDs reais da Anatel, **placa** Mercosul e antiga;
  - **chave Pix** nos 4 formatos (CPF, e-mail em domínio de teste, telefone
    E.164, UUID v4 gerado pelo rng), **cartão de crédito** com Luhn válido
    (Visa, Mastercard, Amex, Elo, Hipercard).
- Popup monta os botões de documento dinamicamente a partir do registro
  `TIPOS`; menu de contexto ganha os novos itens automaticamente.

## [0.1.0] — 2026-07-23

Primeira rodada. Base da extensão e dos documentos centrais.

### Adicionado
- Estrutura do projeto e `manifest.json` (Manifest V3) com apenas quatro
  permissões: `contextMenus`, `storage`, `activeTab`, `scripting`.
- `core/seed.js`: PRNG determinístico (xmur3 → sfc32) com API `criarRng(seed)`.
- `core/documents/cpf.js`: geração e validação de CPF (módulo 11).
- `core/documents/cnpj.js`: **função única** para CNPJ numérico e alfanumérico
  (padrão vigente desde jul/2026), com toggle de letras ambíguas; inclui o caso
  oficial SERPRO `12.ABC.345/01DE-35`.
- `core/config.js` + `storage.js`: configuração com defaults, normalização e
  persistência em `chrome.storage.sync`.
- `core/gerador.js`: reprodutibilidade por índice (`${seed}:${contador}`).
- Popup (HTML/CSS/JS puro) gerando CPF/CNPJ, com seed no rodapé, selo
  "100% local", cópia com feedback e histórico da sessão.
- Content script com inserção robusta em dois modos (setter nativo + eventos
  nativos; colagem no cursor), Shadow DOM aberto e iframes de mesma origem.
- Service worker com menu de contexto em campos editáveis e atalho de teclado.
- Testes (Vitest) para seed, CPF, CNPJ, config, storage e gerador.

[Não lançado]: https://example.com/
[0.4.0]: https://example.com/
[0.3.0]: https://example.com/
[0.2.0]: https://example.com/
[0.1.0]: https://example.com/
