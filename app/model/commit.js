'use strict';

const id2Key = id => `projects:${id}:locks`;

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const redis = app.redis;

  const ActionSchema = new Schema({
    action: String,
    file_path: String,
    previous_path: String,
    content: String,
    encoding: { type: String, default: 'text' },
  });

  const CommitSchema = new Schema({
    branch: { type: String, default: 'master' },
    id: String,
    actions: [ ActionSchema ],
    commit_message: String,
    author_name: String,
  }, { timestamps: true });

  const statics = CommitSchema.statics;

  statics.lock = id => {
    const key = id2Key(id);
    return redis.incr(key);
  };

  statics.unLock = ids => {
    let keys;
    if (ids instanceof Array) {
      keys = ids.map(id => id2Key(id));
    } else {
      keys = id2Key(ids);
    }
    return redis.del(keys);
  };

  statics.isLocked = id => {
    const key = id2Key(id);
    return redis.get(key);
  };

  CommitSchema.methods.lock = function() {
    return statics.lock(this.id);
  };

  CommitSchema.methods.unLock = function() {
    return statics.unLock(this.id);
  };

  CommitSchema.virtual('isLocked').get(function() {
    return statics.isLocked(this.id);
  });

  return mongoose.model('Commit', CommitSchema);
};
