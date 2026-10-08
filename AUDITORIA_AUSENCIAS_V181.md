# Auditoria de Folga Banco, Atestado e Falta | Timeflow v1.8.1

## Regra do aplicativo
A carga prevista é determinada pelo modelo, dia da semana, escala configurada e feriados cadastrados.

| Tipo | Saldo diário estimado | Estado |
| --- | --- | --- |
| Folga Banco (`banco`) | `-expectedMinutes(data)` | Ausência explicitamente registrada |
| Atestado (`atestado`) | `0` | Dia justificado sem débito ou crédito no banco |
| Falta (`falta`) | `-expectedMinutes(data)` | Ausência explicitamente registrada |
| Sem registro | Não contabilizado | Pendência de conferência |
| Batidas insuficientes | Não contabilizado | Pendência de conferência |
| Jornada com batidas completas | Horas trabalhadas menos previstas | Apuração local |
| Dado oficial diário | Crédito menos débito informado | Apuração oficial local (exceto conflito com ausência manual) |

Uma folga de banco ou falta na jornada de 8h representa -08:00. No sábado de 4h, -04:00. Em um dia de previsão 0h, a ausência não desconta banco e a interface informa isso.

**Importante:** o efeito de `Falta` no banco é uma convenção de acompanhamento pessoal. Desconto em folha, remuneração de atestado e regras trabalhistas devem ser confirmados com a empresa e o espelho oficial.

## Correções aplicadas
1. O saldo do mês inclui faltas e folgas de banco sem batidas, pois são explicitamente registradas.
2. Dias sem marcação e dias com batidas incompletas não geram automaticamente -8h. Eles continuam como pendências separadas: `semRegistro`, `parcial`, `pend`.
3. O saldo do ciclo semestral e, no modelo Tradicional, o anual somam somente eventos apurados.
4. Na tela Mês, batidas incompletas exibem `--:--`, não um saldo fictício. Exportações CSV e Excel deixam o saldo não apurado em branco.
5. O mapa mensal distingue Folga Banco (dourado), Atestado (azul), Falta (vermelho), batidas incompletas (azul) e ausência de marcações (sem preenchimento).
6. A Home mostra saldo de Atestado como `00:00`; sem batidas suficientes, mostra `--:--`.
7. Ao marcar ausência, as batidas, a observação e o status anterior são preservados em `absenceBackup`. Ao removê-la, os dados podem ser restaurados com novos IDs; tombstones impedem ressurgimento de marcações antigas no merge.
8. Ao lançar batidas manualmente em um dia com ausência, o aplicativo pede confirmação antes de substituí-la. O botão de ponto também bloqueia marcação em dias com ausência.
9. Aviso de divergência se houver ausência manual e dados oficiais do mesmo dia.
10. Exportações tratam observações HTML e possíveis fórmulas maliciosas em CSV.

## Limitações e avisos
- Os backups de batidas de ausências criadas *antes* da v1.8.1 não existem retroativamente. Dados apagados anteriormente não são recuperáveis apenas pela atualização.
- `complete` exige ausência explícita, valores oficiais diários ou batidas suficientes. A flag `closed` isolada não torna o dia apurado.
- Relatórios estimados não devem ser confundidos com espelho oficial do empregador. Se um mês tem um saldo oficial importado, este continua prevalecendo no resumo mensal.
- A tabela de feriados contém dados específicos de 2026; outros anos precisam de revisão própria.
- Importação de um PDF que contém a palavra “Ausente” **não** é interpretada automaticamente como Falta: é necessário conferir o espelho e registrar a classificação adequada.
- A sincronização entre **dois dispositivos reais** e o login Firebase ainda exigem teste E2E antes de promover esta branch a produção.

## Como testar
No repositório clonado, com Node.js 18 ou superior:

```sh
node --test tests/absence-bank.test.cjs
```

A suíte cobre Folga Banco, Atestado, Falta, dia sem registro, jornada de sábado/domingo, reversão de ausência, calendário e reconciliação das batidas. Em ambiente JavaScript simulado, os 13 casos passaram.
