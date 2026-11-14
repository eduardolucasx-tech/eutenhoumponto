# v2.3.2 · Saída depois da meia-noite na conferência de comprovantes

Data: 2026-11-13

## Problema
Com a saída batida depois da meia-noite (ex.: entrada 15:00 do dia 12 e saída 00:31 do dia 13), o app guarda a saída no dia 12. O comprovante da empresa, porém, vem com a data do dia 13. Na conferência de comprovantes, ele aparecia como "Falta no app" do dia 13, e "Adicionar" punha 00:30 como **entrada** do dia 13. A entrada real de hoje virava então a saída, o dia ficava "Completo" e o botão de bater ponto travava.

## Mudanças
- **A conferência entende a saída depois da meia-noite.** Um comprovante antes das 06:00 que bate (até 10 min) com a última batida do dia anterior é conferido com esse dia. Ele aparece como "Confere" ou "Diferença" e não é mais adicionado ao dia seguinte.
- **Novo aviso em Mês › Conferir** para quem já tem a batida repetida: "a batida das 00:30 parece ser a saída de 12/11 repetida. Apague-a em Registrar."
- 2 testes novos, 75 no total, todos passando.

## Não alterado
- O botão de bater ponto e a regra que põe a batida da madrugada na jornada aberta do dia anterior. Simulado nos três modelos: já funcionava.
- Os cálculos, o login, a sincronização e os outros leitores.
- Os dados já gravados não são apagados sozinhos: a batida repetida é só apontada no Conferir.
