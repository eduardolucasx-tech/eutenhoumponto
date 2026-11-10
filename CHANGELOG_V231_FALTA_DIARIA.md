# v2.3.1 · Falta conta no banco e novo botão Diária viagem

Data: 2026-11-10

## Problema
Em mês com espelho importado antes da v2.3.0, a **Falta** aparecia negativa no dia, mas o Banco do ciclo e o Saldo do mês não mudavam. Esses espelhos não têm o retrato dos dias, então a regra "vale a última edição" só passava a valer depois de reimportar o espelho.

## Mudanças
- **Falta, Folga banco e as outras ausências agora descontam direto**, mesmo em meses com espelho antigo e sem reimportar. Uma ausência lançada sobre as batidas do espelho, ou sobre um dia vazio, conta como edição posterior.
  - Se a ausência foi lançada sobre batidas digitadas antes da importação, o app não sabe o que o espelho trazia e mantém o valor oficial. Reimportar o espelho resolve.
- **Novo botão "Diária viagem"** em Registrar › Justificar o dia:
  - desconta **08:00** fixas do banco, qualquer que seja a jornada do dia;
  - aparece no calendário do mês com a cor de Folga banco e no relatório como "Diária viagem";
  - a observação do dia fica "Diária viagem";
  - pode ser removida com "Remover justificativa", que traz de volta as batidas anteriores do dia.
- Os botões de justificativa ficam agora em duas colunas.
- 4 testes novos, 73 no total, todos passando.

## Não alterado
- O cálculo da Falta (carga prevista do dia), da Folga banco e do Atestado.
- O login, a sincronização (só ganhou o nome "Diária viagem" na lista de ausências) e os leitores do espelho, da planilha e dos comprovantes.
