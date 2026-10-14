'use strict';

const { CardRules } = require('../utils/CardRules');

class BotAI {
  static handStrength(hand) {
    let strength = 0;
    for (const card of hand || []) strength += CardRules.strength(card);
    const ranks = (hand || []).map((card) => card.charAt(0));
    const hasPair = ranks.some((rank, index) => ranks.indexOf(rank) !== index);
    if (hasPair) strength += 8;
    return strength;
  }

  static chooseCardToPlay(room, seat) {
    const hand = [...(room.hands[seat] || [])];
    if (hand.length === 0) return null;

    const table = room.table || [];
    if (table.length === 0) {
      return hand.sort((a, b) => CardRules.strength(b) - CardRules.strength(a))[0];
    }

    const currentMax = Math.max(...table.map((entry) => CardRules.strength(entry.c)));
    const winningCards = hand.filter((card) => CardRules.strength(card) > currentMax);

    if (winningCards.length > 0) {
      return winningCards.sort((a, b) => CardRules.strength(a) - CardRules.strength(b))[0];
    }

    return hand.sort((a, b) => CardRules.strength(a) - CardRules.strength(b))[0];
  }

  static decide(room, seat) {
    const hand = room.hands[seat] || [];
    const pendingBet = room.pend;

    if (pendingBet && seat % 2 !== pendingBet.team) {
      const strength = BotAI.handStrength(hand);
      if (pendingBet.to < 12 && strength >= 48) {
        return { type: 'raise' };
      }
      if (strength < 24) {
        return { type: 'run' };
      }
      return { type: 'accept' };
    }

    if (CardRules.canAsk(room, seat)) {
      const strength = BotAI.handStrength(hand);
      if (strength >= 34 && Math.random() < 0.75) {
        return { type: 'truco' };
      }
    }

    return { type: 'play', c: BotAI.chooseCardToPlay(room, seat) };
  }
}

module.exports = { BotAI };