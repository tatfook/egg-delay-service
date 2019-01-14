'use strict';

const Subscription = require('egg').Subscription;

const paused_status_pool = {};

class BaseMessageConsumer extends Subscription {
  get service_name() {
    return 'service';
  }

  get class_name() {
    return this.constructor.name;
  }

  get paused() {
    return paused_status_pool[this.class_name];
  }

  formatMsg(message) {
    message.value = message.value.toString();
  }

  pause() {
    this.ctx.consumer.pause();
    paused_status_pool[this.class_name] = true;
  }

  resume() {
    this.ctx.consumer.resume();
    paused_status_pool[this.class_name] = false;
  }

  async pauseIfBusy(highWaterLevel) {
    if (highWaterLevel && !this.paused) {
      this.pause();
      await this.service[this.service_name].continue();
      this.resume();
    }
  }

  async subscribe(message) {
    this.formatMsg(message);
    const highWaterLevel = this.service[this.service_name]
      .paraHandle(message);
    await this.pauseIfBusy(highWaterLevel);
  }
}

module.exports = BaseMessageConsumer;
