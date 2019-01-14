'use strict';

const BaseParaService = require('./base_para_service');
const Axios = require('axios');

let client;

class ElasticsearchService extends BaseParaService {
  get service_name() {
    return 'elasticsearch';
  }

  get client() {
    if (!client) {
      if (!client) {
        const config = this.config.elasticsearch;
        client = Axios.create({
          baseURL: `${config.url}`,
          headers: { Authorization: config.token },
          timeout: 30 * 1000,
        });
      }
      return client;
    }
  }

  async handleMessage(message) {
    try {
      await this.ctx.helper.sleep(100);
      console.log(message);
    } catch (err) {
      const { logger } = this.ctx;
      logger.error(err);
    }
  }

  async bulk(body, index, type) {
    return this.client
      .post('/bulk', { body, index, type })
      .catch(err => {
        this.ctx.logger.error(err);
        throw err;
      });
  }
}

module.exports = ElasticsearchService;
