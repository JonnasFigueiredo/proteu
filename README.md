# Proteu QA

Extensão de navegador (Chrome/Chromium, **Manifest V3**) para profissionais de
QA gerarem **massa de dados de teste** direto no navegador. Como Proteu, o deus
que muda de forma, gera dados equivalentes a **vários países e formatos** — e com
um diferencial: **toda geração usa uma seed determinística e visível**. A mesma
seed reproduz exatamente a mesma massa, então um bug encontrado com dados gerados
deixa de ser "não reproduzível".

**100% local** · sem requisições de rede · sem coleta de dados · sem dependências
em runtime · apenas 4 permissões · Vanilla JS (sem build).

**Multi-país:** um seletor de país (bandeira no cabeçalho) define de qual país os
dados gerados são equivalentes, e a interface acompanha o idioma (Brasil → pt;
EUA e Canadá → en; hispano-americanos → es; China → zh). Prontos: **Brasil,
Estados Unidos, Canadá, Argentina e China**. **Chile, México, Uruguai e
Paraguai** entram em seguida (a arquitetura já suporta — cada país é um arquivo
em `src/core/paises/`).

---

## Diferenciais

1. **Seed determinística** — a seed (ex.: `7f2a91`) fica no rodapé do popup. A
   mesma seed + a mesma sequência de gerações produz sempre os mesmos valores;
   trocar a seed reinicia a sequência. Anexe a seed ao relatório de bug e quem
   for reproduzir gera exatamente os mesmos dados.
2. **Detecção de campo** — ao acionar a extensão sobre um campo, ela lê os
   atributos (`type`, `maxlength`, `min`, `max`, `pattern`, `required`,
   `inputmode`) e oferece valores de fronteira específicos daquele campo.
3. **Inserção robusta** — funciona em campos controlados por frameworks
   (React/Vue/Angular), **Shadow DOM aberto** e **iframes de mesma origem** —
   onde as concorrentes costumam falhar.

## Recursos

| Área | O que gera |
|------|------------|
| **Pessoa** | Nome · data de nascimento (sempre maior de idade) · data de admissão · CPF · RG (SSP-SP) · CNH · CEP coerente por UF · telefone fixo/celular com DDD real. |
| **Empresa** | **CNPJ numérico *e* alfanumérico na mesma função** (novo padrão jul/2026, incl. o caso oficial SERPRO `12.ABC.345/01DE-35`) · **CNPJ com a mesma raiz** (matriz 0001 + filiais 0002, 0003… compartilhando os 8 primeiros dígitos) · razão social · Inscrição Estadual (SP). Com e sem máscara. |
| **Detecção → fronteira** | Chips clicáveis a partir do campo focado: `maxlength` ±1, `number` min/max + `1e999`/`NaN`, datas de fronteira, e-mails que passam na regex mas quebram no servidor, strings Unicode. |
| **Texto** | 9 idiomas (pt, es, ar, tr, ru, zh, hi, ja, he — cada um cobrindo um problema real de i18n) · geração **por tamanho exata** nas 4 unidades de contagem · **pseudolocale** (`Save` → `Šávé`) com expansão, marcadores `⟦…⟧`, preservação de placeholders e modo `fakebidi`. |
| **4 unidades de contagem** | grafemas · code points · code units UTF-16 · bytes UTF-8, lado a lado — porque "100 caracteres" é ambíguo. |
| **Massa inválida & payloads** | CPF/CNPJ com DV errado e sequências uniformes · fronteiras Unicode canônicas · payloads XSS/SQLi/formato e overflow (**uso defensivo** — ver aviso). |

Mais: **interface em pt/es/en/zh** (seletor de bandeira, detectado do navegador no
1º uso), **histórico** da sessão, cópia com um clique, **tema**
claro/escuro/automático, menu de contexto (um item por tipo de documento) e
atalho de teclado.

