// Configuração Firebase do app.
// 1) No Firebase Console, crie/abra o projeto.
// 2) Adicione um app Web.
// 3) Copie o firebaseConfig e substitua os valores abaixo.
// 4) Em Authentication > Sign-in method, ative Google.
// 5) Em Authentication > Settings > Authorized domains, adicione seu domínio da Vercel.

window.FIREBASE_CONFIG = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};
