# Cenários de validação end-to-end

Os testes unitários (`npm test`) cobrem a lógica pura de `core/`. Estes cenários
cobrem o que só um **navegador real** valida: a camada de inserção/detecção no
DOM (`src/content/content.js`) e a reprodutibilidade ponta a ponta.

Como executar: sirva a raiz do projeto por HTTP e abra `tests/e2e/runner.html`.
O runner carrega o `content.js` real, monta os fixtures e roda as asserções,
imprimindo ✓/✗ por cenário. (Ver o comando no rodapé.)

## Inserção — modo "valor" (setter nativo + eventos)

- **I1 — input text**: inserir num `<input type="text">` define o valor e dispara
  `input` e `change` com `bubbles` (é o que faz React/Vue registrarem).
- **I2 — textarea**: idem em `<textarea>`.
- **I3 — contenteditable**: inserir num `div[contenteditable]` altera o texto e
  dispara `input`.
- **I4 — eventos observáveis**: um listener de `input`/`change` no campo recebe o
  evento após a inserção (prova o caminho de notificação a frameworks).

## Framework (React/Vue) — o diferencial

- **F1 — setter do prototype**: com o *value tracker* do React simulado (setter
  sobrescrito na instância do elemento), a inserção usa o setter do **prototype**,
  então o setter da instância **não** é chamado, o valor vai ao slot nativo e o
  evento disparado é um `InputEvent` real com `bubbles` e `inputType`. É o que
  faz React/Vue registrarem a mudança — onde as concorrentes falham.

## Inserção — modo "colar" (respeita cursor/seleção)

- **C1 — cursor no meio**: valor `"AB"`, cursor na posição 1, inserir `"X"` em
  modo colar resulta em `"AXB"` (não substitui tudo).
- **C2 — seleção**: com trecho selecionado, a colagem substitui só a seleção.

## Shadow DOM e iframes

- **SD1 — Shadow DOM aberto**: input dentro de um shadow root aberto é detectado
  (via `composedPath`) e recebe a inserção.
- **IF1 — iframe same-origin**: input dentro de um iframe de mesma origem, com o
  `content.js` no frame, recebe a inserção.

## Detecção de campo → fronteira

- **D1 — maxlength**: focar `input[maxlength=14]`; `DETECTAR` devolve o descritor;
  `gerarSetFronteira` produz valores de 13, 14 e 15 caracteres.
- **D2 — number/max**: focar `input[type=number][max=100]`; a fronteira inclui
  `100`, `101`, `-1`, `1e999`, `NaN`.
- **D3 — email**: focar `input[type=email]`; a fronteira traz e-mails que passam
  em regex de front (contêm `@`).

## Robustez / bordas

- **R1 — sem campo**: sem campo focado, `INSERIR` responde `{ok:false, erro:"sem-campo"}`.
- **R2 — PING**: `PING` responde `{ok:true}`.
- **R3 — não-editável**: focar um `<button>` não o registra como alvo de inserção.
- **R4 — alvo removido do DOM**: se o campo focado sai do DOM, `INSERIR` responde
  `sem-campo` (o `MutationObserver` limpa o alvo).

## Reprodutibilidade ponta a ponta

- **RP1 — todos os tipos**: para cada tipo em `TIPOS`, `gerar` com a mesma seed e
  contador produz exatamente o mesmo valor (determinismo por índice).
- **RP2 — seeds diferentes divergem**: seeds distintas produzem valores distintos.

---

Comando para servir e abrir (a partir da raiz do projeto):

```bash
node tests/e2e/servir.mjs
# depois abra http://localhost:8791/tests/e2e/runner.html
```
