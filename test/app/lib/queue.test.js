'use strict';

const { assert } = require('egg-mock/bootstrap');
const Queue = require('../../../app/lib/queue');

describe('app/lib/queue', () => {
  describe('initialize', () => {
    describe('max length should be a number', () => {
      it('should initialize successfully', () => {
        assert(new Queue(10));
      });
      it('should fail to initialize', () => {
        assert.throws(() => {
          new Queue('string');
        });
      });
    });
  });
  describe('getNextPos method', () => {
    it('should get current next', () => {
      const max = 5;
      const q = new Queue(max);
      const next1 = q.getNextPos(3);
      assert(next1 === 4);

      const next2 = q.getNextPos(4);
      assert(next2 === 0);
    });
  });
  describe('push method and full property', () => {
    const max = 5;
    const q = new Queue(max);

    it('should not be full', () => {
      assert(!q.full);
    });

    it('should fail to push undefined', () => {
      assert.throws(() => {
        q.push(undefined);
      });
    });

    it('should return true', () => {
      for (let i = 0; i < max; i++) assert(q.push(i));
    });

    it('should be full', () => {
      assert(q.full);
    });

    it('should return false when the queue is full', () => {
      assert(!q.push(max + 1));
    });
    it('should not be full', () => {
      q.reset();
      for (let i = 0; i < max; i++) {
        q.push(i);
        if (i === (max - 1)) {
          assert(q.full);
        } else {
          assert(!q.full);
        }
      }
    });
  });

  describe('shift method', () => {
    it('should return correct value', () => {
      const max = 5;
      const q = new Queue(max);
      for (let i = 0; i < max; i++) q.push(i);
      for (let i = 0; i < max; i++) {
        assert(q.shift() === i);
      }

      q.push(1);
      q.push(2);
      q.shift();
      q.push(3);
      assert(q.shift() === 2);
    });
  });

  describe('length property', () => {
    const max = 10;
    const q = new Queue(max);
    it('return 0 when the queue is empty', () => {
      assert(q.length === 0);
    });
    it('return correct length after values pushed', () => {
      for (let i = 0; i < max; i++) {
        q.push(i);
        assert(q.length === (i + 1));
      }
    });
    it('return correct length after values shifted', () => {
      for (let i = 0; i < max; i++) {
        q.shift();
        assert(q.length === (10 - (i + 1)));
      }
    });
  });

  describe('available property', () => {
    it('should return correct available space', () => {
      const max = 10;
      const q = new Queue(max);
      assert(q.available === 10);

      for (let i = 0; i < max; i++) {
        q.push(i);
        assert(q.available === (max - q.length));
      }

      assert(q.full);
      assert(q.available === 0);

      for (let i = 0; i < max; i++) {
        q.shift();
        assert(q.available === (max - q.length));
      }
    });
  });
});
