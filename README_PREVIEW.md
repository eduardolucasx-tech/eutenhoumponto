# Eu tenho um ponto. — Prévia 1.6.1

O arquivo `preview.html` abre `index.html?demo=1`.

## Quando usar
- Para inspecionar o layout no Opera, Chrome ou Safari sem autenticar no Firebase.
- Para testar as abas Início, Registrar, Mês e Perfil com registros de demonstração.

## Segurança e dados
- A prévia é LOCAL. O Firebase Auth e Firestore não são inicializados nesse modo.
- Uma conta de demonstração sintética (`__local_preview_v161__`) isola os registros.
- Nenhum dado de demonstração é enviado à nuvem.
- O armazenamento local pode ser bloqueado por alguns sistemas de preview em iframe. Nesse caso, o layout ainda abre, mas registros podem não persistir ao recarregar.
- O modo local não mostra nem modifica dados da conta Google.

## Acesso
- `preview.html` redireciona para `index.html?demo=1`.
- Em um host estático, abra diretamente `index.html?demo=1`.
- Ao abrir `index.html` como arquivo `file://`, a prévia local é ativada automaticamente.
- Em uma URL comum, o botão **Experimentar sem login** abre a prévia local.
- O login real Google ainda exige domínio autorizado em Firebase Authentication > Settings > Authorized domains, com HTTPS.

Para limpar cache após atualização, no Opera use Ctrl+Shift+R.

Esta versão é um teste de UI; não substitui os testes com Firebase real antes da publicação em produção.
