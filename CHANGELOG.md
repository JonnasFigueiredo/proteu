# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
o projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Planejado
- Dados de EUA, Argentina, Chile, México, Uruguai e Paraguai (arquitetura já
  pronta; cada país entra como um arquivo em `core/paises/`).
- Inscrição Estadual das demais UFs (hoje só SP).

## [0.8.0] — 2026-07-24

### Adicionado (arquitetura multi-país)
- **Seleção de país dos dados** por um **modal** (bandeira no cabeçalho): os
  documentos gerados passam a corresponder ao país escolhido. Nesta fase o
  Brasil está pronto; EUA, Argentina, Chile, México, Uruguai e Paraguai
  aparecem no modal como "em breve".
- **O idioma da interface acompanha o país** (Brasil → pt; EUA → en;
  hispano-americanos → es). O seletor de idioma separado foi removido.
- `core/paises/br.js`: o registro de documentos do Brasil (antes embutido em
  `gerador.js`). `gerador.js` vira o orquestrador multi-país (`PAISES`,
  `PAISES_DISPONIVEIS`, `tiposDoPais`, `idiomaDoPais`); `gerar()` usa
  `config.pais`.
- `config.pais` (substitui `config.idiomaUI`), validado e persistido.
- Service worker reconstrói o menu de contexto conforme o país ativo e ao trocar
  de país (via `storage.onChanged`).
- Documentos "mesma raiz" agora são genéricos (flag `raiz` no tipo), não mais
  presos ao CNPJ.

## [0.7.0] — 2026-07-24

### Adicionado
- **Pessoa**: geradores de **Nome**, **Data de nascimento** (sempre maior de
  idade, com ano-base fixo para manter a reprodutibilidade) e **Data de
  admissão**. A categoria Pessoa agora inclui os dados de contato (CEP,
  telefone).
- **Empresa**: **CNPJ com a mesma raiz** — um botão que avança: 1º clique gera a
  matriz (0001) e os seguintes geram filiais (0002, 0003…) compartilhando os 8
  primeiros dígitos; trocar a seed (ou o modo alfanumérico) começa um grupo novo.
  Também **Razão social** (nome de empresa genérico).
- `cnpj.js`: `gerarRaizCnpj()` e `cnpjDeRaiz(raiz, ordem)`.
- Rótulos de documento traduzíveis via `rotuloKey` (Nome, Data de nascimento,
  Telefone, Razão social, CNPJ mesma raiz) — os nomes próprios (CPF, CNPJ, RG…)
  seguem sem tradução.

### Removido
- **Título de eleitor**, **PIS/PASEP**, **RENAVAM** e **Placa** (a pedido):
  módulos e testes apagados. A categoria **Veículo** deixa de existir.

## [0.6.0] — 2026-07-24

### Adicionado
- **Interface multilíngue (pt / es / en)** com seletor de bandeira (SVG, sem
  emojis) no cabeçalho e em Configurações. O idioma é detectado do navegador no
  primeiro uso (`navigator.language`) e persistido em `config.idiomaUI`.
- `src/core/i18n.js` (dicionário puro e testável, `t()` com interpolação,
  `resolverIdioma()`) + `tests/i18n.test.js` (paridade de chaves entre os 3
  idiomas, interpolação, fallback).
- Cenário e2e P13 no `popup-runner.html`: troca de idioma traduz rótulos,
  categorias e marca `<html lang>`, e persiste a escolha.

### Notas
- Os **nomes dos documentos brasileiros** (CPF, CNPJ, RG…) não são traduzidos,
  por serem nomes próprios. A moldura da UI é totalmente localizada.

## [0.5.0] — 2026-07-24

### Removido
- **Chave Pix** e **Cartão de crédito** (a pedido): tirados do gerador, do menu
  de contexto e da UI; módulos e testes correspondentes apagados. A categoria
  "Financeiro" deixa de existir. Ficam **11 tipos de documento**.

### Adicionado
- **Tema** claro/escuro/automático, persistido em `config.tema`, com alternância
  no cabeçalho (cicla auto → claro → escuro) e no painel Configurações. O escuro
  deixa de ser só automático (via `prefers-color-scheme`) e pode ser forçado.
- `tests/service-worker.test.js`: cobre o service worker (antes 0%) com `chrome`
  mockado — menu de contexto, cadeia gerar → contador → histórico → inserir e o
  atalho "repetir última geração".
- `tests/e2e/popup-runner.html` (15 cenários do popup real) e +8 cenários no
  `tests/e2e/runner.html` (bordas do content.js).

### Alterado
- **CNPJ alfanumérico (novo padrão)** agora tem seu toggle na **tela principal**
  (painel Documentos), junto de "Com máscara" e "Excluir ambíguas" — antes ficava
  em Configurações.
- **Sem emojis**: todos substituídos por ícones SVG (cabeçalho, seed, selo,
  copiar do histórico) ou texto; removidos os "✓" dos feedbacks.

### Corrigido
- `[hidden]` agora vence regras de `display` (ex.: `.check{display:flex}`), então
  "Excluir ambíguas" fica realmente oculto até marcar "CNPJ alfanumérico".
- `content.js`: removido ramo morto de `HTMLSelectElement` em `setterNativo`
  (inalcançável via `ehEditavel`); `<select>` tratado como não-alvo, consistente
  com checkbox/botão. (Achado pelo cenário e2e G1.)

## [0.4.1] — 2026-07-23

### Alterado (UX/UI)
- Popup reorganizado com **navegação por abas** (Documentos · Texto ·
  Inválidos); Configurações e Histórico viram views acionadas pelos ícones do
  cabeçalho — só um bloco visível por vez (divulgação progressiva).
- Documentos **agrupados por categoria** (Pessoa, Empresa, Veículo, Contato,
  Financeiro) com botões de contorno leves, em vez da parede de 13 botões azuis.
  O azul sólido fica só na ação primária.
- Opções específicas de CNPJ (alfanumérico, excluir ambíguas) movidas para
  Configurações; só "Com máscara" (agora um switch) fica à vista.
- Aba Inválidos ganhou card de resultado próprio; overflow leva à aba Texto
  para mostrar as 4 contagens.
- Paleta refinada, menos bordas divisórias, hierarquia por espaçamento; ambos os
  temas (claro/escuro) revisados.
- `TIPOS` (core/gerador.js) ganhou `categoria` como metadado de exibição.

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
[0.8.0]: https://example.com/
[0.7.0]: https://example.com/
[0.6.0]: https://example.com/
[0.5.0]: https://example.com/
[0.4.1]: https://example.com/
[0.4.0]: https://example.com/
[0.3.0]: https://example.com/
[0.2.0]: https://example.com/
[0.1.0]: https://example.com/
