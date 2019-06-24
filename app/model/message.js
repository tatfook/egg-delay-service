'use strict';

// const _ = require('lodash/object');
// const fast_JSON = require('fast-json-stringify');

const id2Key = id => `projects:${id}:locks`;

module.exports = app => {
  const { mongoose, redis } = app;
  const Schema = mongoose.Schema;

  const ActionSchema = new Schema({
    action: String,
    file_path: String,
    previous_path: String,
    content: String,
    encoding: { type: String, default: 'text' },
    version: Number,
  });

  const MessageSchema = new Schema({
    branch: { type: String, default: 'master' },
    project_id: String,
    actions: [ ActionSchema ],
    commit_message: String,
    author_name: String,
    source_version: Number,
  }, { timestamps: true });

  const statics = MessageSchema.statics;

  statics.lock = ids => {
    if (!ids) {
      return;
    } else if (Number(ids)) {
      const key = id2Key(ids);
      return redis.incr(key);
    }
    const pipeline = redis.pipeline();
    for (const id of ids) {
      pipeline.incr(id2Key(id));
    }
    return pipeline.exec();
  };

  statics.unLock = ids => {
    let keys;
    if (!ids) {
      return;
    } else if (Number(ids)) {
      keys = id2Key(ids);
    } else {
      const keys = [];
      for (const id of ids) {
        keys.push(id2Key(id));
      }
    }
    return redis.del(keys);
  };

  statics.resetLock = id => {
    const key = id2Key(id);
    return redis.set(key, 1);
  };

  statics.isLocked = project_id => {
    const key = id2Key(project_id);
    return redis.get(key);
  };

  MessageSchema.methods.lock = function() {
    return statics.lock(this.project_id);
  };

  MessageSchema.methods.unLock = function() {
    return statics.unLock(this.project_id);
  };

  MessageSchema.methods.resetLock = function() {
    return statics.resetLock(this.project_id);
  };

  MessageSchema.virtual('isLocked').get(function() {
    return statics.isLocked(this.project_id);
  });

  return mongoose.model('Message', MessageSchema);
};
