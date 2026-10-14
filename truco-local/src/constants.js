'use strict';

const MANILHA_STRENGTH = Object.freeze({
  '4C': 14,
  '7H': 13,
  'AS': 12,
  '7D': 11,
});

const ORDINARY_STRENGTH = Object.freeze({
  '3': 10,
  '2': 9,
  'A': 8,
  'K': 7,
  'J': 6,
  'Q': 5,
  '7': 4,
  '6': 3,
  '5': 2,
  '4': 1,
});

const BET_LABELS = Object.freeze({
  3: 'TRUCO',
  6: 'SEIS',
  9: 'NOVE',
  12: 'DOZE',
});

const SUITS = 'CHSD';
const RANKS = 'A234567QJK';

module.exports = {
  MANILHA_STRENGTH,
  ORDINARY_STRENGTH,
  BET_LABELS,
  SUITS,
  RANKS,
};