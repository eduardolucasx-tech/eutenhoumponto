# GitHub Pages: Timeflow Black & Gold v1.8.2

Versão de apresentação do aplicativo publicada a partir da branch **gh-pages**. A versão `main` não é alterada.

## Endereço planejado
- Página principal: https://eduardolucasx-tech.github.io/eutenhoumponto/
- Exemplo de hora extra de 125%: https://eduardolucasx-tech.github.io/eutenhoumponto/?demo=1&overtime=1
- Prévia isolada: https://eduardolucasx-tech.github.io/eutenhoumponto/preview.html

## Ativação do GitHub Pages
O arquivo `.github/workflows/deploy-pages.yml` executa os testes em Node.js e publica somente os arquivos estáticos do site.

No GitHub, acesse:
https://github.com/eduardolucasx-tech/eutenhoumponto/settings/pages

Em **Build and deployment > Source**, escolha **GitHub Actions**, caso ainda não esteja selecionado. Aguarde a execução do workflow no GitHub:
https://github.com/eduardolucasx-tech/eutenhoumponto/actions

Alternativa se Actions estiver indisponível: escolha **Deploy from a branch**, selecione `gh-pages` e pasta `/(root)`, e salve. Isso usa o site diretamente da branch.

## Firebase e privacidade
- Em `github.io`, o app abre **em demonstração** por padrão, sem Firebase.
- O parâmetro `overtime=1` cria batidas fictícias para mostrar um dia com 125% da jornada.
- Nenhum dado real do Firestore é carregado na demonstração.
- O login real no Pages exige incluir `eduardolucasx-tech.github.io` em **Firebase Authentication > Settings > Authorized domains**.
- Após autorizar o domínio, a URL `?login=1` desativa a demonstração automática. Faça testes completos antes de usar registros reais.
- Não confundir a demonstração com apuração oficial. A versão v1.8.2 não foi homologada ponta a ponta com Firebase.

## Atualizações
Para alterar a versão pública, envie as mudanças para `gh-pages`: o workflow é acionado em novo push.
