# Versões e validação

Estado atual: **1.2.7 (ainda não publicado)**. O número do manifesto não comprova publicação.
Fonte de versão: `manifest.json, package.json e package-lock.json`.

## Validar

```text
npm ci
npm test
npm run empacotar
```

A versão da Chrome Web Store pode ser diferente da branch main. Antes de distribuir, compare as mudanças desde a última tag e confira permissões e formatos exportados. A embalagem deve vir do mesmo commit testado. Não altere a tag v1.2.6 existente.

## Preparar uma release

1. Revise o diff e confirme que o commit contém apenas as mudanças previstas.
2. Atualize a versão nos manifestos aplicáveis e as notas de mudanças. Remova
   `-SNAPSHOT` somente ao preparar uma versão publicável. Para versões de teste,
   use um identificador de pré-release e marque essa condição na release.
3. Execute os checks acima e os testes de integração necessários. Registre
   limitações e plataformas não verificadas; não anuncie cobertura não executada.
4. Crie a tag `vMAJOR.MINOR.PATCH` no commit validado e associe os artefatos a ele.
   Tags já publicadas são imutáveis. Não crie versões retroativas só para preencher histórico.
5. Nas notas, informe mudanças, compatibilidade, instalação, migração e limitações.
   Publique somente depois de revisar o pacote e a documentação da mesma versão.

Correções compatíveis incrementam patch; recursos compatíveis incrementam minor;
quebras de contrato exigem revisão de major. Durante 0.x, declare explicitamente
mudanças incompatíveis e a política de suporte. Nem toda alteração de documentação
exige uma nova release de produto.
