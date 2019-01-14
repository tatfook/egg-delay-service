'use strict';

const Service = require('egg').Service;
const Axios = require('axios');

let client;

class KeepworkService extends Service {
  get client() {
    if (!client) {
      if (!client) {
        const config = this.config.keepwork;
        client = Axios.create({
          baseURL: `${config.url}/`,
          timeout: 30 * 1000,
        });
      }
      return client;
    }
  }

  parseMarkdown(content) {
    return this.client.post('/es/parser', { content });
  }
}

module.exports = KeepworkService;
