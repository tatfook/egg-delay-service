'use strict';

const Subscription = require('egg').Subscription;

let Runing = false;

class RecoverCommit extends Subscription {
  // 先本地存储锁定信息，待完成所有操作后再与远程锁同步
  // 以减少io操作
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

  // 错误重试一定次数后放弃操作
  async giveUpAfterFailedForTimes(commit) {
    const failed = await commit.isLocked;
    const { max_fail } = this.config.gitlab;
    if (Number(failed) >= max_fail) {
      await commit.resetLock();
      await commit.remove();
    }
  }

  async syncRemoteLock() {
    const ids_to_remote_lock = this.local_locked_projects.keys();
    return this.remoteLock(ids_to_remote_lock);
  }

  async syncRemoteUnlock() {
    const { model } = this.ctx;
    const ids_to_remote_unlock = this.success_projects.keys();
    for (const project_id of ids_to_remote_unlock) {
      const commits = await model.Commit.find({ project_id });
      if (commits.length > 0) {
        this.local_locked_projects.set(project_id, true);
        continue;
      }
      await this.remoteUnlock(project_id);
    }
  }

  async syncRemoteLockStatus() {
    try {
      await this.syncRemoteUnlock();
      await this.syncRemoteLock();
    } catch (err) {
      this.ctx.logger.error(err);
    }
  }

  // 重试单个失败的gitlab操作
  // 失败则锁定仓库，防止commit提交顺序发生错误
  async recoverOne(commit) {
    const { ctx, service } = this;
    const { project_id } = commit;
    if (this.isLocked(project_id)) return;
    try {
      const record = await service.gitlab
        .submit(project_id, commit);
      await commit.pushRecord(record);
    } catch (err) {
      ctx.logger.error(err);
      await this.giveUpAfterFailedForTimes(commit);
      this.localLock(project_id);
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
    await this.syncRemoteLockStatus();
  }

  // 防止单次任务未执行完毕就触发下一次任务
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
  RecoverCommit.schedule = app.config.schedule.recover_commit;
  return RecoverCommit;
};
