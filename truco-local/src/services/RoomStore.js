'use strict';

const crypto = require('crypto');
const { Room } = require('../models/Room');

const ROOM_TTL_MS = 30 * 60 * 1000;

class RoomStore {
  constructor() {
    this.rooms = {};
    const cleanupTimer = setInterval(() => this.cleanupExpiredRooms(), 5 * 60 * 1000);
    if (cleanupTimer.unref) cleanupTimer.unref();
  }

  create(hostId, hostName) {
    let code;
    do {
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
      code = code.slice(0, 5);
    } while (this.rooms[code] || code.length < 5);
    const room = new Room(code, hostId, hostName);
    this.rooms[code] = room;
    return room;
  }

  get(code) {
    const room = this.rooms[code];
    if (room) room.lastActivity = Date.now();
    return room;
  }

  has(code) {
    return Object.prototype.hasOwnProperty.call(this.rooms, code);
  }

  touch(code) {
    const room = this.rooms[code];
    if (room) room.lastActivity = Date.now();
  }

  cleanupExpiredRooms() {
    const now = Date.now();
    for (const code of Object.keys(this.rooms)) {
      if (now - this.rooms[code].lastActivity > ROOM_TTL_MS) {
        if (this.rooms[code].botTimer) clearTimeout(this.rooms[code].botTimer);
        delete this.rooms[code];
      }
    }
  }
}

module.exports = { RoomStore };