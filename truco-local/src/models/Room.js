'use strict';

const crypto = require('crypto');
const { Deck } = require('./Deck');
const { CardRules, BET_LABELS } = require('../utils/CardRules');

class Room {
  constructor(code, hostId, hostName) {
    this.code = code;
    this.host = hostId;
    this.phase = 'lobby';
    this.players = [{ id: hostId, name: hostName, isBot: false, token: Room.generateToken() }];
    this.score = [0, 0];
    this.rev = 0;

    this.n = 0;
    this.hands = {};
    this.dealer = -1;
    this.mao = 0;
    this.turn = 0;
    this.maoTeam = 0;
    this.table = [];
    this.vazas = [];
    this.value = 1;
    this.lastRaise = -1;
    this.pend = null;
    this.clear = false;
    this.ten = false;
    this.msg = '';
    this.winner = null;
    this.botTimer = null;
    this.lastActivity = Date.now();
  }

  static generateToken() {
    return crypto.randomBytes(24).toString('hex');
  }

  addBot(name) {
    if (this.phase !== 'lobby' || this.players.length >= 4) return false;
    const botNumber = this.players.filter((player) => player.isBot).length + 1;
    this.players.push({
      id: `bot:${this.code}:${botNumber}:${Date.now()}`,
      name: name || `Bot ${botNumber}`,
      isBot: true,
      token: null,
    });
    return true;
  }

