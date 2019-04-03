'use strict';

const BaseParaService = require('./base_para_service');
const assert = require('assert');
const Axios = require('axios');

const default_branch = 'master';

const serialize_commit = commit => {
  assert(commit.actions, 'action required');
  return {
    branch: commit.branch || default_branch,
    commit_message: commit.commit_message,
    actions: commit.actions,
    author_name: commit.author_name,
  };
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

    async submit(project_id, commit) {
      const serialized_commit = serialize_commit(commit);
      const res = await this.client
        .post(`/projects/${project_id}/repository/commits`, serialized_commit)
        .catch(err => {
          const ignorable = this.ignorable_error(err);
          if (!ignorable) throw err;
          this.ctx.logger.info('ignorable error');
        });
      return res.data;
    }

    async load_commits(project_id) {
      const res = await this.client
        .get(`/projects/${project_id}/repository/commits?all=true`);
      const commits = res.data;
      return commits;
    }

    async handleMessage(message) {
      const { ctx } = this;
      try {
        const commit = await ctx.model.Commit
          .findOne({ _id: message.value });
        if (!commit || await commit.isLocked) return;
        const { project_id } = commit;
        const commit_info = await this.attemptToSubmit(project_id, commit)
          .catch(async err => { await this.handleError(err, commit); });
        const project = await ctx.model.Project.findById(project_id);
        if (project.commits.length === 0) {
          project.commits = await this.load_commits(project_id);
        }
        project.commits.push(commit_info);
        await project.save();
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
