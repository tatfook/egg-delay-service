'use strict';

const Subscription = require('egg').Subscription;

const paused_status_pool = {};

class BaseMessageConsumer extends Subscription {
  // Override this method.The property service_name is
  // the name when you call the service with
  // this.ctx.service[service_name].If your consumer
  // extends this base consumer, paraHandle method
  // and continue method must be implemented in you
  // service class.
  get service_name() {
    return 'service';
  }

  get class_name() {
    return this.constructor.name;
  }

  get paused() {
    const { class_name } = this;
    return paused_status_pool[class_name];
  }

  formatMsg(message) {
    message.value = message.value.toString();
  }

  pause() {
    const { ctx, class_name } = this;
    ctx.consumer.pause();
    paused_status_pool[class_name] = true;
    ctx.logger.info('paused');
  }

  resume() {
    const { ctx, class_name } = this;
    ctx.consumer.resume();
    paused_status_pool[class_name] = false;
    ctx.logger.info('resumed');
  }

  async pauseIfBusy(highWaterLevel) {
    if (highWaterLevel && !this.paused) {
      const { service, service_name } = this;
      this.pause();
      await service[service_name].continue();
      this.resume();
    }
  }

  async subscribe(message) {
    this.formatMsg(message);
    const { service, service_name } = this;
    const highWaterLevel = service[service_name]
      .paraHandle(message);
    await this.pauseIfBusy(highWaterLevel);
  }
}

module.exports = BaseMessageConsumer;
