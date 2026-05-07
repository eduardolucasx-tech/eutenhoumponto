Eu tenho um ponto. — Release v1.3.10.5

Build atual: v1.3.10.5


================================================================================
ATUALIZAÇÃO v1.3.10.5 — Banco anual simples no modo Tradicional
================================================================================

Mudança:
- No modo Tradicional, o banco passa a ser anual e simples.
- A aba Mês mostra "Banco anual" em vez de "Banco do ciclo".
- Regra:
  - período: 01/01 até hoje;
  - soma todas as horas positivas;
  - soma todas as horas negativas;
  - saldo anual = positivas - negativas.
- Atestado entra como 00:00.
- Folga banco e falta entram como negativo da carga esperada.
- Marcação pendente entra como negativo da carga esperada.
- Dias futuros não entram.
- Nada foi alterado nos modelos Tribuna.


Eu tenho um ponto. — Release v1.3.10.4

Build atual: v1.3.10.4


================================================================================
ATUALIZAÇÃO v1.3.10.4 — Texto sem cabeçalho para planilha comum
================================================================================

Mudança:
- O importador de planilha comum agora reconhece texto sem cabeçalho com 5 colunas fixas:
  Data | Entrada | Saída almoço | Volta almoço | Saída final

Exemplo aceito:
02/02/2026    07:31:00    13:33:00    14:33:00    17:57:00

Mapeamento:
- Coluna 1: Data
- Coluna 2: Entrada
- Coluna 3: Saída almoço
- Coluna 4: Volta almoço
- Coluna 5: Saída final

Observação:
- Em modelos Tradicional/Personalizável, importa as quatro batidas.
- Em modelos Tribuna, importa Entrada e Saída final.
- O app continua ignorando cálculos da planilha e calculando tudo internamente.


Eu tenho um ponto. — Release v1.3.10.3

Build atual: v1.3.10.3


================================================================================
ATUALIZAÇÃO v1.3.10.3 — Registrar limpo + planilha por texto
================================================================================

Mudanças:
- Limpeza visual geral na aba Registrar.
- Organização melhor entre:
  - Comprovante individual
  - Planilha comum
  - Espelho oficial
- Planilha comum agora pode ser importada de duas formas:
  1. Enviando arquivo XLSX/XLS/CSV
  2. Copiando e colando texto do Google Sheets ou Excel
- O texto colado é tratado por tabulação, ponto e vírgula ou espaços múltiplos.
- O app continua importando apenas as batidas:
  - Data
  - Entrada
  - Saída almoço
  - Volta almoço
  - Saída final
- Cálculos continuam sendo feitos pelo app.

Validação:
1. Registrar > Importar.
2. Colar linhas copiadas da planilha no campo Planilha comum.
3. Tocar em Ler texto colado.
4. Conferir prévia.
5. Confirmar importação.


Eu tenho um ponto. — Release v1.3.10.2

Build atual: v1.3.10.2


================================================================================
ATUALIZAÇÃO v1.3.10.2 — Importador de planilha comum
================================================================================

Mudança focada:
- Adicionada opção Registrar > Importar > Importar planilha comum.
- Aceita XLSX, XLS e CSV.
- A planilha é usada apenas como fonte das batidas.
- O app ignora colunas de cálculo como horas trabalhadas, previstas, saldo e total.
- Mapeamento:
  - Data -> dia da marcação
  - Entrada -> 1ª batida
  - Saída almoço -> 2ª batida
  - Volta almoço / Retorno almoço -> 3ª batida
  - Saída / Saída final -> 4ª batida
- Em modelos Tribuna com almoço automático, usa apenas Entrada e Saída final.
- Em modelos Tradicional/Personalizável, usa as quatro batidas.
- Mostra prévia antes de confirmar.

Validação:
1. Registrar > Importar.
2. Selecionar XLSX/CSV comum.
3. Ler planilha comum.
4. Conferir prévia.
5. Confirmar importação.
6. Ir para Mês e deixar o app calcular.


Eu tenho um ponto. — Release v1.3.10.1

Build atual: v1.3.10.1


================================================================================
HOTFIX v1.3.10.1 — Restaurar login Google
================================================================================

