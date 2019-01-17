'use strict';

const Service = require('egg').Service;
const QueuePool = require('../lib/queue_pool');

const queue_pools = {};

class BaseParaService extends Service {
  // Override this method.The config name
  // must be the same with you service_name
  get service_name() {
    return 'service';
  }

  get highWaterLevel() {
    return this.pool.highWaterLevel();
  }

  continue() {
    return this.pool.continue();
  }

  get pool() {
    const { service_name } = this;
    if (!queue_pools[service_name]) {
      const options = this.config[service_name].queue_pool;
      queue_pools[service_name] = new QueuePool(
        this.handleMessage.bind(this),
        options
      );
    }
    return queue_pools[service_name];
  }

  // Override this method.It's the handler
  // with every message.
  async handleMessage(message) {
    try {
      await this.ctx.helper.sleep(100);
      console.log(message);
    } catch (err) {
      const { logger } = this.ctx;
      logger.error(err);
    }
  }

  paraHandle(message) {
    return this.pool.push(message.key, message);
  }
}

module.exports = BaseParaService;