> Os **nomes dos documentos brasileiros** (CPF, CNPJ, RG…) não são traduzidos —
> são os nomes próprios dos documentos; um QA de fora testando um sistema BR
> precisa deles com esse nome. A "moldura" da UI (abas, rótulos, botões,
> categorias, mensagens) é totalmente localizada.

## Como usar

### Carregar no Chrome (Load unpacked)

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta raiz do projeto (a que contém o `manifest.json`).
5. Fixe o ícone **R** na barra e clique para abrir o popup.

### O popup

- **Abas** — *Documentos*, *Texto* e *Inválidos*; os ícones do cabeçalho abrem
  *Histórico* e *Configurações*. Só um bloco aparece por vez.
- **Documentos** — opção "Com máscara" e o toggle "CNPJ alfanumérico (novo
  padrão)" ficam no topo; os botões são agrupados por categoria (Pessoa,
  Empresa, Veículo, Contato).
- **Gerar → Copiar / Inserir no campo** — o valor aparece no card de resultado.
- **Seed** no rodapé (editável); o botão ao lado sorteia uma nova (e reinicia a
  sequência). Selo **100% local** sempre à vista.

### Menu de contexto e atalhos

- Clique com o **botão direito** num campo editável → *Proteu QA* → *Gerar …*.
- Atalhos (ajustáveis em `chrome://extensions/shortcuts`):
  - `Ctrl+Shift+9` — abrir o Proteu QA.
  - `Ctrl+Shift+8` — inserir a última geração no campo focado.

### Prévia sem instalar

Dá para ver o popup real (com o `chrome.*` simulado) sem carregar a extensão:

```bash
node tests/e2e/servir.mjs
# abra http://localhost:8791/tests/e2e/preview.html
```

## Reprodutibilidade — como funciona

Cada geração usa um PRNG determinístico (`xmur3` → `sfc32`) derivado de
`` `${seed}:${contador}` ``. O **contador** é persistido e avança a cada valor
gerado. Assim "o N-ésimo valor gerado com a seed X" é sempre o mesmo, e o
histórico só precisa guardar `(seed, contador, tipo)` para reproduzir qualquer
item. Nenhuma parte da geração usa `Math.random()`.

## Arquitetura

```
reproduzivel/
├── manifest.json                     # MV3, service_worker, 4 permissões
├── icons/                            # 16 / 32 / 48 / 128 px
├── src/
│   ├── core/                         # lógica PURA: sem DOM, sem chrome.* → 100% testável
│   │   ├── seed.js                   # PRNG determinístico (xmur3 → sfc32)
│   │   ├── config.js                 # defaults + normalização/validação (tema, idioma)
│   │   ├── i18n.js                    # traduções da interface (pt / es / en / zh)
│   │   ├── gerador.js                # orquestrador multi-país (PAISES, gerar())
│   │   ├── paises/                   # um arquivo por país (br, us, ca, ar, cn)
│   │   ├── field.js                  # descritor do campo → set de fronteira
│   │   ├── documents/                # nome, datas, cpf, cnpj (+raiz), rg, cnh, ie,
│   │   │                             #   cep, telefone, razao-social
│   │   ├── text/                     # contagem, idiomas, tamanho, pseudolocale
│   │   └── invalid/                  # documentos-invalidos, unicode, payloads
│   ├── storage.js                    # adaptador chrome.storage (ponte p/ core/config)
│   ├── content/content.js            # detecção do campo + inserção robusta (injetado sob demanda)
│   ├── background/service-worker.js  # menu de contexto, atalhos, roteamento da inserção
│   └── popup/                        # popup.html / .css / .js (Vanilla JS, sem framework)
└── tests/                            # Vitest (unitário) + e2e no navegador
    ├── *.test.js                     # espelha src/core + storage + service-worker
    ├── documents/  text/             # testes por documento e por módulo de texto
    └── e2e/                          # cenarios.md, runner.html, popup-runner.html,
                                      #   preview.html, servir.mjs
```

### Decisões de arquitetura

- **Lógica separada da UI e do DOM.** Tudo em `core/` é JavaScript puro, sem
  `document` nem `chrome.*`, e por isso roda em Node/Vitest sem navegador. A UI
  (popup) e a camada de página (content script) só orquestram.

