Eu tenho um ponto. — Release v1.2.4

Build atual: v1.2.4


================================================================================
ATUALIZAÇÃO v1.2.4 — Correção definitiva da rota Perfil
================================================================================

Correções:
- Corrigido roteamento da barra inferior.
- Clique em Perfil agora chama diretamente renderConfig().
- O render() agora trata explicitamente:
  - home -> renderHome()
  - register -> renderRegister()
  - month -> renderMonth()
  - config/profile -> renderConfig()
- Mantido o clique no avatar/foto para abrir Perfil.
- Mantido o clique no logo 1. para voltar ao Início.
- Versão visível no topo atualizada para v1.2.4.

Como validar:
1. Abrir o app.
2. Conferir no topo: v1.2.4.
3. Tocar em Perfil na barra inferior.
4. A tela precisa mostrar "Perfil e Configurações".


Eu tenho um ponto. — Release v1.2.3

Build atual: v1.2.3
Nome e logo mantidos.
Firebase Config: eutenhoumponto-ce487
Google Auth: integrado
Firestore Sync: integrado


================================================================================
ATUALIZAÇÃO v1.2.3 — Fix Perfil + versão visível
================================================================================

Data da build: 2026-05-05

Correções:
- Corrigida novamente a navegação da aba Perfil.
- Botão Perfil da barra inferior força tab = 'config' e renderiza Perfil e Configurações.
- Clique na foto/avatar também abre Perfil.
- Clique no logo 1. continua voltando para Início / Bater ponto.
- Botões garantidos na aba Perfil:
  - Sincronizar agora
  - Desconectar conta Google

Versão visível:
- O topo do app agora mostra a versão junto do modelo:
  Ex.: v1.2.3 · TRIBUNA HUB/PROG
- A tela Perfil também mostra: Versão v1.2.3

Observação:
- Em atualização no celular/PWA, se a versão antiga continuar aparecendo,
  remova o app da tela inicial ou limpe o cache do site antes de testar.


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


Atualização v1.2:
- Ligado Firestore para sincronizar dados por conta Google.
- O app salva perfil, marcações, importações e banco oficial em:
  users/{uid}/profile/main
- O app ainda mantém uma cópia local para abrir rápido.

Regras Firestore recomendadas:

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    match /users/{uid} {
      allow read, create, update, delete: if isOwner(uid);

      match /profile/{docId} {
        allow read, create, update, delete: if isOwner(uid);
      }

      match /days/{dayId} {
        allow read, create, update, delete: if isOwner(uid);
      }

      match /imports/{importId} {
        allow read, create, update, delete: if isOwner(uid);
      }

      match /bankCycles/{cycleId} {
        allow read, create, update, delete: if isOwner(uid);
      }
    }

    match /publicConfig/{docId} {
      allow read: if true;
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}

Correção v1.2.1:
- Botão Sincronizar agora garantido na aba Perfil.

Correção v1.2.2:
- Corrigida navegação da aba Perfil.
- Botões Sincronizar agora e Desconectar conta Google garantidos no Perfil.
