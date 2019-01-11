'use strict';

const Subscription = require('egg').Subscription;
let paused = false;

class ESMessageConsumer extends Subscription {
  formatMsg(message) {
    message.value = JSON.parse(message.value);
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
      await this.service.elasticsearch.continue();
      this.resume();
    }
  }

  async subscribe(message) {
    this.formatMsg(message);
    // console.log(message);
    const highWaterLevel = this.service.elasticsearch.paraSubmit(message);
    await this.pauseIfBusy(highWaterLevel);
  }
}

module.exports = ESMessageConsumer;
