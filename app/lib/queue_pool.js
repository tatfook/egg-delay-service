'use strict';

const assert = require('assert');
const emitter = require('events');
const awaitEvent = require('await-event');
const Queue = require('./queue');

const _working_pool = Symbol('working_pool');
const _free_pool = Symbol('free_pool');
const _worker = Symbol('worker');
const _cache = Symbol('_cache');
const _emitter = Symbol('_emitter');

class QueuePool {
  constructor(worker, options) {
    let { concurrency, queue_limit, cache_limit } = options;
    concurrency = concurrency || 10;
    cache_limit = cache_limit || 5;
    queue_limit = queue_limit || 5;
    this[_working_pool] = {};
    this[_free_pool] = new Queue(concurrency);
    this[_cache] = new Queue(cache_limit * 2);
    this[_worker] = this.wrap(worker);
    this[_emitter] = new emitter();
    this[_emitter].await = awaitEvent;
    for (let i = 0; i < concurrency; i++) {
      const queue = new Queue(queue_limit);
      this[_free_pool].push(queue);
    }
  }

  wrap(worker) {
    return async key => {
      const queue = this[_working_pool][key];
      for (let params = queue.shift(); params; params = queue.shift()) {
        await worker(params);
      }
      this.unbindKeyFromQueue(key, queue);
      this.consumeCache();
    };
  }

  consumeCache() {
    const cache = this[_cache];
    const total_keys = cache.length / 2;
    for (let i = 0; i < total_keys; i++) {
      const key = cache.shift();
      const params = cache.shift();
      this.push(key, params);
    }
    !this.highWaterLevel() && this[_emitter].emit('continue');
  }

  bindKeyToQueue(key, free_queue) {
    this[_working_pool][key] = free_queue;
  }

  unbindKeyFromQueue(key, queue) {
    this[_free_pool].push(queue);
    this[_working_pool][key] = undefined;
  }

  pushIntoWorkingQueue(key, params) {
    const pushed = this[_working_pool][key].push(params);
    !pushed && this.pushIntoCache(key, params);
  }

  pushIntoFreeQueue(key, params) {
    const free_queue = this[_free_pool].shift();
    free_queue.push(params);
    this.bindKeyToQueue(key, free_queue);
    this[_worker](key);
  }

  pushIntoCache(key, params) {
    this[_cache].push(key, params);
  }

  push(key, params) {
    assert(key, 'key required');
    assert(params, 'params required');
    if (this.keyBindingQueue(key)) {
      this.pushIntoWorkingQueue(key, params);
    } else if (this.hasFreeQueue()) {
      this.pushIntoFreeQueue(key, params);
    } else {
      this.pushIntoCache(key, params);
    }
    return this.highWaterLevel();
  }

  hasFreeQueue() {
    return this[_free_pool].length > 0;
  }

  keyBindingQueue(key) {
    return this[_working_pool][key];
  }

  highWaterLevel() {
    return this[_cache].full;
  }

  continue() {
    return this[_emitter].await('continue');
  }
}

module.exports = QueuePool;
