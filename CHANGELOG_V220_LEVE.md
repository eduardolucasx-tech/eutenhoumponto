# v2.2.0 — Mais leve, mais rápido e visual Moderno escuro

Base: v2.1.1 (estilo iOS escuro com laranja). O visual continua o mesmo, mas mais leve.

## Mudanças
### Velocidade
- O PDF.js (~300 KB) não carrega mais na abertura. Ele só é baixado quando alguém importa um espelho em PDF.
- Os módulos do Firebase começam a baixar junto com o app (modulepreload + preconnect), em vez de só depois do app.js. Fica de fora no modo demonstração.
- Novo `sw.js` (cache offline):
  - página: rede primeiro, e cache só quando estiver offline;
  - arquivos com `?v=` e bibliotecas de versão fixa: vêm do cache;
  - Firestore e login nunca passam pelo cache.
- Tela de abertura (logo + pontinhos) no lugar da tela preta vazia enquanto o app carrega.

### Visual
- Os cards e indicadores ficaram opacos, sem o desfoque de 30px em cada um. O vidro ficou só na barra de abas, na barra superior e no menu lateral, como já dizia o comentário do CSS.
- O desfoque da navegação baixou de 24px para 18px, com o vidro um pouco mais opaco.
- O brilho laranja do fundo perdeu o `filter: blur` em tela cheia, porque os gradientes já são suaves.
- Card "Ontem" na tela Hoje:
  - mostra o saldo curto (ou `--:--`) e "Sem registro · dd/mm" embaixo, em vez de "Sem registro" em letra grande;
  - ocupa a linha toda no celular;
  - fica verde ou vermelho como os outros saldos.
- O selo da barra superior não mostra mais "v2.0.0" antes de carregar.

### Visual novo: Moderno escuro (escolhido entre 5 propostas)
- Fundo grafite azulado (#0B0B12), cards bem arredondados (26px) e violeta elétrico em degradê (#7A5CFF → #A27BFF), com ciano de apoio.
- Relógio grande alinhado à esquerda, com degradê branco → lilás.
- Botões em pílula. O primeiro indicador de cada tela vem em destaque, com o degradê.
- Barra de abas escura com a aba ativa em pílula clara. No PC, a aba ativa leva o degradê.
- Cores de theme-color e do manifest atualizadas.

### Novo arranjo dos botões da tela Hoje (uso no dia a dia)
- O botão de bater ponto agora é uma barra grande fixa logo acima das abas, na área do polegar, sempre visível sem rolar.
- Ele mostra a próxima marcação ("Registrar · Saída") e a hora atual, atualizada a cada segundo.
- "Corrigir" virou um botão pequeno com ícone ao lado, para não ser tocado sem querer no lugar do principal.
- A linha "Final de expediente" fica embaixo da barra de progresso.
- No PC, a mesma barra fica dentro do card do relógio.
- Um degradê atrás da barra impede que o conteúdo rolando por baixo atrapalhe a leitura.

### Para o dia a dia
- **Desfazer depois de bater ponto.** O aviso traz o botão "Desfazer" por 5 s e o celular vibra de leve (onde o aparelho permite; o iPhone não vibra por app web). O Desfazer só remove a batida se ela ainda for a última.
- **"Falta para fechar".** Com a jornada aberta, o card em destaque mostra quanto falta e a saída prevista. Depois da carga, mostra "Além da jornada +hh:mm". Quando o dia fecha, volta ao saldo do dia normal. A tela se atualiza a cada minuto.
- **Atalho "Bater ponto" no ícone do app** (shortcuts no manifest, abre `index.html?acao=bater`). Ele registra a próxima marcação com a hora atual e oferece Desfazer. Na conta Google, só bate depois de baixar os dados da nuvem. Funciona no Android e no Chrome/Edge do PC; o iPhone não tem atalhos de ícone para apps web.
- Com a jornada completa, a barra de bater ponto fica sólida e discreta.

### Repaginada final (todas as telas)
- Novo `DESIGN.md` com princípios, tokens (cores, fontes, raios), componentes e o que não fazer. É a referência para qualquer ajuste visual futuro.
- `app.css` consolidado:
  - os tokens do Moderno escuro viraram a base do `:root`, em vez de uma camada por cima do laranja;
  - saíram as cores fixas antigas (laranja, cinzas do iOS) e os botões redondos que não eram mais usados.
- Acessibilidade: o modo "reduzir transparência" e os navegadores sem blur voltaram a funcionar (antes o tema novo anulava esse ajuste).
- Seletores (Registro manual/Importar, Comprovante/Planilha/Espelho): a opção ativa agora é uma pílula clara, como nas abas. Antes ficava quase invisível.
- "Justificar o dia": Folga Banco, Atestado e Falta numa linha só, sem quebrar o texto.
- Mês:
  - o quadro "Conferir" ganhou fundo âmbar suave;
  - os mini indicadores do Banco do ciclo não são mais "card dentro de card".
- Ajustes: "Resetar dados locais" e "Apagar nuvem" ficaram em vermelho, para não parecerem botões comuns.
- Login: logo em degradê violeta/ciano (antes laranja) e botão Google claro.

### Conferência de comprovantes (vários de uma vez)
- Registrar › Importar › Comprovante agora aceita **vários comprovantes colados juntos**, no texto do e-mail "Carol: Comprovante Clock-In" (no iPhone: "Copiar texto" na imagem).
- Lê só DATA, HORA e NSR. Nome, CPF e o resto do comprovante são ignorados e não são guardados.
- Compara cada comprovante com o que está no app:
  - **Confere** (mesma hora);
  - **Diferença** (até 10 min; mostra quantos minutos e se o app está antes ou depois);
  - **Falta no app**;
  - **Dia já completo** ou **Dia com ausência**.
- O botão "Adicionar N que faltam" inclui só as que faltam (origem `import_receipt`). Diferenças nunca são alteradas sozinhas.
- Batidas de madrugada seguem a regra que já existia (vão para a jornada aberta do dia anterior).
- Colar um comprovante só, sem NSR, continua no fluxo antigo de uma marcação.
- Novo `tests/receipts.test.cjs`, com 6 casos.

## Não alterado
- Login Google, Firebase/Firestore e sincronização (`sync-core.js`).
- Regras de cálculo, banco de horas e feriados.
- Importadores de planilha e espelho. O espelho em PDF continua igual, só carrega o leitor na hora. (O de comprovante mudou: ver acima.)

## Testes
- Os 5 testes existentes passam.
- Novo `tests/service-worker.test.cjs`, com 5 casos de rotas do cache.
- O service worker não pôde ser registrado no navegador de teste local. Conferir no deploy de prévia do Vercel (DevTools > Application > Service Workers).
