# v2.3.3 · Registrar não grava as batidas de outro dia

Data: 2026-11-13

## Problema
No iPhone, o dia 13/11 ficou com as mesmas batidas do dia 12 (15:25 e 00:31). O dia aparecia como "Completo" e o botão de bater ponto travava.

Causa provável: em Registrar › Marcações do dia, as batidas na tela só eram trocadas quando o iPhone avisava que a data tinha mudado (evento "change"). Se você trocava a data e tocava em Salvar antes desse aviso, as batidas do dia anterior eram gravadas na data nova.

## Mudanças
- **As batidas da tela trocam na hora em que a data muda** (evento "input").
- **Trava em Salvar:** se a data na tela não for a das batidas mostradas, nada é gravado. O app carrega o dia certo e mostra o aviso "A data mudou para dd/mm. Confira as batidas e toque em Salvar de novo."
- **Novo aviso em Mês › Conferir:** um dia com as mesmas batidas do dia anterior, numa jornada que passa da meia-noite, aparece como possível cópia.
- Os avisos que pedem correção em Registrar aparecem primeiro no Conferir.
- 2 testes novos, 77 no total, todos passando.

## Não alterado
- Os cálculos, o login, a sincronização e os importadores.
- Os dados já gravados não mudam sozinhos: o dia copiado é só apontado no Conferir.
