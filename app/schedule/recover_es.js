'use strict';

const Subscription = require('egg').Subscription;

let Runing = false;

class RecoverES extends Subscription {
  async getLessonsPackages(page, per_page) {
    const { service } = this;
    const res = await service.lesson.getLessonsPackages(page, per_page);
    const pkgs = res.rows || [];
    return pkgs;
  }

  async recoverOne(pkg) {
    const { service, ctx } = this;
    try {
      const formatted_pkg = await service.lesson.getLessonsPackage(pkg);
      await service.elasticsearch.upsertPackage(formatted_pkg);
    } catch (err) {
      ctx.logger.error(err);
    }
  }

  async recoverAll() {
    let [ page, per_page ] = [ 1, 20 ];
    let pkgs = await this.getLessonsPackages(page, per_page);
    while (pkgs.length > 0) {
      const tasks = [];
      for (const pkg of pkgs) {
        if (pkg.auditAt) tasks.push(this.recoverOne(pkg));
      }
      await Promise.all(tasks);
      page++;
      pkgs = await this.getLessonsPackages(page, per_page);
    }
  }

  async runIfLastTaskNotRuning() {
    if (Runing) return;
    const { logger } = this.ctx;
    logger.info('Start to recover elasticsearch data');
    Runing = true;
    await this.recoverAll().catch(err => {
      logger.error(err);
    });
    logger.info('Finshed recovering elasticsearch data');
    Runing = false;
  }

  async subscribe() {
    await this.runIfLastTaskNotRuning();
  }
}

module.exports = app => {
  RecoverES.schedule = app.config.schedule.recover_es;
  return RecoverES;
};