Correção mínima:
- Corrigido erro: loginWithGoogle is not defined.
- Restauradas funções loginWithGoogle() e logoutGoogle().
- Nenhuma alteração nos cálculos de banco.
- Nenhuma alteração visual relevante.

Validação:
1. Abrir app.
2. Confirmar topo v1.3.10.1.
3. Tela de login não deve mostrar erro de carregamento.
4. Botão Entrar com Google deve abrir login.


Eu tenho um ponto. — Release v1.3.10

Build atual: v1.3.10


================================================================================
ATUALIZAÇÃO v1.3.10 — Funções de nuvem estáveis
================================================================================

Correção:
- Corrigidos erros do console:
  - hydrateFromCloud is not defined
  - pushStateToCloud is not defined
  - pullStateFromCloud is not defined
- Criada camada estável com essas três funções.
- Botões Enviar para a nuvem e Baixar da nuvem voltam a apontar para funções existentes.
- Perfil continua mostrando erro de nuvem quando houver.

Validação:
1. Abrir Perfil.
2. Tocar em Enviar para a nuvem.
3. Tocar em Baixar da nuvem.
4. Console não deve mostrar funções indefinidas.
5. Se falhar, Perfil deve mostrar o erro real.


Eu tenho um ponto. — Release v1.3.9

Build atual: v1.3.9


================================================================================
ATUALIZAÇÃO v1.3.9 — Hotfix envio/baixa da nuvem
================================================================================

Correção:
- A v1.3.8 podia ficar mostrando apenas "salvando localmente".
- Refeito pushStateToCloud para:
  - inicializar Firebase se necessário;
  - validar Firestore;
  - retornar true/false real;
  - guardar último erro de nuvem.
- Refeito hydrateFromCloud para baixar sem forçar sobrescrita indevida.
- Perfil agora mostra o último erro de nuvem quando houver.
- Botão Enviar para a nuvem mostra mensagem com erro real se falhar.

Validação:
1. Abrir Perfil.
2. Tocar em Enviar para a nuvem.
3. Se funcionar: deve aparecer "Dados enviados para a nuvem".
4. Se falhar: Perfil mostra o último erro.
5. No Firestore, conferir users/{uid}/profile/main.


Eu tenho um ponto. — Release v1.3.8

Build atual: v1.3.8


================================================================================
ATUALIZAÇÃO v1.3.8 — Dias futuros e sincronização sem depender do relógio
================================================================================

Correções:
- Dias depois da data de hoje não entram mais no saldo negativo.
- Dias futuros aparecem cinza na aba Mês.
- Dias futuros mostram "--:--" em vez de saldo negativo.
- Dias futuros não entram no débito do mês nem no total do ciclo.
- Botões ajustados para:
  - Folga banco
  - Atestado
  - Falta
- O cálculo continua:
  - Folga banco = debita a carga esperada do dia
  - Atestado = impacto 0
  - Falta = debita a carga esperada do dia
- Merge entre dispositivos deixou de depender do horário do celular/PC.
- O app passa a unir batidas por horário, reduzindo divergência quando um dispositivo está com relógio atrasado.

Observação:
- Se um dispositivo estiver com relógio errado, a hora exibida de sincronização pode ficar diferente,
  mas o merge das batidas não deve depender mais dessa diferença.


Eu tenho um ponto. — Release v1.3.7

Build atual: v1.3.7


================================================================================
ATUALIZAÇÃO v1.3.7 — Débito pendente, ausências e sync reforçado
================================================================================

Correções e melhorias:
- Marcações pendentes agora entram como débito no mês e no ciclo.
- Folga banco debita a carga esperada do dia.
- Atestado fecha o dia com impacto 0.
- Falta debita a carga esperada do dia.
- Na aba Mês, tocar em um dia abre Registrar naquela data.
- Na aba Registrar, foram adicionados: Folga banco -8, Atestado 0, Falta -8 e Remover ausência.
- Cada salvamento tenta enviar imediatamente para a nuvem.
- Merge entre dispositivos reforçado por horário de batida.

