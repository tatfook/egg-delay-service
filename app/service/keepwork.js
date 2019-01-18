'use strict';

const Service = require('egg').Service;
const Axios = require('axios');

module.exports = app => {
  const config = app.config.keepwork;
  const Client = Axios.create({
    baseURL: `${config.url}/`,
    timeout: 30 * 1000,
  });

  class KeepworkService extends Service {
    get client() {
      return Client;
    }

    parseMarkdown(content) {
      return this.client.post('/es/parser', { content });
    }
  }

  return KeepworkService;
};
