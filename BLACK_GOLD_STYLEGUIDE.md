# Timeflow Black & Gold • v1.8.0

Variante visual construída sobre `design/v1.7.0-timeflow`. Mantém as regras de jornada e o preview local isolado, sem alterar o Firestore de produção.

## Direção visual

- Fundo preto: `#0B0B0D`
- Painéis grafite: `#17171A`
- Dourado acetinado (navegação, CTA, contornos de foco): `#DFBF78`
- Dourado claro: `#F0D69E`
- Texto: `#F3EFE6`
- Verde das batidas de entrada e saldos positivos: `#60D1A0`
- Azul para intervalo, retorno e dias com batidas incompletas: `#7CC4F5`
- Vermelho para batidas de saída e saldos negativos: `#EF8585`

**Regra:** o dourado identifica a marca e as ações. Não substituir verde, azul e vermelho nos estados semânticos.

## Estrutura

A camada final `timeflow-black-gold-v1.8.css` se sobrepõe aos estilos legados e anteriores. O `index.html` mantém tema escuro fixo. `app.js` traz classes semânticas por etapa da jornada e diferencia registro incompleto no mapa do mês.

O `preview.html` abre `index.html?demo=1`, com dados fictícios e sem login Firebase.

## Validação

- 13 verificações estáticas concluídas.
- 11 verificações de interação em DOM simulado.
- Testes em navegador real e Firestore autenticado ainda necessários antes de integrar à versão publicada.
