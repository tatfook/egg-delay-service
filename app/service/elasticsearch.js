'use strict';

const BaseParaService = require('./base_para_service');
const Axios = require('axios');

let client;

class OperationParser {
  static parse(operation, datetime, visibility) {
    const { action } = operation;
    const meta = OperationParser.getMeta(operation);
    const bulk = [ meta ];
    if (action !== 'delete') {
      const data = OperationParser[action](operation, datetime, visibility);
      bulk.push(data);
    }
    return bulk;
  }

  static getPageInfoFromPath(operation) {
    const { file_path } = operation;
    const url = file_path.slice(0, -3);
    const splited_path = file_path.split('/');
    const [ username, site ] = splited_path;
    const title = (splited_path[ splited_path.length - 1]).slice(0, -3);
    return [ url, title, site, username ];
  }

  static getMeta(operation) {
    let { action, _id } = operation;
    if (action === 'move') action = 'update';
    return { [action]: { _id } };
  }

  static create(operation, datetime, visibility) {
    const [
      url, title, site, username,
    ] = OperationParser.getPageInfoFromPath(operation);
    const { content } = operation;
    const create_at = datetime;
    const update_at = datetime;
    const id = operation._id;
    const data = {
      url, title, site, username, id, content,
      visibility, create_at, update_at,
    };
    return data;
  }

  static update(operation, datetime) {
    const { content } = operation;
    const update_at = datetime;
    const data = { doc: { content, update_at } };
    return data;
  }

  static move(operation, datetime) {
    const [ url, title ] = OperationParser.getPageInfoFromPath(operation);
    const update_at = datetime;
    const data = { doc: { url, title, update_at } };
    return data;
  }
}

class ElasticsearchService extends BaseParaService {
  get service_name() {
    return 'elasticsearch';
  }

  get client() {
    if (!client) {
      const config = this.config.elasticsearch;
      client = Axios.create({
        baseURL: `${config.url}`,
        headers: { Authorization: config.token },
        timeout: 30 * 1000,
      });
    }
    return client;
  }

  async handleMessage(message) {
    try {
      const body = await this.getBulkBody(message);
      const { index, type } = this.config.elasticsearch.meta.page;
      if (body.length > 0) await this.bulk(body, index, type);
    } catch (err) {
      const { logger } = this.ctx;
      logger.error(err);
    }
  }

  bulk(body, index, type) {
    return this.client.post('/bulk', { body, index, type });
  }

  isPage(operation) {
    const { file_path } = operation;
    const { helper } = this.ctx;
    const { whilt_list } = this.config.elasticsearch;
    if (!(file_path.endsWith('.md'))) return false;
    if (helper.endsWithAny(file_path, whilt_list)) return false;
    return true;
  }

  async parseMarkdown(data) {
    const { service } = this;
    const content = data.doc ? data.doc.content : data.content;
    if (!content) return data;
    const res = await service.keepwork.parseMarkdown(content);
    if (data.content) {
      data.content = res.data.content;
    } else {
      data.doc.content = res.data.content;
    }
    return data;
  }

  async operation2Bulk(operation, datetime, visibility) {
    const bulk = OperationParser.parse(operation, datetime, visibility);
    const data = bulk[1];
    if (data) bulk[1] = await this.parseMarkdown(data);
    return bulk;
  }

  async getBulkBody(message) {
    const operations = message.value.actions;
    const { visibility } = message.value;
    const datetime = message.value.createdAt;
    const body = [];
    for (const operation of operations) {
      try {
        if (!this.isPage(operation)) continue;
        const [ meta, data ] = await this
          .operation2Bulk(operation, datetime, visibility);
        body.push(meta);
        if (data) body.push(data);
      } catch (err) {
        this.ctx.logger.error(err);
      }
    }
    return body;
  }
}

module.exports = ElasticsearchService;
