'use strict';

const assert = require('assert');

const inner = Symbol('_inner');
const limit = Symbol('_limit');
const first_pos = Symbol('_first');
const last_pos = Symbol('_last');

const isNumber = num => Object(num) instanceof Number;

class Queue {
  constructor(max_length) {
    assert(isNumber(max_length), 'Max length must be a number');
    this[inner] = [];
    this[limit] = max_length;
    this.reset();
  }

  reset() {
    this[inner] = [];
    this[first_pos] = 0;
    this[last_pos] = 0;
  }

  getNextPos(current_pos) {
    return (current_pos + 1) % this[limit];
  }

  shift() {
    const current_pos = this[first_pos];
    const first_value = this[inner][current_pos];
    if (first_value === undefined) return;
    this[inner][current_pos] = undefined;
    const next = this.getNextPos(current_pos);
    this[first_pos] = next;
    return first_value;
  }

  static validate(...values) {
    for (const value of values) {
      assert(value !== undefined, 'Cannot push undefined');
    }
  }

  pushOne(value) {
    this[inner][this[last_pos]] = value;
    const next = this.getNextPos(this[last_pos]);
    this[last_pos] = next;
  }

  push(...values) {
    if (values.length > this.available) return false;
    Queue.validate(...values);
    for (const value of values) {
      this.pushOne(value);
    }
    return true;
  }

  get available() {
    return this[limit] - this.length;
  }

  get full() {
    const last_value = this[inner][this[last_pos]];
    if (last_value !== undefined) return true;
    return false;
  }

  get length() {
    if (this.full) return this[limit];
    return (this[limit] + this[last_pos] - this[first_pos]) % this[limit];
  }
}

module.exports = Queue;
