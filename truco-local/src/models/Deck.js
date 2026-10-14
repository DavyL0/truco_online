'use strict';

const { SUITS, RANKS } = require('../constants');

class Deck {
  static create() {
    const cards = [];
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        cards.push(rank + suit);
      }
    }
    return cards;
  }

  static shuffle(cards) {
    const result = [...cards];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  static createShuffled() {
    return Deck.shuffle(Deck.create());
  }
}

module.exports = { Deck };