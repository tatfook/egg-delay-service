'use strict';

const BaseParaService = require('./base_para_service');
const assert = require('assert');

const serialize_commit = commit => {
  assert(commit.actions, 'action required');
  return {
    repo: commit.repo,
    branch: commit.branch || 'master',
    commit_message: commit.commit_message,
    actions: commit.actions,
    author_name: commit.author_name,
  };
};

let attemptToSubmit;

class GitlabService extends BaseParaService {
  get service_name() {
    return 'gitlab';
  }

  get attemptToSubmit() {
    if (!attemptToSubmit) {
      attemptToSubmit = this.ctx.helper
        .attempt(this.submit.bind(this), 3, 3000, true);
    }
    return attemptToSubmit;
  }

  submit(commit) {
    const { service } = this;
    const serialized_commit = serialize_commit(commit);
    return service.gitaly.userCommitFiles(serialized_commit);
  }

  async handleMessage(message) {
    try {
      const commit = await this.ctx.model.Commit
        .findOne({ _id: message.value });
      if (!commit || await commit.isLocked) return;
      await this.attemptToSubmit(commit)
        .catch(async err => { await this.handleError(err, commit); });
      await commit.remove();
    } catch (err) {
      const { logger } = this.ctx;
      logger.error(err);
    }
  }

  ignorable_error(err) {
    err.response = err.response || {};
    err.response.data = err.response.data || {};
    const err_message = err.response.data.message;
    const ignorable = this.config.ignorable_error_messages;
    return err_message && ignorable.includes(err_message);
  }

  async handleError(err, commit) {
    const { logger } = this.ctx;
    logger.error(err);
    commit && await commit.lock();
    throw err;
  }
}

module.exports = GitlabService;
