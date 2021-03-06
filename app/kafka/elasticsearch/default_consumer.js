'use strict';

const BaseMessageConsumer = require('../base_consumer');

class ESMessageConsumer extends BaseMessageConsumer {
  get service_name() {
    return 'elasticsearch';
  }

  formatMsg(message) {
    message.value = JSON.parse(message.value.toString());
  }
}

module.exports = ESMessageConsumer;
