'use strict';

const Subscription = require('egg').Subscription;
let paused = false;

class MessageConsumer extends Subscription {
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

  async pauseIfBusy(isFree) {
    if (!isFree && !paused) {
      this.pause();
      await this.service.gitlab.continue();
      this.resume();
    }
  }

  async subscribe(message) {
    this.formatMsg(message);
    console.log('new_message');
    const isFree = this.service.gitlab.paraCommit(message);
    await this.pauseIfBusy(isFree);
  }
}

module.exports = MessageConsumer;