  removeBot() {
    if (this.phase !== 'lobby') return false;
    for (let i = this.players.length - 1; i >= 0; i -= 1) {
      if (this.players[i].isBot) {
        this.players.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  playerName(seat) {
    const player = this.players[seat];
    return player ? player.name : '?';
  }

  teamName(teamIndex) {
    return this.players
      .filter((_, index) => index % 2 === teamIndex)
      .map((player) => player.name)
      .join(' & ');
  }

  hasPlayer(playerId) {
    return this.players.some((player) => player.id === playerId);
  }

  addPlayer(playerId, playerName) {
    const token = Room.generateToken();
    this.players.push({ id: playerId, name: playerName, isBot: false, token });
    this.lastActivity = Date.now();
    return token;
  }

  startMatch() {
    this.n = this.players.length;
    this.score = [0, 0];
    this.dealer = -1;
    this.deal();
  }

  restartMatch() {
    this.score = [0, 0];
    this.dealer = -1;
    this.deal();
  }

  deal() {
    this.lastActivity = Date.now();
    const deck = Deck.createShuffled();
    this.hands = {};
    for (let i = 0; i < this.n; i += 1) {
      this.hands[i] = deck.splice(0, 3);
    }
    this.dealer = (this.dealer + 1) % this.n;
    this.mao = (this.dealer + 1) % this.n;
    this.turn = this.mao;
    this.maoTeam = this.mao % 2;
    this.table = [];
    this.vazas = [];
    this.value = 1;
    this.lastRaise = -1;
    this.pend = null;
    this.clear = false;
    this.ten = this.score[0] === 10 || this.score[1] === 10;
    if (this.ten) this.value = 3;
    this.phase = 'play';
    this.msg =
      'Nova mão' +
      (this.ten ? ' (mão de dez: vale 3, sem truco)' : '') +
      '. Começa ' +
      this.playerName(this.mao);
  }

  evaluateVazas(vazas) {
    const wins = [0, 1].map((teamIndex) =>
      vazas.filter((value) => value === teamIndex).length
    );
    if (wins[0] >= 2) return 0;
    if (wins[1] >= 2) return 1;
    if (vazas.length === 2) {
      if (vazas[0] === -1 && vazas[1] !== -1) return vazas[1];
      if (vazas[1] === -1 && vazas[0] !== -1) return vazas[0];
      return null;
    }
    if (vazas.length === 3) {
      if (vazas[2] !== -1) return vazas[2];
      return vazas[0] !== -1
        ? vazas[0]
        : vazas[1] !== -1
        ? vazas[1]
        : this.maoTeam;
    }
    return null;
  }

  endHand(winningTeam, points, reason) {
    this.score[winningTeam] += points;
    this.phase = 'show';
    this.pend = null;
    this.msg =
      (reason || '') +
      'Time ' +
      this.teamName(winningTeam) +
      ' ganha ' +
      points +
      ' ponto' +
      (points > 1 ? 's' : '');
    if (this.score[winningTeam] >= 12) {
      this.phase = 'over';
      this.winner = winningTeam;
      this.msg = '🏆 ' + this.teamName(winningTeam) + ' venceu a partida!';
    }
  }

  play(seat, card) {
    if (
      this.turn !== seat ||
      this.pend ||
      !(this.hands[seat] || []).includes(card)
    ) {
      return false;
    }
    if (this.clear) {
      this.table = [];
      this.clear = false;
    }
    this.hands[seat] = this.hands[seat].filter((item) => item !== card);
    this.table.push({ s: seat, c: card });

    if (this.table.length < this.n) {
      this.turn = (seat + 1) % this.n;
      this.msg = this.playerName(seat) + ' jogou';
      return true;
    }

    const strengths = this.table.map((entry) => CardRules.strength(entry.c));
    const maxStrength = Math.max(...strengths);
    const topCards = this.table.filter(
      (entry) => CardRules.strength(entry.c) === maxStrength
    );

    let winningSeat;
    if (
      topCards.length > 1 &&
      topCards.some((entry) => entry.s % 2 !== topCards[0].s % 2)
    ) {
      this.vazas.push(-1);
      winningSeat = this.table[0].s;
      this.msg = 'Empatou (embuchou)!';
    } else {
      winningSeat = topCards[0].s;
      this.vazas.push(winningSeat % 2);
      this.msg = this.playerName(winningSeat) + ' fez a vaza';
    }

    this.turn = winningSeat;
    this.clear = true;

    const result = this.evaluateVazas(this.vazas);
    if (result !== null) {
      this.endHand(result, this.value);
    }
    return true;
  }

  canAsk(seat) {
    return CardRules.canAsk(this, seat);
  }

  handleAction(action) {
    this.lastActivity = Date.now();
    const seat = this.players.findIndex((player) => player.id === action.id);

    if (action.type === 'addBot' && action.id === this.host && this.phase === 'lobby') {
      this.addBot();
      return;
    }
    if (action.type === 'removeBot' && action.id === this.host && this.phase === 'lobby') {
      this.removeBot();
      return;
    }

    if (
      action.type === 'start' &&
      action.id === this.host &&
      this.phase === 'lobby' &&
      (this.players.length === 2 || this.players.length === 4)
    ) {
      this.startMatch();
      return;
    }

    if (
      action.type === 'again' &&
      action.id === this.host &&
      this.phase === 'over'
    ) {
      this.restartMatch();
      return;
    }

    if (seat < 0 || this.phase !== 'play') {
      return;
    }

    if (action.type === 'play') {
      this.play(seat, action.c);
      return;
    }

    if (action.type === 'truco' && this.canAsk(seat)) {
      this.pend = { team: seat % 2, to: CardRules.nextBetValue(this.value) };
      this.msg =
        this.playerName(seat) + ' pediu ' + BET_LABELS[this.pend.to] + '!';
      return;
    }

    if (!this.pend || seat % 2 === this.pend.team) {
      return;
    }

    if (action.type === 'accept') {
      this.value = this.pend.to;
      this.lastRaise = this.pend.team;
      this.pend = null;
      this.msg = this.playerName(seat) + ' aceitou! Mão vale ' + this.value;
      return;
    }

    if (action.type === 'run') {
      this.endHand(this.pend.team, this.value, this.playerName(seat) + ' correu. ');
      return;
    }

    if (action.type === 'raise' && this.pend.to < 12) {
      this.value = this.pend.to;
      this.lastRaise = this.pend.team;
      this.pend = { team: seat % 2, to: CardRules.nextBetValue(this.value) };
      this.msg =
        this.playerName(seat) + ' pediu ' + BET_LABELS[this.pend.to] + '!';
    }
  }

  viewFor(playerId) {
    const state = {
      ...this,
      botTimer: null,
      lastActivity: undefined,
    };
    const clone = JSON.parse(JSON.stringify(state));
    if (clone.hands) {
      for (const seat in clone.hands) {
        if (this.players[seat] && this.players[seat].id !== playerId) {
          clone.hands[seat] = clone.hands[seat].map(() => 'X');
        }
      }
    }
    return clone;
  }
}

module.exports = { Room };