Validação:
1. Aba Mês > tocar em um dia.
2. Aplicar Folga banco/Atestado/Falta.
3. Ver o saldo do mês e ciclo atualizar.
4. Testar celular/desktop com Enviar/Baixar da nuvem.


Eu tenho um ponto. — Release v1.3.6

Build atual: v1.3.6


================================================================================
ATUALIZAÇÃO v1.3.6 — Leitura PDF reforçada
================================================================================

Correção:
- O PDF podia ter o texto extraído corretamente, mas o parser não reconhecia linhas porque
  o PDF.js entrega a tabela quebrada em colunas/trechos.
- Adicionada normalização específica para texto de espelho.
- Adicionada extração por blocos entre datas, aceitando texto contínuo.
- Adicionada função parseEspelhoLine para reaproveitar a heurística de batidas.
- Quando o texto é lido, mas nenhuma linha é reconhecida, o app mostra diagnóstico claro
  em vez de parecer que o botão não funcionou.

Validação:
1. Registrar > Importar.
2. Selecionar PDF do espelho.
3. Tocar em Ler PDF do espelho.
4. O texto deve aparecer no campo.
5. A prévia deve aparecer logo abaixo do bloco de espelho.


Eu tenho um ponto. — Release v1.3.5

Build atual: v1.3.5


================================================================================
ATUALIZAÇÃO v1.3.5 — Resultado da importação logo abaixo da entrada
================================================================================

Correção:
- O bloco "Marcação encontrada" agora aparece logo abaixo de "Importar comprovante".
- O resultado do espelho oficial aparece logo abaixo de "Importar espelho oficial".
- Adicionado scroll suave para levar o usuário até o resultado gerado.
- Pequeno destaque visual para cards de resultado.

Validação:
1. Ir em Registrar > Importar.
2. Colar texto com DATA e HORA.
3. Tocar em Ler DATA e HORA.
4. O card "Marcação encontrada" deve aparecer imediatamente abaixo do bloco de comprovante.


Eu tenho um ponto. — Release v1.3.4

Build atual: v1.3.4


================================================================================
ATUALIZAÇÃO v1.3.4 — Hotfix Perfil e Importar
================================================================================

Correções:
- Botão Perfil da barra inferior agora chama goProfile() diretamente.
- Estado ativo da barra inferior corrigido para config/profile.
- Botões da aba Importar não dependem mais de IDs globais do navegador.
- Corrigido fluxo de:
  - Ler DATA e HORA
  - Adicionar marcação importada
  - Ler texto do espelho
  - Ler PDF do espelho
  - Confirmar importação do espelho
- Ajuste de clique/touch na barra inferior.

Validação:
1. Tocar no botão Perfil da barra inferior.
2. Ir em Registrar > Importar.
3. Colar texto com DATA e HORA.
4. Tocar em Ler DATA e HORA.
5. Confirmar a marcação.


Eu tenho um ponto. — Release v1.3.3

Build atual: v1.3.3


================================================================================
ATUALIZAÇÃO v1.3.3 — Sincronização multidispositivo
================================================================================

Problema identificado:
- Entrar na mesma conta Google em Safari e desktop ainda podia não mostrar as batidas,
  porque o app estava local-first e não forçava leitura da nuvem ao alternar dispositivo.

Correções aplicadas:
- Reforçada a leitura da nuvem ao entrar com Google.
- Leitura da nuvem ao voltar para o app/aba ganhar foco.
- Novo botão no Perfil: Baixar da nuvem.
- Botão antigo foi renomeado para Enviar para a nuvem.
- Merge mais inteligente:
  - se o navegador local estiver vazio, a nuvem ganha;
  - se houver dados locais, o app mescla sem apagar batidas.
- Status da Home passa a mostrar horário da última sincronização quando disponível.

Como validar:
1. No celular, bata ponto e use Perfil > Enviar para a nuvem.
2. No desktop, entre com a mesma conta Google.
3. Use Perfil > Baixar da nuvem.
4. As batidas devem aparecer.
5. Abra o Firestore e confirme users/{uid}/profile/main com campo days preenchido.


Eu tenho um ponto. — Release v1.3.2