- **Sem `content_scripts` no manifest.** Declará-los com `matches` exigiria host
  permission ampla, que este projeto não pede. O content script é **injetado sob
  demanda** via `chrome.scripting.executeScript`, aproveitando o grant de
  `activeTab` que surge quando o usuário abre o popup, usa o menu de contexto ou
  o atalho. Consequência: a detecção vale a partir do momento em que você aciona
  a extensão na aba.

- **O content script não gera dados.** Scripts injetados via `executeScript` não
  são módulos ES; para não duplicar `core/`, a geração roda no popup e no service
  worker (que importam `core/` como módulos) e só o **valor pronto** é enviado ao
  content script, que detecta o campo e insere.

- **A UI acompanha o core sozinha.** Adicionar um documento é **uma entrada** no
  registro `TIPOS` (`core/gerador.js`); popup (botões agrupados por categoria) e
  menu de contexto se montam a partir dele.

- **Sem etapa de build.** Popup e service worker usam ES modules nativos; o
  content script é um arquivo plano. Carrega direto em *Load unpacked*. O
  `package.json` existe só para o Vitest (devDependency).

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
  (`HTMLInputElement`/`HTMLTextAreaElement`) e dispara `InputEvent` + `change`
  com `bubbles: true`, para que React/Vue/Angular registrem a mudança. (O setter
  do prototype contorna o *value tracker* que frameworks instalam na instância —
  é isso que faz a mudança "colar".)
- **Simular colagem** — insere na posição do cursor/seleção, preservando o
  restante do texto.

A injeção usa `allFrames: true`, então **iframes de mesma origem** também são
cobertos: o frame com o campo focado é quem insere. Um `MutationObserver`
descarta o alvo caso ele saia do DOM (formulários multi-etapa).

## Testes

```bash
npm install        # instala o Vitest (única devDependency)
npm test           # roda toda a suíte unitária uma vez
npm run test:watch
```

- **Unitário (Vitest, Node):** cobre PRNG, os geradores de Pessoa/Empresa (incl. o caso oficial
  `12.ABC.345/01DE-35`), detecção→fronteira, os módulos de texto, a massa
  inválida, a persistência de config e o **service worker** (menu de contexto,
  cadeia gerar → contador → histórico → inserir, atalho). **A extensão não
  carrega nada disso** — Vitest é só de desenvolvimento.

- **End-to-end (navegador):** validam a camada de DOM que os unitários não
  alcançam — inserção nos dois modos, eventos nativos, Shadow DOM (incl.
  aninhado), iframes same-origin, detecção→fronteira, e o mecanismo React/Vue.
  Ver [`tests/e2e/cenarios.md`](tests/e2e/cenarios.md).

  ```bash
  node tests/e2e/servir.mjs
  # content script:  http://localhost:8791/tests/e2e/runner.html
  # popup completo:  http://localhost:8791/tests/e2e/popup-runner.html
  ```

## Aviso sobre os payloads (uso defensivo)

A seção **"Inválidos & payloads"** inclui strings de ataque (XSS básico, SQL
injection, overflow de tamanho) voltadas a **teste exploratório defensivo**. Elas
existem para você exercitar a validação e o escaping **de sistemas próprios, em
ambientes de teste sob sua responsabilidade**. **Não** as use contra sistemas de
terceiros sem autorização — isso pode ser ilegal. A ferramenta não realiza
nenhum ataque: apenas coloca strings em campos que você mesmo escolhe.

## Backlog

Ainda **não** implementado:

- **Inscrição Estadual das demais UFs** (hoje só SP; cada UF tem algoritmo de DV
  próprio).
- **Não previstos para a v1:** vocabulário customizado por clique direito;
  configs por domínio compartilháveis; export para fixtures de
  Playwright/Selenium; preencher formulário inteiro de uma vez; pacote npm que
  consome o mesmo formato.

## Licença

A definir (código aberto, nunca ofuscado).
