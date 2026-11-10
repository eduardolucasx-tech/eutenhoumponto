# v2.3.0 · No banco vale a última edição

Data: 2026-11-10

## Problema
Depois de importar o espelho oficial de um mês, corrigir um dia desse mês no app mudava o saldo do dia na lista, mas o "Saldo do mês" e o "Banco do ciclo" continuavam presos ao saldo oficial.

## Mudanças
- **A última edição vale.** Ao importar o espelho, o app guarda um retrato de cada dia do mês (batidas ou ausência). Se depois você corrige um dia, a diferença entre a sua edição e o retrato entra:
  - no Saldo do mês (o selo passa a dizer "oficial + suas edições");
  - no débito e no crédito do mês;
  - no Banco do ciclo e na tela Hoje.
- Desfazer a correção (voltar ao horário do espelho) devolve o valor oficial.
- **Importar o espelho de novo** mantém os dias que você editou depois da importação anterior, e eles continuam contando. O aviso informa quantos dias foram mantidos.
- O card Banco do ciclo mostra a linha "Suas edições depois do espelho" e as datas editadas.
- Espelhos importados antes desta versão não têm o retrato. O card avisa e pede para importar de novo o espelho daquele mês. As suas edições são mantidas.
- Novo teste: `tests/bank-last-edit.test.cjs` (6 casos). São 69 testes no total, todos passando.

## Não alterado
- O cálculo de cada dia (jornada, almoço automático, sábados −4h, feriados de Santos).
- O login Google, o Firebase/sync e o formato dos dados. O retrato fica dentro de `officialBank` (`espelhoDays`) e ocupa poucos bytes por mês.
- Os leitores do espelho, da planilha e dos comprovantes. Só o passo de aplicar o espelho ganhou o retrato e a preservação das edições.
- O modelo Tradicional, que já calculava o banco anual só com os dados do app.
