'use strict';

const assert = require('assert');
const emitter = require('events');
const awaitEvent = require('await-event');

const _working_pool = Symbol('working_pool');
const _free_pool = Symbol('free_pool');
const _worker = Symbol('worker');
const _cache = Symbol('_cache');
const _emitter = Symbol('_emitter');

class SimpleQueuePool {
  constructor(worker, concurrency = 1) {
    this[_working_pool] = {};
    this[_free_pool] = [];
    this[_cache] = [];
    this[_worker] = this.wrap(worker);
    this[_emitter] = new emitter();
    this[_emitter].await = awaitEvent;
    for (let i = 0; i < concurrency; i++) {
      const queue = [];
      this[_free_pool].push(queue);
    }
  }

  wrap(worker) {
    return async key => {
      const queue = this[_working_pool][key];
      for (let params = queue.shift(); params; params = queue.shift()) {
        await worker(params);
      }
      this[_free_pool].push(queue);
      this[_working_pool][key] = undefined;
      this.consumeCache();
    };
  }

  consumeCache() {
    const cache = this[_cache];
    const cache_length = cache.length / 2;
    for (let i = 0; i < cache_length; i++) {
      const key = cache.shift();
      const params = cache.shift();
      this.push(key, params);
    }
    this.free && this[_emitter].emit('continue');
  }

  push(key, params) {
    assert(key, 'key required');
    assert(params, 'params required');
    if (this[_working_pool][key]) {
      this[_working_pool][key].push(params);
      console.log(1);
    } else if (this.free) {
      const free_queue = this[_free_pool].shift();
      free_queue.push(params);
      this[_working_pool][key] = free_queue;
      this[_worker](key);
      console.log(2);
    } else {
      this[_cache].push(key, params);
      // console.log(3);
      return false;
    }
    return true;
  }

  get free() {
    return this[_free_pool].length > 0;
  }

  continue() {
    return this[_emitter].await('continue');
  }
}

module.exports = SimpleQueuePool;
