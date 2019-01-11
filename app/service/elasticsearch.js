'use strict';

const Service = require('egg').Service;
const Axios = require('axios');
const SimpleQueuePool = require('../lib/queue_pool');

let client;
let pool;

class ElasticsearchService extends Service {
  get client() {
    if (!client) {
      if (!client) {
        const config = this.config.elasticsearch;
        client = Axios.create({
          baseURL: `${config.url}/v0`,
          headers: { Authorization: config.token },
          timeout: 30 * 1000,
        });
      }
      return client;
    }
  }

  get highWaterLevel() {
    return this.pool.highWaterLevel();
  }

  continue() {
    return this.pool.continue();
  }

  get pool() {
    if (!pool) {
      const options = this.config.elasticsearch.queue_pool;
      pool = new SimpleQueuePool(this.handleMessage.bind(this), options);
    }
    return pool;
  }

  async handleMessage(message) {
    try {
      console.log(message.value.actions);
    } catch (err) {
      const { logger } = this.ctx;
      logger.error(err);
    }
  }

  paraSubmit(msg) {
    return this.pool.push(msg.key, msg);
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
