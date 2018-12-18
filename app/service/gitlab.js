'use strict';

const Service = require('egg').Service;
const SimpleQueuePool = require('../lib/queue_pool');

let pool;

class GitlabService extends Service {
  get pool() {
    if (!pool) pool = new SimpleQueuePool(this.commit.bind(this), 1);
    return pool;
  }

  get free() {
    return this.pool.free;
  }

  continue() {
    return this.pool.continue();
  }

  async commit(msg) {
    console.log('here');
    await this.ctx.helper.sleep(1000);
    console.log(msg);
  }

  paraCommit(msg) {
    return this.pool.push(msg.key, msg);
  }
}

module.exports = GitlabService;
