/**
 * Wood Plugin Module.
 * wechat
 * by jlego on 2018-11-26
 */
const Redis = require('./src/redis');

module.exports = (app = {}, config = {}) => {
  app.Redis = Redis;
  if(app.addAppProp) app.addAppProp('Redis', app.Redis);
  return app;
}
