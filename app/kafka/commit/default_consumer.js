'use strict';

const BaseMessageConsumer = require('../base_consumer');

class CommitMessageConsumer extends BaseMessageConsumer {
  get service_name() {
    return 'gitlab';
  }
}

module.exports = CommitMessageConsumer;
