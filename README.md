# Reproduzível

Extensão de navegador (Chrome/Chromium, **Manifest V3**) para profissionais de
QA gerarem **massa de dados de teste** direto no navegador — com uma diferença
que dá nome ao projeto: **toda geração usa uma seed determinística e visível**.
A mesma seed reproduz exatamente a mesma massa, então um bug encontrado com
dados gerados deixa de ser "não reproduzível".

Roda **100% local**: nenhuma requisição de rede, nenhuma coleta de dados,
permissões mínimas, sem dependências de terceiros em runtime.

## Diferenciais

1. **Seed determinística** — a seed (ex.: `7f2a91`) fica no rodapé do popup. A
   mesma seed + a mesma sequência de gerações produz sempre os mesmos valores.
   Trocar a seed reinicia a sequência.
2. **Detecção de campo** — ao acionar a extensão sobre um campo, ela lê os
   atributos (`type`, `maxlength`, `min`, `max`, `pattern`, `required`,
   `inputmode`) e serve valores coerentes com aquele campo.
3. **Inserção robusta** — funciona em campos controlados por frameworks
   (React/Vue/Angular), **Shadow DOM aberto** e **iframes de mesma origem**, que
   é onde as concorrentes costumam falhar.

## Estado atual (v0.5.0)

- PRNG determinístico (`core/seed.js`).
- **11 tipos de documento**: CPF; **CNPJ** com uma **única função para o formato
  numérico e o alfanumérico** (padrão vigente desde jul/2026, incluindo o caso
  oficial SERPRO `12.ABC.345/01DE-35`; o toggle "CNPJ alfanumérico" fica na tela
  principal); RG (SSP-SP); CNH; PIS/PASEP; título de eleitor; RENAVAM;
  Inscrição Estadual (SP); CEP coerente por UF; telefone fixo/celular com DDD
  real; placa (Mercosul e antiga).
- **Detecção de campo → set de fronteira** (`core/field.js`): o campo focado
  vira chips clicáveis no popup (maxlength ±1, number min/max + `1e999`/`NaN`,
  datas de fronteira, e-mails traiçoeiros, strings Unicode).
- **Texto** (`core/text/`): geração em **9 idiomas** (cada um cobrindo um
  problema real de i18n, documentado no código); **geração por tamanho** exata
  nas **4 unidades de contagem** (grafemas, code points, code units UTF-16,
  bytes UTF-8) exibidas lado a lado; **pseudolocale** (`Save` → `Šávé`) com
  expansão ~40%, marcadores `⟦…⟧`, preservação de placeholders e modo
  `fakebidi`.
- **Massa inválida e payloads** (`core/invalid/`): CPF/CNPJ com DV errado e
  sequências uniformes; fronteiras Unicode canônicas; payloads XSS/SQLi/formato
  e overflow (uso defensivo — ver aviso abaixo). Expostos no popup na seção
  "Inválidos & payloads" — clique num chip insere direto no campo ativo (ou
  copia, se não houver campo focado).
- **Tema** claro/escuro/automático (segue o sistema), com alternância no
  cabeçalho e no painel de Configurações, persistido. Interface sem emojis
  (ícones SVG).
- Popup com todos os tipos, bloco de texto com as 4 contagens, seed no rodapé,
  cópia, histórico da sessão e opções persistidas.
- Camada de inserção no content script com dois modos e disparo de eventos
  nativos.
- Menu de contexto (um item por tipo) e atalho de teclado.

