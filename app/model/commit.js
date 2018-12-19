'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
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
    id: String,
    actions: [ ActionSchema ],
    commit_message: String,
    author_name: String,
  }, { timestamps: true });

  return mongoose.model('Commit', CommitSchema);
};
