# LinkedIn — post de lançamento

## Como o LinkedIn indexa (o porquê de cada escolha abaixo)

- **As 3 primeiras linhas são tudo.** O feed corta em ~210 caracteres. A palavra-chave
  principal ("QA", "massa de dados de teste") precisa aparecer antes do "ver mais".
- **Link no primeiro comentário, não no corpo.** O algoritmo reduz o alcance de posts
  com link externo. Publique o post, depois comente com o link da Chrome Web Store.
- **3 a 5 hashtags, no fim.** Mais que isso dilui. Hashtags específicas de nicho
  (#AutomacaoDeTestes) alcançam mais que genéricas (#Tecnologia).
- **Pergunta no final.** Comentário pesa mais que curtida no ranqueamento — e resposta
  do autor nos primeiros 60 min amplifica.
- **Linhas curtas, muito espaço em branco.** 80% do tráfego é mobile.
- **Sem "link na bio", sem edição nas primeiras horas.** Editar o post depois de
  publicado derruba o alcance.

---

## Versão principal

Todo QA já perdeu tempo caçando gerador de CPF válido em site aleatório da internet.

Colando dado de teste em campo que não aceita máscara.
Copiando XPath do DevTools que quebra no dia seguinte.

Cansei disso e construí a ferramenta que queria ter.

**Proteu QA** — extensão de Chrome para geração de massa de dados de teste,
captura de seletores e preenchimento de formulários. Tudo offline.

O que ela faz:

→ **Personas completas com documentos válidos** — CPF, CNPJ, RG, CNH, SSN, DNI,
CUIT, Aadhaar e mais: 83 tipos de campo entre 9 países. Nome, e-mail, telefone,
endereço e datas coerentes entre si.

→ **Seed determinística** — a mesma seed gera exatamente a mesma pessoa. O bug que
você reproduziu hoje, o dev reproduz amanhã com o mesmo dado.

→ **Seletores com um clique** — botão direito em qualquer elemento e ela devolve o
seletor mais estável: CSS, XPath relativo, absoluto ou por texto. Prioriza
data-testid, desambigua com nth-of-type e avisa quando o seletor casa com mais de
um elemento. Funciona dentro de Shadow DOM e iframes.

→ **Texto com tamanho exato** — 100 bytes UTF-8 é diferente de 100 caracteres, que é
diferente de 100 grafemas. Ela gera o que você pediu, na unidade que você pediu.
Testar maxlength nunca mais vai ser chute.

→ **Casos-limite prontos** — emoji ZWJ, zero-width space, payloads de XSS e SQL
injection, números extremos, formatos inválidos. A biblioteca de entradas que
costumam quebrar sistemas.

→ **7 idiomas na interface** — incluindo árabe com RTL de verdade, para quem testa
produto internacionalizado.

E o principal: **zero requisição de rede, zero dependência, zero coleta de dados.**
Nada do que você gera sai da sua máquina. Não dava para publicar uma ferramenta de
dado sensível que telefona para casa.

Foram meses de trabalho, 716 testes automatizados e uma regra que não abri mão:
nenhuma biblioteca de terceiros.

Já está na Chrome Web Store, gratuita. Link no primeiro comentário.

Qual parte do seu fluxo de teste ainda é manual e você gostaria de automatizar?

#QA #TestesDeSoftware #AutomacaoDeTestes #QualidadeDeSoftware #Playwright

---

## Versão curta (para quem prefere post enxuto)

Publiquei minha primeira extensão de Chrome: **Proteu QA**, um gerador de massa de
dados de teste para quem trabalha com QA.

CPF, CNPJ, SSN, DNI e mais: 83 tipos de campo válidos para 9 países. Seed
determinística — mesma seed, mesma persona, sempre. Copia seletores CSS e XPath com
o botão direito. Gera texto com tamanho exato em bytes, grafemas ou code points.
Biblioteca de casos-limite que quebram sistema.

Zero rede. Zero dependências. Zero coleta de dados.

Gratuita na Chrome Web Store — link no primeiro comentário.

Qual ferramenta de QA você não abre mão no dia a dia?

#QA #TestesDeSoftware #AutomacaoDeTestes #QualidadeDeSoftware

---

## Primeiro comentário (postar logo após)

Link: https://chromewebstore.google.com/detail/SEU-ID-AQUI

Feita 100% em JavaScript puro, sem framework e sem dependência externa.
Aceito sugestão de funcionalidade e de país para os próximos documentos.

---

## Checklist de publicação

- [ ] Publicar entre terça e quinta, 8h-10h (maior alcance no BR)
- [ ] Anexar 1 imagem ou carrossel (post com imagem tem ~2x mais alcance)
      → use os slides de `tests/e2e/screenshots.html`
- [ ] Postar o link no primeiro comentário, não no corpo
- [ ] Responder todos os comentários nos primeiros 60 minutos
- [ ] Não editar o post depois de publicado
