'use strict';

const Service = require('egg').Service;
const SimpleQueuePool = require('../lib/queue_pool');

let pool;

class GitlabService extends Service {
  get pool() {
    if (!pool) {
      const options = this.config.gitlab.queue_pool;
      pool = new SimpleQueuePool(this.commit.bind(this), options);
    }
    return pool;
  }

  get highWaterLevel() {
    return this.pool.highWaterLevel();
  }

  continue() {
    return this.pool.continue();
  }

  async commit(message) {
    await this.ctx.helper.sleep(1000);
    console.log(message.offset);
  }

  paraCommit(msg) {
    // console.log(msg);
    return this.pool.push(msg.key, msg);
  }
}

module.exports = GitlabService;
