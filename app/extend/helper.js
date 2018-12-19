'use strict';

module.exports = {
  sleep(time) {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  },
  // decorator
  attempt(worker, number = 3, delay = 3000) {
    return async (...params) => {
      for (let i = number; i > 0; i--) {
        try {
          const result = await worker(...params);
          return result;
        } catch (err) {
          await this.sleep(delay);
          if (i <= 1) throw err;
        }
      }
    };
  },
};
