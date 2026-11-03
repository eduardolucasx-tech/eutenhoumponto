# v1.9.0 — Auditoria de dados, feriados e deploy

## Correções de dados
- **Importações preservam ausências.** Importar planilha ou espelho em PDF não apaga mais Folga banco, Atestado ou Falta. O dia é mantido e o app avisa quais datas foram puladas. A edição manual continua pedindo confirmação, como antes.
- **Observação do espelho não se perde.** Em dias com batidas, a observação (ex.: DSR, Tiradentes) era gravada num objeto descartado.
- **Espelho sem bloco de Banco de Horas não inventa saldo.** Antes, o último número negativo do PDF virava saldo oficial e prevalecia sobre o cálculo do app.

## Feriados
- Gerados por regra para qualquer ano (Sexta-feira Santa calculada pela Páscoa). Antes só existia 2026: a partir de 01/01/2027 nenhum feriado seria reconhecido.
- 2026 é idêntico à lista anterior (coberto por teste).
- Corpus Christi e Carnaval seguem fora: em Santos são ponto facultativo.
- **Pendente:** Praia Grande (19/01 e 20/05) não foi confirmada em fonte oficial. Exceções por ano podem ser cadastradas em `HOLIDAY_OVERRIDES`.

## Nuvem
- Medidor de espaço no Perfil (limite do Firestore: 1 MiB por documento). Aviso a partir de 70%.
- Envio bloqueado com mensagem clara antes de estourar o limite.
- Tombstones de batidas apagadas são compactados em dias com mais de 120 dias.
- Novo botão **Apagar meus dados da nuvem** (dupla confirmação). Apaga o documento do Firestore e os dados deste navegador.

## Deploy e qualidade
- O deploy copia todos os CSS/JS e falha se `index.html` referenciar arquivo ausente (antes `timeflow-register-calendar-v1.8.3.css` ficava fora).
- CI roda todos os testes (antes 2 de 3 no deploy). Validação dispara em PRs e no `main`.
- Testes novos: importações, parser do espelho, parser de planilha, feriados e compactação.
- Mensagens de erro e linhas do espelho escapadas antes de ir para a tela.
- Removidos `ui-v1.6.js` e `ui-v1.7.js` (sem referência). Versão alinhada em todos os arquivos.
- Exemplo de horários na documentação trocado por valores fictícios.

## Não feito nesta versão
- **SRI / hospedar pdf.js e SheetJS localmente:** os arquivos não puderam ser baixados no ambiente da auditoria.
- **Dias em subcoleção (`users/{uid}/days`):** migração de dados reais com risco de perda; adiada até o medidor indicar necessidade.
