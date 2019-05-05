'use strict';

const _ = require('lodash/object');
const fast_JSON = require('fast-json-stringify');

const id2Key = id => `projects:${id}:locks`;

const getCommitsRecordKey = (project_id, path) => {
  let key = `project:${project_id}`;
  if (path) key += `:file:${path}`;
  key += ':commits';
  return key;
};

const stringifyCommitRecord = fast_JSON({
  title: 'stringify commit record',
  type: 'object',
  properties: {
    short_id: { type: 'string' },
    author_name: { type: 'string' },
    authored_date: { type: 'string' },
    created_at: { type: 'string' },
    message: { type: 'string' },
    version: { type: 'number' },
  },
});


module.exports = app => {
  const { mongoose, redis } = app;
  const Schema = mongoose.Schema;

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

  statics.resetLock = id => {
    const key = id2Key(id);
    return redis.set(key, 1);
  };

  statics.isLocked = project_id => {
    const key = id2Key(project_id);
    return redis.get(key);
  };

  CommitSchema.methods.pushRecord = async function(record) {
    const lens = await this.getLenOfKeysToPush();
    const pipeline = redis.pipeline();
    for (const key of _.keys(lens)) {
      const version = lens[key] + 1;
      record.version = version;
      const formatted = stringifyCommitRecord(record);
      pipeline.lpushx(key, formatted);
    }
    return await pipeline.exec();
  };

  CommitSchema.methods.getLenOfKeysToPush = async function() {
    const lens = {};
    const tasks = [];
    const { project_id, actions } = this;
    for (const action of actions) {
      const key = getCommitsRecordKey(project_id, action.file_path);
      tasks.push(redis.llen(key)
        .then(len => { if (len > 0) lens[key] = Number(len); }));
    }
    await Promise.all(tasks);
    return lens;
  };

  CommitSchema.methods.lock = function() {
    return statics.lock(this.project_id);
  };

  CommitSchema.methods.unLock = function() {
    return statics.unLock(this.project_id);
  };

  CommitSchema.methods.resetLock = function() {
    return statics.resetLock(this.project_id);
  };

  CommitSchema.virtual('isLocked').get(function() {
    return statics.isLocked(this.project_id);
  });

  return mongoose.model('Commit', CommitSchema);
};
