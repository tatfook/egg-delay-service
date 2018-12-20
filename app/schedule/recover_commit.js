'use strict';

const Subscription = require('egg').Subscription;

let Runing = false;

class RecoverCommit extends Subscription {
  initLocalLocks() {
    this.local_locked_projects = new Map();
    this.success_projects = new Map();
  }

  localLock(project_id) {
    this.success_projects.delete(project_id);
    this.local_locked_projects.set(project_id, true);
  }

  remoteLock(project_ids) {
    return this.ctx.model.Commit.lock(project_ids);
  }

  remoteUnlock(project_ids) {
    return this.ctx.model.Commit.unLock(project_ids);
  }

  isLocked(project_id) {
    return this.local_locked_projects.has(project_id);
  }

  success(project_id) {
    this.success_projects.set(project_id, true);
  }

  syncRemoteLocks() {
    const ids_to_remote_lock = this.local_locked_projects.keys();
    const ids_to_remote_unlock = this.success_projects.keys();
    return Promise.all([
      this.remoteLock(ids_to_remote_lock),
      this.remoteUnlock(ids_to_remote_unlock),
    ]);
  }

  async recoverOne(commit) {
    const { ctx, service } = this;
    const project_id = commit.id;
    if (this.isLocked(project_id)) return;
    try {
      await service.gitlab.submit(project_id, commit);
    } catch (err) {
      this.localLock(project_id);
      ctx.logger.error(err);
      return;
    }
    await commit.remove();
    this.success(project_id);
  }

  async recoverAll() {
    const model = this.ctx.model;
    const cursor = model.Commit.find({}).cursor();
    for (
      let commit = await cursor.next();
      commit !== null;
      commit = await cursor.next()
    ) {
      await this.recoverOne(commit);
    }
    await this.syncRemoteLocks();
  }

  async runIfLastTaskNotRuning() {
    if (Runing) return;
    const { logger } = this.ctx;
    logger.info('Start to recover failed commits');
    Runing = true;
    this.initLocalLocks();
    await this.recoverAll().catch(err => {
      logger.error(err);
    });
    logger.info('Finshed recovering failed commits');
    Runing = false;
  }

  async subscribe() {
    await this.runIfLastTaskNotRuning();
  }
}

module.exports = app => {
  RecoverCommit.schedule = app.config.schedule;
  return RecoverCommit;
};
