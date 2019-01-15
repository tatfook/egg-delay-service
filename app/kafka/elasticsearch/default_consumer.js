'use strict';

const BaseMessageConsumer = require('../base_consumer');

class ESMessageConsumer extends BaseMessageConsumer {
  get service_name() {
    return 'elasticsearch';
  }

  formatMsg(message) {
    console.log('incoming');
    message.value = JSON.parse(message.value.toString());
    console.log(message);
  }
}

module.exports = ESMessageConsumer;
