'use strict';

const Service = require('egg').Service;
const _ = require('lodash');

class NodeService extends Service {
  async commitMany(commitDetail, record) {
    const { actions } = commitDetail;
    await Promise.all(actions.map(action => {
      return this.commit(action, record);
    }));
  }

  async commit(action, record) {
    console.log(record);
    const { ctx } = this;
    const { _id, version } = action;
    const node = await ctx.model.Node.findOne({ _id });
    if (_.isEmpty(node)) return;
    if (_.isEmpty(node.latest_commit)) return;
    const { commit, index } = node.getCommitByVersion(version);
    if (_.isEmpty(commit)) return;
    _.assign(commit, record);
    await ctx.model.Node.updateOne(
      { _id: node._id },
      { $set: { [`commits.${index}`]: commit } }
    );
  }
}

module.exports = NodeService;
