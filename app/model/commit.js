'use strict';

const mongoose = require('mongoose');
const dbConfig = require('../config').mongoDB;

mongoose.connect(dbConfig.url, dbConfig.options);

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

module.exports = mongoose.model('Commit', CommitSchema);
