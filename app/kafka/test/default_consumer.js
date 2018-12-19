'use strict';

const Subscription = require('egg').Subscription;
let paused = false;

class MessageConsumer extends Subscription {
  formatMsg(message) {
    message.value = message.value.toString();
  }

  pause() {
    this.ctx.consumer.pause();
    paused = true;
  }

  resume() {
    this.ctx.consumer.resume();
    paused = false;
  }

  async pauseIfBusy(highWaterLevel) {
    if (highWaterLevel && !paused) {
      this.pause();
      await this.service.gitlab.continue();
      this.resume();
    }
  }

  async subscribe(message) {
    this.formatMsg(message);
    const highWaterLevel = this.service.gitlab.paraSubmit(message);
    await this.pauseIfBusy(highWaterLevel);
  }
}

module.exports = MessageConsumer;
