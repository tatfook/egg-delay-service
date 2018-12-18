'use strict';

module.exports = {
  sleep(time) {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  },
};
