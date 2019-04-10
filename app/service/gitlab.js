'use strict';

const BaseParaService = require('./base_para_service');
const assert = require('assert');
const Axios = require('axios');
const _ = require('lodash/object');

const default_branch = 'master';

const serialize_commit = commit => {
  assert(commit.actions, 'action required');
  let {
    branch, commit_message, actions,
    author_name, source_version,
  } = commit;

  if (source_version) {
    commit_message += `|FROM${source_version}`;
  }

  return {
    branch: branch || default_branch,
    commit_message, actions, author_name,
  };
};

const propertiesToPick = [
  'short_id', 'author_name', 'authored_date',
  'created_at', 'message',
];
const serializeCommitRecord = commit => _.pick(commit, propertiesToPick);

module.exports = app => {
  let attemptToSubmit;
  const config = app.config.gitlab;
  const Client = Axios.create({
    baseURL: `${config.url}`,
    headers: { 'private-token': config.token },
    timeout: 30 * 1000,
  });

  class GitlabService extends BaseParaService {
    get service_name() {
      return 'gitlab';
    }

    get client() {
      return Client;
    }

    get attemptToSubmit() {
      if (!attemptToSubmit) {
        attemptToSubmit = this.ctx.helper
          .attempt(this.submit.bind(this), 3, 3000, true);
      }
      return attemptToSubmit;
    }

    async submit(project_id, commit) {
      const serialized_commit = serialize_commit(commit);
      const res = await this.client
        .post(`/projects/${project_id}/repository/commits`, serialized_commit)
        .catch(err => {
          const ignorable = this.ignorable_error(err);
          if (!ignorable) throw err;
          this.ctx.logger.info('ignorable error');
        });
      return serializeCommitRecord(res.data);
    }

    async handleMessage(message) {
      const { ctx } = this;
      try {
        const commit = await ctx.model.Commit
          .findOne({ _id: message.value });
        if (!commit || await commit.isLocked) return;
        const { project_id } = commit;
        const record = await this.attemptToSubmit(project_id, commit)
          .catch(async err => { await this.handleError(err, commit); });
        await commit.pushRecord(record);
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

  return GitlabService;
};
