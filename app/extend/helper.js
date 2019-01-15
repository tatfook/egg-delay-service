'use strict';

module.exports = {
  sleep(time) {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  },

  // decorator
  attempt(worker, number = 3, delay = 3000, debug = false) {
    return async (...params) => {
      for (let i = number; i > 0; i--) {
        try {
          const result = await worker(...params);
          return result;
        } catch (err) {
          if (i <= 1) throw err;
          await this.sleep(delay);
          if (debug) console.log('retry');
        }
      }
    };
  },

  endsWithAny(str, list) {
    for (const item of list) {
      if (str.endsWith(item)) return true;
    }
    return false;
  },
};