O restante das funcionalidades descritas abaixo está planejado (ver
[Backlog](#backlog)).

## Arquitetura

```
reproduzivel/
├── manifest.json            # MV3, service_worker, 4 permissões
├── src/
│   ├── core/                # lógica PURA: sem DOM, sem chrome.* → 100% testável
│   │   ├── seed.js          # PRNG determinístico (xmur3 → sfc32)
│   │   ├── config.js        # defaults + normalização/validação da config
│   │   ├── gerador.js       # amarra seed + contador + tipo de documento
│   │   └── documents/
│   │       ├── cpf.js
│   │       └── cnpj.js      # numérico + alfanumérico na mesma função
│   ├── storage.js           # adaptador chrome.storage (ponte para core/config)
│   ├── content/content.js   # detecção do campo + inserção robusta
│   ├── background/service-worker.js  # menu de contexto, atalhos, injeção
│   └── popup/               # popup.html / .css / .js (Vanilla JS)
└── tests/                   # espelha src/core; roda com Vitest
```

### Decisões de arquitetura

- **Lógica separada da UI e do DOM.** Tudo em `core/` é JavaScript puro, sem
  `document` nem `chrome.*`, e por isso é coberto por testes que rodam em
  Node/Vitest sem navegador. A UI (popup) e a camada de página (content script)
  só orquestram.

- **Sem `content_scripts` no manifest.** Declarar um content script com `matches`
  exigiria host permission ampla, que este projeto não pede. Em vez disso, o
  content script é **injetado sob demanda** via `chrome.scripting.executeScript`,
  aproveitando o grant de `activeTab` que surge quando o usuário abre o popup,
  usa o menu de contexto ou o atalho. Consequência: a detecção passa a valer a
  partir do momento em que você aciona a extensão na aba.

- **O content script não gera dados.** Scripts injetados via `executeScript` não
  são módulos ES; para não duplicar a lógica de `core/`, a geração roda no popup
  e no service worker (que importam `core/` como módulos) e só o **valor pronto**
  é enviado ao content script, que detecta o campo e insere.

- **Reprodutibilidade por índice.** Cada geração usa um rng derivado de
  `${seed}:${contador}`; o contador é persistido e avança a cada valor. Assim "o
  N-ésimo valor gerado com a seed X" é sempre o mesmo, e o histórico só precisa
  guardar `(seed, contador, tipo)` para reproduzir.

- **Sem etapa de build.** Popup e service worker usam ES modules nativos; o
  content script é um arquivo plano. Carrega direto em *Load unpacked*. O
  `package.json` existe apenas para o Vitest (devDependency).

### Permissões (só estas quatro)

| Permissão | Por quê |
|-----------|---------|
| `contextMenus` | menu de botão direito para gerar direto no campo |
| `storage` | persistir configurações e histórico |
| `activeTab` | acesso pontual à aba ativa quando o usuário aciona a extensão |
| `scripting` | injetar o content script sob demanda |

Nenhuma host permission (`<all_urls>` etc.). Nenhum acesso de rede.

## Inserção robusta — como funciona

O content script rastreia o último campo editável focado/clicado (via `focusin`
capturante e `composedPath()`, o que cobre **Shadow DOM aberto**) e oferece dois
modos:

- **Injetar valor** — usa o *setter nativo* de `value` do prototype
  (`HTMLInputElement`/`HTMLTextAreaElement`) e dispara `InputEvent` e `change`
  com `bubbles: true`, para que React/Vue/Angular registrem a mudança.
- **Simular colagem** — insere na posição do cursor/seleção, preservando o
  restante do texto.

A injeção é feita com `allFrames: true`, então **iframes de mesma origem** também
são cobertos: o frame que tem o campo focado é quem insere. Um `MutationObserver`
descarta o alvo caso ele saia do DOM (formulários multi-etapa).

## Como carregar (Load unpacked)

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta raiz do projeto (a que contém o `manifest.json`).
5. Fixe o ícone **R** na barra e clique para abrir o popup.

Atalhos padrão (ajustáveis em `chrome://extensions/shortcuts`):

- `Ctrl+Shift+9` — abrir o Reproduzível.
- `Ctrl+Shift+8` — inserir a última geração no campo focado.

## Como rodar os testes

```bash
npm install     # instala o Vitest (única devDependency)
npm test        # roda toda a suíte uma vez
npm run test:watch
```

Os testes cobrem o PRNG (determinismo), CPF, CNPJ (numérico, alfanumérico e o
caso oficial `12.ABC.345/01DE-35`), a normalização/persistência da config e o
gerador. **A extensão em si não carrega nada disso** — Vitest é só de
desenvolvimento.

## Aviso sobre os payloads (uso defensivo)

Parte do backlog inclui um conjunto de **massa inválida e payloads** (XSS básico,
SQL injection, strings de overflow) voltado a **teste exploratório defensivo**.
Esses valores existem para você exercitar a validação **de sistemas próprios, em
ambientes de teste sob sua responsabilidade**. Não use contra sistemas de
terceiros sem autorização — isso pode ser ilegal. A ferramenta não realiza
nenhum ataque: apenas coloca strings em campos que você mesmo escolhe.

## Backlog

Planejado para as próximas versões (ainda **não** implementado):

- **Inscrição Estadual das demais UFs** (hoje só SP).
- **Não previstos para a v1**: vocabulário customizado por clique direito; configs
  por domínio compartilháveis; export para fixtures de Playwright/Selenium;
  preencher formulário inteiro de uma vez; pacote npm que consome o mesmo formato.

## Licença

A definir (código aberto, nunca ofuscado).
