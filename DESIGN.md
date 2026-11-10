# DESIGN.md — Eu tenho um ponto

Guia visual do app (v2.2.0, tema **Moderno escuro**). Leia antes de mexer em `app.css`, ou em qualquer HTML gerado pelo `app.js`.
Os valores abaixo são os tokens do `:root` no topo de `app.css`. Use sempre o token e nunca a cor solta.

## Princípios
1. **Bater ponto em 1 toque.** A ação principal fica fixa na área do polegar (acima das abas) e mostra o que vai acontecer e a hora atual.
2. **Um destaque por tela.** Só o primeiro indicador ("Falta para fechar", "Saldo do mês") leva o degradê violeta. O resto é neutro.
3. **Números primeiro.** Horas em fonte display, negrito e com dígitos de largura fixa (`tabular-nums`). Rótulos curtos e cinza.
4. **Vidro só na navegação.** Abas, barra superior, menu lateral e avisos usam blur. Conteúdo vai em cards opacos (blur em card pesa no celular).
5. **Errar é barato.** Toda batida rápida tem Desfazer. Ações que apagam dados são vermelhas e pedem confirmação.

## Cores
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0B0B12` | fundo do app, theme-color, manifest |
| `--surface` | `#15151F` | cards |
| `--surface-2` | `#1C1C28` | card elevado / estado desativado |
| `--fill` / `--fill-hover` | `#22222F` / `#2A2A39` | botões secundários, campos, mini indicadores dentro de card |
| `--line` / `--line-strong` | violeta 10% / 20% | bordas de 1px |
| `--text` / `--muted` / `--faint` | `#F3F3F8` / `#8C8CA6` / `#4A4A60` | texto principal / rótulos / desativado |
| `--accent` | `#8B6CFF` | links, foco, marcação atual |
| `--grad` | `#7A5CFF → #A27BFF` | botão principal, indicador em destaque, aba ativa no PC |
| `--grad-brand` | `#7A5CFF → #22C7FF` | logo "e." e barra de progresso |
| `--good` | `#2FD39A` | saldo positivo, batida feita |
| `--bad` | `#FF5C86` | saldo negativo, ações destrutivas (`--bad-soft` de fundo) |
| `--warn` | `#FFC44D` | "Conferir", pendências |
| `--bank` | `#4DB8FF` | folga banco |

Não use o laranja antigo (`#FF9F0A`) nem os cinzas do iOS (`#333336`, `#636366`).

## Tipografia
- Texto: `--font` (Segoe UI Variable Text, com SF/Roboto como reserva).
- Números e títulos: `--display` (Segoe UI Variable Display), peso 700, `letter-spacing` negativo.
- Relógio da tela Hoje: 76–112px, degradê branco → lilás.
- Título de página: 34px / 750. Rótulos: 12–13px, `--muted`. Títulos de seção em card: 12px maiúsculo.

## Forma
- Raios: card `--radius` 26px · campo/mini `--radius-sm` 16px · pequeno `--radius-xs` 10px · botões e abas em **pílula** (999px).
- Sombra de card: `--card-shadow`. Só o indicador em destaque e o botão principal têm brilho (`--glow`).
- Espaço entre blocos: 22px. Padding de card: 16–20px.

## Componentes
- **Dock de bater ponto** (`.tf-action-dock`): `Corrigir` pequeno (68px, ícone) + botão grande `--grad` com "Registrar · Próxima marcação" e a hora. No celular fica fixo acima das abas; no PC, dentro do card do relógio. Jornada completa = sólido `--surface-2`.
- **Abas** (`.bottom-nav`): pílula de vidro; aba ativa em pílula clara (`--text` com texto `--bg`).
- **Seletor** (`.segmented`): fundo `--fill`; opção ativa em pílula clara (mesma linguagem das abas).
- **Botões**: `.primary`/`.cta` = `--grad`; `.secondary` = `--fill`; destrutivo (`#reset`, `#deleteCloud`, `.danger`) = `--bad-soft` com texto `--bad`.
- **Indicadores** (`.tf-metric`): rótulo pequeno, número 28px, nota embaixo. Dentro de outro card (`.kpi-mini`), sem sombra e com fundo `--fill`.
- **Aviso** (`.toast`): vidro no topo, com ação opcional (`Desfazer`) em pílula `--accent-soft`.

## Não fazer
- Card dentro de card com sombra.
- Mais de um destaque em degradê na mesma tela.
- Blur em cards de conteúdo.
- Botão destrutivo com cara de botão comum.
- Cor solta no CSS ou no HTML do `app.js`: crie um token, se faltar.
