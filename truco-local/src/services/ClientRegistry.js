'use strict';

class ClientRegistry {
  constructor() {
    this.clientsByCode = {};
  }

  add(code, client) {
    if (!this.clientsByCode[code]) {
      this.clientsByCode[code] = new Set();
    }
    this.clientsByCode[code].add(client);
  }

  remove(code, client) {
    const clients = this.clientsByCode[code];
    if (!clients) return;
    clients.delete(client);
    if (clients.size === 0) {
      delete this.clientsByCode[code];
    }
  }

  list(code) {
    return this.clientsByCode[code] || new Set();
  }
}

module.exports = { ClientRegistry };