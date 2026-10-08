# Timeflow Black & Gold v1.8.3: Santos, histórico da nuvem e Registrar

## Compromissos de compatibilidade

- A matriz de horário do Hub/Programação continua igual à 1.4.1: 8h de segunda a sexta, 4h no sábado e 0h no domingo, com almoço automático e 2 batidas.
- Jornalismo mantém modelo 12×2 e data inicial da escala salva no perfil da conta. O cálculo não redefine a data ao abrir a nova versão.
- Tradicional e Personalizável continuam com 4 batidas e os ajustes próprios.
- Os feriados cadastrados em `HOLIDAYS_2026` foram preservados sem alteração. Para Santos: 26/01 e 08/09, além dos feriados nacionais e estadual do código original. A lista cobre 2026; não constitui calendário oficial de outros anos.
- Banco de horas mantém a regra semestral.

## Conciliação de dados antigos

1. Ao autenticar, a aplicação lê o documento Firestore original `users/{uid}/profile/main`.
2. O perfil que já existe na nuvem (incluindo modelo, cidade, data-base do 12×2 e saldo de abertura) prevalece sobre um perfil local possivelmente desatualizado.
3. Dias do Firestore e dias locais são reunidos pelas datas `YYYY-MM-DD` usando `PontoSync.mergeDays`. Dias só na nuvem, inclusive em meses anteriores, não são descartados.
4. Importações e banco oficial histórico também são conciliados.
5. Não ocorre mais envio automático do perfil local no evento de login; apenas alterações explícitas são sincronizadas por transação de leitura + merge.
6. Na primeira leitura, o aplicativo tenta guardar cópia local separada do documento remoto original por UID, respeitando eventual limite de armazenamento do navegador.
7. O Perfil passa a informar quantos dias/meses foram encontrados no documento remoto.

**Importante:** esses testes verificam a lógica com dados históricos simulados. Não há acesso direto aos documentos Firebase particulares nesta revisão. Um teste real na conta autenticada permanece necessário antes de promover a atualização.

## Calendário STQQSSD

- Semana de segunda a domingo, com cabeçalho **S T Q Q S S D**.
- Espaços vazios antes do dia 1 para manter cada data na coluna do dia da semana correto.
- Sempre sete colunas, inclusive no desktop e no celular.
- Mantém a seleção do mês, o mapa de créditos/débitos/ausências e a edição de cada data.

## Aba Registrar

- Tela dividida em editor de batidas e coluna de matriz/ocorrências, com layout responsivo.
- Mantém 2 ou 4 campos conforme o modelo existente; preserva fonte de dados, cálculos, importadores e registros já salvos.
- A troca da data exibe a jornada e as batidas existentes da data escolhida.
- Justificativas ficam em bloco próprio, com cores dourado/azul/vermelho.
- Resumo da matriz usada em Santos e da situação de nuvem.
- O botão Salvar só substitui as batidas da data escolhida; pergunta antes de remover justificativa existente.

## Validação

Executar:

```sh
node --test tests/*.test.cjs
node --check app.js
```

Suíte com 32 cenários de regressão, incluindo 9 casos para calendário, modelo e histórico.

Branch: `fix/v1.8.3-santos-cloud-register`. Não promover sem homologação da conta Google com o histórico anterior.
