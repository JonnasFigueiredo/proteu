// Coleta CEPs REAIS do ViaCEP para embutir em src/core/documents/cep.js.
//
// FERRAMENTA DE DESENVOLVIMENTO — roda aqui, à mão, e NÃO vai no pacote da
// extensão (tools/ fica fora da lista do sincronizar.mjs). A extensão nunca
// acessa rede: ela só lê a tabela estática que este script ajuda a montar.
//
// Existe porque o gerador antigo sorteava CEP dentro da faixa da UF, o que dá
// formato válido e CEP inexistente — e quem valida contra os Correios recebia
// "não encontrado".
//
// Uso: node tools/coletar-ceps.mjs saida.json
// Depois: conferir cada CEP (o script de verificação está no mesmo diretório)
// e colar o resultado em CEPS_REAIS.
const CAPITAIS = {
  AC:"Rio Branco", AL:"Maceio", AP:"Macapa", AM:"Manaus", BA:"Salvador",
  CE:"Fortaleza", DF:"Brasilia", ES:"Vitoria", GO:"Goiania", MA:"Sao Luis",
  MT:"Cuiaba", MS:"Campo Grande", MG:"Belo Horizonte", PA:"Belem", PB:"Joao Pessoa",
  PR:"Curitiba", PE:"Recife", PI:"Teresina", RJ:"Rio de Janeiro", RN:"Natal",
  RS:"Porto Alegre", RO:"Porto Velho", RR:"Boa Vista", SC:"Florianopolis",
  SP:"Sao Paulo", SE:"Aracaju", TO:"Palmas",
};
const TERMOS = ["Avenida", "Rua Sao", "Rua Santa", "Travessa"];
const saida = {};
for (const [uf, cidade] of Object.entries(CAPITAIS)) {
  const achados = new Map();
  for (const termo of TERMOS) {
    if (achados.size >= 20) break;
    const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(termo)}/json/`;
    try {
      const j = await (await fetch(url)).json();
      if (Array.isArray(j)) {
        for (const it of j) {
          if (it.cep && it.uf === uf && /^\d{5}-\d{3}$/.test(it.cep)) {
            achados.set(it.cep, `${it.logradouro} — ${it.bairro || it.localidade}`);
          }
        }
      }
    } catch (e) { console.error(uf, termo, e.message); }
    await new Promise((r) => setTimeout(r, 150));
  }
  saida[uf] = [...achados.keys()].sort().slice(0, 20);
  console.log(`${uf} ${cidade}: ${saida[uf].length}`);
}
const fs = await import("node:fs");
fs.writeFileSync(process.argv[2], JSON.stringify(saida, null, 2));
console.log("total:", Object.values(saida).flat().length);
