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
    project_id: String,
    actions: [ ActionSchema ],
    commit_message: String,
    author_name: String,
    source_version: Number,
  }, { timestamps: true });

  const statics = CommitSchema.statics;

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

  statics.isLocked = project_id => {
    const key = id2Key(project_id);
    return redis.get(key);
  };

  CommitSchema.methods.lock = function() {
    return statics.lock(this.project_id);
  };

  CommitSchema.methods.unLock = function() {
    return statics.unLock(this.project_id);
  };

  CommitSchema.virtual('isLocked').get(function() {
    return statics.isLocked(this.project_id);
  });

  return mongoose.model('Commit', CommitSchema);
};
