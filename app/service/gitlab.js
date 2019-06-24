'use strict';

const BaseParaService = require('./base_para_service');
const assert = require('assert');
const Axios = require('axios');
const _ = require('lodash/object');

const default_branch = 'master';

const serialize_commit = commitDetailMsg => {
  assert(commitDetailMsg.actions, 'action required');
  let {
    branch, commit_message, actions,
    author_name, source_version,
  } = commitDetailMsg;

  if (source_version) {
    commit_message += `|FROM${source_version}`;
  }

  return {
    branch: branch || default_branch,
    commit_message, actions, author_name,
  };
};

const COMMIT_PROPERTIES_TO_PICK = [
  'id', 'short_id', 'author_name', 'authored_date',
  'created_at', 'message',
];
const serializeCommitRecord = commit => {
  const commit_id = commit.id;
  const serialized = _.pick(commit, COMMIT_PROPERTIES_TO_PICK);
  serialized.commit_id = commit_id;
  return serialized;
};

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

    async submit(project_id, commitDetail) {
      const { service } = this;
      const serialized_commit = serialize_commit(commitDetail);
      try {
        const res = await this.client
          .post(`/projects/${project_id}/repository/commits`, serialized_commit);
        const record = serializeCommitRecord(res.data);
        await service.node.commitMany(commitDetail, record);
      } catch (err) {
        const ignorable = this.ignorable_error(err);
        if (!ignorable) throw err;
        this.ctx.logger.info('ignorable error');
      }
    }

    async handleMessage(message) {
      const { ctx } = this;
      try {
        const commitDetailMsg = await ctx.model.Message
          .findOne({ _id: message.value });
        if (!commitDetailMsg || await commitDetailMsg.isLocked) return;
        const { project_id } = commitDetailMsg;
        await this.attemptToSubmit(project_id, commitDetailMsg)
          .catch(async err => { await this.handleError(err, commitDetailMsg); });
        await commitDetailMsg.remove();
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

    async handleError(err, commitDetailMsg) {
      const { logger } = this.ctx;
      logger.error(err);
      commitDetailMsg && await commitDetailMsg.lock();
      throw err;
    }
  }

  return GitlabService;
};
