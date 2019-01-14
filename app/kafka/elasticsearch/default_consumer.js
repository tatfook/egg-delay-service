'use strict';

const BaseMessageConsumer = require('../base_consumer');

class ESMessageConsumer extends BaseMessageConsumer {
  get service_name() {
    return 'elasticsearch';
  }

  formatMsg(message) {
    console.log('incoming');
    super.formatMsg(message);
  }
}

module.exports = ESMessageConsumer;
