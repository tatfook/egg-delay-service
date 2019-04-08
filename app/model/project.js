'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const CommitSchema = new Schema({
    _id: String,
    short_id: String,
    author_name: String,
    authored_date: String,
    created_at: String,
    message: String,
    version: Number,
    source_version: Number,
  });

  const ProjectSchema = new Schema({
    _id: Number,
    visibility: { type: String, default: 'public' },
    name: String,
    site_id: Number,
    sitename: String,
    path: { type: String, unique: true },
    git_path: String,
    account_id: Number,
    commits: [ CommitSchema ],
  }, { timestamps: true });

  CommitSchema.virtual('id')
    .get(function() { return this._id; })
    .set(function(value) { this._id = value; });

  ProjectSchema.methods.fillVersion = function() {
    let version = 1;
    for (const commit of this.commits) {
      commit.version = version;
      version++;
    }
  };

  return mongoose.model('Project', ProjectSchema);
};
