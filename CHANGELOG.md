# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
o projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Planejado
- Demais documentos brasileiros (RG, CNH, PIS, título, RENAVAM, IE, CEP,
  telefone, placa, Pix, cartão).
- Texto multilíngue (9 idiomas) e texto por tamanho com 4 unidades de contagem.
- Pseudolocale com preservação de placeholders e modo `fakebidi`.
- Massa inválida e payloads (uso defensivo).
- Detecção de campo → set de fronteira automático.

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
[0.1.0]: https://example.com/
