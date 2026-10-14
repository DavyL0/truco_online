'use strict';

const { MANILHA_STRENGTH, ORDINARY_STRENGTH, BET_LABELS } = require('../constants');

class CardRules {
  static strength(card) {
    if (typeof card !== 'string') return 0;
    return MANILHA_STRENGTH[card] || ORDINARY_STRENGTH[card.charAt(0)] || 0;
  }

  static nextBetValue(value) {
    return value === 1 ? 3 : value + 3;
  }

  static canAsk(room, seat) {
    return (
      room.phase === 'play' &&
      !room.pend &&
      room.turn === seat &&
      !room.ten &&
      room.value < 12 &&
      room.lastRaise !== seat % 2
    );
  }
}

module.exports = { CardRules, BET_LABELS };