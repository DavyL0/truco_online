const test = require('node:test');
const assert = require('node:assert/strict');

const { Room } = require('../src/models/Room');
const { Deck } = require('../src/models/Deck');
const { CardRules } = require('../src/utils/CardRules');
const { BotAI } = require('../src/ai/BotAI');

test('deck has 40 unique cards', () => {
  const cards = Deck.create();
  assert.equal(cards.length, 40);
  assert.equal(new Set(cards).size, 40);
});

test('card strength keeps manilha order', () => {
  assert.equal(CardRules.strength('4C'), 14);
  assert.equal(CardRules.strength('7H'), 13);
  assert.equal(CardRules.strength('AS'), 12);
  assert.equal(CardRules.strength('7D'), 11);
  assert.ok(CardRules.strength('3C') > CardRules.strength('AC'));
});

test('deal sets valid hands and starting player', () => {
  const room = new Room('TEST', 'h1', 'Human');
  room.addPlayer('h2', 'Human 2');
  room.startMatch();
  assert.equal(room.n, 2);
  assert.equal(room.hands[0].length, 3);
  assert.equal(room.hands[1].length, 3);
  assert.ok(room.turn >= 0 && room.turn < 2);
});

test('two-player round finishes and score winner', () => {
  const room = new Room('TEST', 'h1', 'Human');
  room.addPlayer('h2', 'Human 2');
  room.startMatch();
  let guard = 0;
  while (room.phase === 'play' && guard < 100) {
    guard += 1;
    const seat = room.turn;
    const player = room.players[seat];
    if (player.isBot) {
      const decision = BotAI.decide(room, seat);
      room.handleAction({ type: decision.type, c: decision.c, id: player.id });
    } else {
      const card = room.hands[seat][0];
      room.handleAction({ type: 'play', c: card, id: player.id });
    }
  }
  assert.equal(room.phase, 'show');
  assert.ok(room.score[0] + room.score[1] > 0);
});

test('viewFor hides other players cards', () => {
  const room = new Room('TEST', 'h1', 'Human');
  room.addPlayer('h2', 'Human 2');
  room.startMatch();
  const view = room.viewFor('h1');
  assert.deepEqual(view.hands[1], ['X', 'X', 'X']);
  assert.notEqual(view.hands[0][0], 'X');
});

test('viewFor serializes safely while a bot timer is active', () => {
  const room = new Room('TEST', 'h1', 'Human');
  room.addPlayer('h2', 'Human 2');
  room.startMatch();
  room.botTimer = setTimeout(() => {}, 1000);

  const view = room.viewFor('h1');

  clearTimeout(room.botTimer);
  assert.equal(view.botTimer, null);
  assert.equal(view.lastActivity, undefined);
  assert.deepEqual(view.hands[1], ['X', 'X', 'X']);
});

test('bot always returns a usable decision', () => {
  const room = new Room('TEST', 'h1', 'Human');
  room.addBot('Bot');
  room.startMatch();
  const botSeat = room.players.findIndex((player) => player.isBot);
  const decision = BotAI.decide(room, botSeat);
  assert.ok(['play', 'truco', 'accept', 'run', 'raise'].includes(decision.type));
  if (decision.type === 'play') assert.ok(decision.c);
});