'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/gitaly.test.js', () => {
  const git_path = 'unittest/hello';
  const author_name = 'unittest';

  it('should create files', async () => {
    const ctx = app.mockContext();
    const actions = [
      {
        action: 'CREATE',
        file_path: 'test/test1.md',
        content: 'here is test1.md',
      },
      {
        action: 'CREATE',
        file_path: 'test/test2.md',
        content: 'here is test2.md',
      },
    ];

    const commit = {
      git_path,
      author_name,
      commit_message: 'test create',
      actions,
    };
    const res = await ctx.service.gitaly.userCommitFiles(commit);
    assert(res.commit_id);
  });

  it('should update files', async () => {
    const ctx = app.mockContext();
    const actions = [
      {
        action: 'UPDATE',
        file_path: 'test/test1.md',
        content: 'updated content',
      },
      {
        action: 'UPDATE',
        file_path: 'test/test2.md',
        content: 'updated content',
      },
    ];

    const commit = {
      git_path,
      author_name,
      commit_message: 'test update',
      actions,
    };
    const res = await ctx.service.gitaly.userCommitFiles(commit);
    assert(res.commit_id);
  });

  it('should move files', async () => {
    const ctx = app.mockContext();
    const actions = [
      {
        action: 'MOVE',
        file_path: 'test1/test1.md',
        previous_path: 'test/test1.md',
        content: 'move files',
      },
      {
        action: 'MOVE',
        file_path: 'test1/test2.md',
        previous_path: 'test/test2.md',
        content: 'move files',
      },
    ];

    const commit = {
      git_path,
      author_name,
      commit_message: 'test move',
      actions,
    };
    const res = await ctx.service.gitaly.userCommitFiles(commit);
    assert(res.commit_id);
  });

  it('should delete files', async () => {
    const ctx = app.mockContext();
    const actions = [
      {
        action: 'delete',
        file_path: 'test1/test1.md',
      },
      {
        action: 'delete',
        file_path: 'test1/test2.md',
      },
    ];

    const commit = {
      git_path,
      author_name,
      commit_message: 'test delete',
      actions,
    };
    const res = await ctx.service.gitaly.userCommitFiles(commit);
    assert(res.commit_id);
  });
});
