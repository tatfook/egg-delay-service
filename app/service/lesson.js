'use strict';

const Service = require('egg').Service;
const Axios = require('axios');

module.exports = app => {
  const config = app.config.lesson;
  const Client = Axios.create({
    baseURL: `${config.url}/`,
    headers: { Authorization: config.token },
    timeout: 30 * 1000,
  });

  class LessonService extends Service {
    get client() {
      return Client;
    }

    addPagination(page = 1, per_page = 20, options = {}) {
      options.params = options.params || {};
      options.params['x-page'] = page;
      options.params['x-per-page'] = per_page;
      return options;
    }

    async getLessonsPackages(page = 1, per_page = 20) {
      const options = this.addPagination(page, per_page);
      const res = await Client.get('/admins/packages', options);
      return res.data;
    }

    async getLessonsPackage(pkg) {
      const res = await this.getLessons(pkg.id, 1, 1000);
      const lessons = res.data;
      return {
        id: pkg.id,
        title: pkg.packageName,
        cover: pkg.extra.coverUrl,
        total_lessons: lessons.length,
        description: pkg.intro || '',
        prize: pkg.rmb,
        age_min: pkg.minAge,
        age_max: pkg.maxAge,
        recent_view: pkg.lastClassroomCount,
        created_at: pkg.createdAt,
        updated_at: pkg.updatedAt,
      };
    }

    getLessons(package_id, page = 1, per_page = 20) {
      const options = this.addPagination(page, per_page);
      return Client.get(`/packages/${package_id}/lessons`, options);
    }
  }

  return LessonService;
};
