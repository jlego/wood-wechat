/**
 * Wood Plugin Module.
 * wechat
 * by jlego on 2018-11-26
 */
const request = require('request-promise');

module.exports = (app = {}, config = {}) => {
  const { Redis, Util, catchErr, error } = WOOD;
  app.Wechat = {
    async hasState(key){
      let stateCache = new Redis('auth'),
        result = await stateCache.getValue(key);
      return result;
    },
    // 发起授权
    auth(req, res, next) {
      let userAgent = req.headers['user-agent'].toLowerCase(),
        params = Util.getParams(req),
        paramsArr = [],
        state = new Date().getTime(),
        stateCache = new Redis('auth');
      if(userAgent.indexOf("micromessenger")){
        catchErr(stateCache.setValue(state, 1, 10));
        for(let key of Object.keys(params)){
          paramsArr.push(`${key === 'pid' ? 'product_id' : key}=${params[key]}`);
        }
        paramsArr.push(`reg_from=wechat`);
        let redirectUri = encodeURIComponent(`${config.callback}?${paramsArr.join('&')}`);
        res.redirect(`https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appid}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`);
      }else{
        next();
      }
    },

    // 回调中间件
    async callback(req, res, next){
      let params = Util.getParams(req), { reg_from, state, code } = params;
      if(reg_from === 'wechat'){
        let hasState = await catchErr(app.Wechat.hasState(state));
        if(hasState.err || !hasState.data){
          res.print('授权失败');
          return;
        }
        let tokenResult = await catchErr(app.Wechat.accessToken({ code }));
        if (tokenResult.err) {
          res.print(tokenResult);
          return;
        }
        let {access_token, openid} = tokenResult.data || {};
        let userinfoResult = await catchErr(app.Wechat.userinfo({ access_token, openid }));
        if (userinfoResult.err) {
          res.print(userinfoResult);
          return;
        }
        let userinfo = userinfoResult.data;
        userinfo.image_url = userinfo.headimgurl;
        req.userinfo = userinfo;
        req.openid = openid;
      }
      next();
    },

    // 获取access_token
    async accessToken(params = {}){
      let { code } = params;
      let tokenResult = await request.get(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.appid}&secret=${config.secret}&code=${code}&grant_type=authorization_code`);
      try{
        tokenResultData = JSON.parse(tokenResult);
      }catch(err) {
        throw error(err);
      }
      return tokenResultData;
    },

    // 获取userinfo
    async userinfo(params = {}){
      let { access_token, openid } = params;
      let userinfoResult = await request.get(`https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`);
      try{
        userinfoResultData = JSON.parse(userinfoResult);
      }catch(err) {
        throw error(err);
      }
      return userinfoResultData;
    }
  };
  if(app.addAppProp) app.addAppProp('Wechat', app.Wechat);
  return app;
}
