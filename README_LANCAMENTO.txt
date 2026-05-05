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
