'use strict';

const Service = require('egg').Service;

const validActions = new Map();
validActions.set('CREATE', true);
validActions.set('UPDATE', true);
validActions.set('DELETE', true);
validActions.set('MOVE', true);
validActions.set('CREATE_DIR', true);
validActions.set('CHMOD', true);

class GitalyService extends Service {
  get client() {
    return this.ctx.grpc.gitaly;
  }

  get auth_meta() {
    return { authorization: this.config.gitaly.authorization };
  }

  validateActions(actions) {
    actions.forEach(action => {
      action.action = action.action.toUpperCase();
      if (!validActions.has(action.action)) throw new Error('invalid action');
      if (action.action === 'MOVE' && !action.previous_path) throw new Error('invalid action');
    });
  }

  get storage_name() {
    return this.config.gitaly.storage_name;
  }

  get commit_stream() {
    let stream;
    const promise = new Promise((resolve, reject) => {
      stream = this.client.operationService
        .userCommitFiles(this.auth_meta, {}, (err, data) => {
          err && reject(err);
          data && resolve(data);
        });
    });
    return [ stream, promise ];
  }

  getRepo(commit) {
    return {
      storage_name: this.storage_name,
      relative_path: `${commit.git_path}.git`,
    };
  }

  getUser(commit) {
    return {
      name: Buffer.from(commit.author_name),
      email: Buffer.from(`${commit.author_name}@paracraft.cn`),
    };
  }

  getCommitHeader(commit) {
    return {
      repository: this.getRepo(commit),
      user: this.getUser(commit),
      branch_name: Buffer.from(commit.branch || 'master'),
      commit_message: Buffer.from(commit.commit_message),
      commit_author_name: Buffer.from(commit.author_name),
      commit_author_email: Buffer.from(`${commit.author_name}@paracraft.cn`),
    };
  }

  getCommitActionHeader(action) {
    const header = {
      action: action.action,
      file_path: Buffer.from(action.file_path),
      base64_content: action.base64 || false,
      execute_filemode: action.execute_filemode,
      infer_content: action.infer_content,
    };
    if (action.action === 'MOVE') header.previous_path = Buffer.from(action.previous_path);
    return header;
  }

  async userCommitFiles(commit) {
    const { actions } = commit;
    const [ stream, promise ] = this.commit_stream;
    stream.write({ header: this.getCommitHeader(commit) });
    this.validateActions(actions);
    for (const action of actions) {
      stream.write({ action: { header: this.getCommitActionHeader(action) } });
      if (action.content === undefined) continue;
      stream.write({ action: { content: Buffer.from(action.content) } });
    }
    stream.end();
    const res = await promise;
    this.handleResponse(res);
    return res.branch_update;
  }

  handleResponse(res = {}) {
    if (res.index_error || res.pre_receive_error || res.Error) {
      throw res;
    }
  }
}

module.exports = GitalyService;
