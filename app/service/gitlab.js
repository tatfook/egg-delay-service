'use strict';

const Service = require('egg').Service;
const assert = require('assert');
const Axios = require('axios');
const SimpleQueuePool = require('../lib/queue_pool');

let pool;
let client;
let attemptToSubmit;

const serialize_commit = commit => {
  assert(commit.actions, 'action required');
  return {
    branch: commit.branch || 'master',
    commit_message: commit.commit_message,
    actions: commit.actions,
    author_name: commit.author_name,
  };
};

class GitlabService extends Service {
  get client() {
    if (!client) {
      const config = this.config.gitlab;
      client = Axios.create({
        baseURL: `${config.url}/api/v4`,
        headers: { 'private-token': config.token },
        timeout: 30 * 1000,
      });
    }
    return client;
  }

  get pool() {
    if (!pool) {
      const options = this.config.gitlab.queue_pool;
      pool = new SimpleQueuePool(this.handleMessage.bind(this), options);
    }
    return pool;
  }

  get attemptToSubmit() {
    if (!attemptToSubmit) {
      attemptToSubmit = this.ctx.helper.attempt(this.submit.bind(this), 3, 3000, true);
    }
    return attemptToSubmit;
  }

  get highWaterLevel() {
    return this.pool.highWaterLevel();
  }

  continue() {
    return this.pool.continue();
  }

  submit(project_id, commit) {
    const serialized_commit = serialize_commit(commit);
    return this.client
      .post(`/projects/${project_id}/repository/commits`, serialized_commit);
  }

  paraSubmit(msg) {
    return this.pool.push(msg.key, msg);
  }

  async handleError(err, commit) {
    await commit.lock();
    throw err;
  }

  async handleMessage(message) {
    try {
      const commit = await this.ctx.model.Commit
        .findOne({ _id: message.value });
      if (!commit || await commit.isLocked) return;
      const project_id = commit.id;
      await this.attemptToSubmit(project_id, commit)
        .catch(async err => { await this.handleError(err, commit); });
      await commit.remove();
    } catch (err) {
      const { logger } = this.ctx;
      logger.error(err);
    }
  }
}

module.exports = GitlabService;
