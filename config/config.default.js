'use strict';

module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1545013186957_366';

  // add your config here
  config.middleware = [];

  config.security = {
    xframe: {
      enable: false,
    },
    csrf: {
      enable: false,
    },
  };

  return config;
};