Build atual: v1.3.2

================================================================================
ATUALIZAÇÃO v1.3.2 — Polimento de visual e fluxo
================================================================================

Aplicado nesta versão:
- remoção da foto redundante ao lado da saudação na Home;
- toast/snackbar no lugar dos alerts principais;
- Home mais limpa, com indicador de sincronização;
- aba Registrar com alternância entre Manual e Importar;
- formulário manual adaptado ao modelo ativo;
- aba Mês reorganizada em ordem mais executiva;
- Perfil reorganizado em blocos: Conta, Jornada e Dados;
- ajustes visuais finos para leitura e fluxo.

Validação sugerida:
1. Home: verificar saudação sem foto repetida.
2. Registrar: alternar Manual/Importar.
3. Mês: conferir nova ordem de blocos.
4. Perfil: testar salvar, sincronizar e desconectar.
5. Toasts: testar batida, salvar manual e sincronizar.

Eu tenho um ponto. — Release v1.3.1

Build atual: v1.3.1


================================================================================
ATUALIZAÇÃO v1.3.1 — Refino global de layout
================================================================================

Objetivo:
- Corrigir elementos "fora do esquadro" no app inteiro, principalmente em mobile/iPhone/Safari.

Ajustes aplicados:
- Correção global de overflow horizontal.
- Campos input/select/textarea agora respeitam 100% da largura do card.
- Inputs de data/hora/texto com appearance ajustado para iOS Safari.
- Cards e componentes com max-width e min-width seguros.
- Aumento do espaço inferior do main para não colidir com a bottom bar.
- Wrapping em blocos flex (perfil, arquivos, cabeçalhos de dia, etc.).
- Grids e ações passam a empilhar em telas menores.
- Melhoras de responsividade geral em 430px / 390px / 360px.
- Versão atualizada no topo para v1.3.1.

Validação sugerida:
1. Abrir Registrar no iPhone/Safari.
2. Verificar se os campos não ultrapassam os cards.
3. Testar Home, Registrar, Mês e Perfil.
4. Conferir se não existe rolagem horizontal.


Eu tenho um ponto. — Release v1.3.0

Build atual: v1.3.0


================================================================================
ATUALIZAÇÃO v1.3.0 — Firestore limpo / build estável
================================================================================

Esta versão foi reconstruída a partir da v1.1.1 estável, com Firestore Sync aplicado de forma limpa.

Correções:
- Removidas camadas acumuladas que estavam quebrando deploy/render.
- Firebase Auth + Firestore Sync organizados em um único bloco.
- Sem duplicidade de firebaseReady/cloudReady.
- Render seguro com fallback.
- Perfil renderizado diretamente por renderProfileScreen().
- README e topo informam a versão atual.
- Vercel deve conseguir concluir o deploy normalmente.

Firestore:
- Salva em users/{uid}/profile/main
- Mantém cópia local em localStorage
- Botão Sincronizar agora no Perfil


Eu tenho um ponto. — Release v1.1.1

Base: v3.3 refinada
Nome e logo mantidos.
Tema premium dark/carbon/tech.
Modelos:
- Tribuna Hub/Prog
- Tribuna Jornalismo
- Tradicional
- Personalizável

Principais recursos:
- Bater ponto
- Registro manual
- Importação de comprovante por texto
- Importação experimental de espelho PDF da Tribuna
- Banco do ciclo com prioridade para saldo oficial importado
- Virada de dia sem encerrar jornada às 23:59
- Limpar última batida
- Exportação CSV/Excel/relatório
- Layout mobile-first

Observação:
A leitura OCR por imagem e login Google real ficam para a futura versão Firebase.

Correção v1.0.1:
- Adicionado botão Desconectar conta Google na aba Perfil.

Atualização v1.1:
- Adicionado login real com Google via Firebase Authentication.
- Incluído arquivo firebase-config.js para colar a configuração do Firebase.
- Botão Desconectar conta Google agora chama logout quando Firebase estiver configurado.
- Os dados locais de ponto continuam preservados ao desconectar.

Atualização v1.1.1:
- firebase-config.js preenchido com o projeto eutenhoumponto-ce487.
