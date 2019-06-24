'use strict';

const _ = require('lodash/lang');

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const CommitSchema = new Schema({
    commit_id: String,
    short_id: String,
    version: Number,
    author_name: String,
    source_version: Number,
    message: String,
  }, { timestamps: true });

  const LastCommitSchema = new Schema({
    version: Number,
    source_version: Number,
    message: String,
  }, { timestamps: true });

  const NodeSchema = new Schema({
    name: String,
    path: String,
    content: String,
    type: { type: String, default: 'blob' },
    project_id: Number,
    account_id: Number,
    commits: [ CommitSchema ],
    latest_commit: LastCommitSchema,
  }, { timestamps: true });

  const methods = NodeSchema.methods;

  methods.getCommitByVersion = function(version) {
    let index;
    let commit;
    if (!_.isEmpty(this.commits)) {
      index = version;
      commit = this.commits[version] || {};
      if (commit.version !== version) {
        for (let i = 0; i < this.commits.length; i++) {
          const item = this.commits[i];
          if (item.version === version) {
            commit = item;
            index = i;
            break;
          }
        }
      }
    }
    return { commit, index };
  };

  return mongoose.model('Node', NodeSchema);
};
