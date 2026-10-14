# 🃏 Truco Mineiro 3D

Jogo de truco mineiro multiplayer (2 ou 4 jogadores), com mesa e cartas em 3D usando Three.js. Inclui suporte a bots, autenticação por token, expiração de salas e testes automatizados.

## Funcionalidades

- Partidas em sala por código/link.
- 2 ou 4 jogadores, humanos ou bots.
- Anfitrião pode adicionar/remover bots no lobby.
- Bots jogam automaticamente, inclusive truco, aceite, aumento e fuga.
- Servidor autoritativo: cartas dos outros jogadores nunca são enviadas ao navegador.
- Tokens por jogador para ações e stream SSE.
- Expiração automática de salas inativas.
- Rate limiting básico por IP.
- Texturas da mesa e borda servidas por `/texture/*`.
- Testes unitários e de integração.

## Requisitos

- Node.js 16 ou superior.

## Como executar

```bash
npm start
```

ou:

```bash
node server.js
```

Abra `http://localhost:3000`, informe seu nome e crie uma sala.

Para usar outra porta:

```bash
PORT=8080 node server.js
```

O endereço da rede local é impresso no terminal para convidar amigos.

## Estrutura do projeto

```text
.
├── server.js
├── package.json
├── public/
│   └── index.html
├── src/
│   ├── constants.js
│   ├── ai/
│   │   └── BotAI.js
│   ├── models/
│   │   ├── Deck.js
│   │   └── Room.js
│   ├── services/
│   │   ├── ClientRegistry.js
│   │   └── RoomStore.js
│   ├── texture/
│   │   ├── borda_mesa.jpg
│   │   └── fundo_mesa.jpg
│   └── utils/
│       └── CardRules.js
└── tests/
    ├── api.test.js
    └── room.test.js
```

## Regras implementadas

- Baralho de 40 cartas.
- Manilhas fixas: `4♣ > 7♥ > A♠ > 7♦`.
- Ordem restante: `3, 2, A, K, J, Q, 7, 6, 5, 4`.
- Até 12 pontos.
- Melhor de 3 vazas, com embuchada.
- Truco: 3 → 6 → 9 → 12.
- Quem aceita a última aposta não pode aumentar de novo.
- Mão de dez: vale 3, sem truco.

## Testes

```bash
npm test
```

ou:

```bash
node --test "tests/**/*.test.js"
```

## Segurança

- Ações e SSE exigem token individual por jogador.
- Id de bot não pode ser usado em requisições externas.
- Salas expiram após 30 minutos de inatividade.
- Rate limiting básico por IP.
- Código de sala gerado com `crypto`.
- Estado de sala isolado por requisição, evitando concorrência entre salas.
- Texturas servidas com validação de caminho.

## Observação

O three.js é carregado do CDN. É necessário internet no navegador, a menos que o arquivo seja baixado para `public/`.
Salas ficam somente em memória.
