"use strict";

var _require = require('@feathersjs/errors'),
    FeathersError = _require.FeathersError;

var PledgeService = require('./patreon/pledges.service');

var MemberService = require('./youtube/members.service');

var StatsService = require('./youtube/stats.service');

var TwitchChatService = require('./twitch/chat.service');

var VoxPopuliService = require('./vox/populi.service');

var TwitchSubsService = require('./twitch/subs.service');

var TwitchUsersService = require('./twitch/users.service');

var TwitchRewardsService = require('./twitch/rewards.service');

var TwitchLoginService = require('./twitch/login.service');

var TwitchCommandsService = require('./twitch/commands.service');

var unAuthorizedMessage = 'Un-Authorized. 👮🚨 This event will be reported to the internet police. 🚨👮';

var internalOnly = function internalOnly(context) {
  return regeneratorRuntime.async(function internalOnly$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (context.params.provider) {
            _context.next = 2;
            break;
          }

          return _context.abrupt("return", context);

        case 2:
          throw new FeathersError(unAuthorizedMessage, 'un-authorized', 401, 'UnAuthorizedError', null);

        case 3:
        case "end":
          return _context.stop();
      }
    }
  });
};

var verifyAPIKey = function verifyAPIKey(context) {
  return regeneratorRuntime.async(function verifyAPIKey$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          if (context.params.provider) {
            _context2.next = 2;
            break;
          }

          return _context2.abrupt("return", context);

        case 2:
          if (!(context.params.query && context.params.query.key === process.env.CLIENT_API_KEY || context.params.headers['X-API-KEY'] === process.env.CLIENT_API_KEY || context.params.apiKey === process.env.CLIENT_API_KEY)) {
            _context2.next = 4;
            break;
          }

          return _context2.abrupt("return", context);

        case 4:
          throw new FeathersError(unAuthorizedMessage, 'un-authorized', 401, 'UnAuthorizedError', null);

        case 5:
        case "end":
          return _context2.stop();
      }
    }
  });
};

module.exports = function configure(app) {
  var apiKeyFindHooks = {
    before: {
      get: [verifyAPIKey],
      find: [verifyAPIKey]
    }
  };
  app.use('patreon/pledges', new PledgeService());
  app.service('patreon/pledges').hooks(apiKeyFindHooks);
  app.use('youtube/stats', new StatsService(app));
  app.service('youtube/stats').hooks(apiKeyFindHooks);
  app.use('youtube/members', new MemberService(app));
  app.service('youtube/members').hooks(apiKeyFindHooks);
  app.use('twitch/subs', new TwitchSubsService());
  app.service('twitch/subs').hooks(apiKeyFindHooks);
  app.use('twitch/rewards', new TwitchRewardsService(app));
  app.service('twitch/rewards').hooks({
    before: {
      find: [verifyAPIKey],
      patch: [verifyAPIKey],
      create: [internalOnly]
    }
  });
  app.use('twitch/chat', new TwitchChatService(app));
  app.service('twitch/chat').hooks({
    before: {
      find: [verifyAPIKey],
      patch: [verifyAPIKey],
      create: [internalOnly],
      remove: [internalOnly]
    }
  });
  app.use('twitch/commands', new TwitchCommandsService(app));
  app.service('twitch/commands').hooks({
    before: {
      find: [verifyAPIKey],
      patch: [verifyAPIKey],
      create: [internalOnly],
      remove: [internalOnly]
    }
  });
  app.use('twitch/users', new TwitchUsersService(app));
  app.service('twitch/users').hooks({
    before: {
      get: [verifyAPIKey],
      find: [verifyAPIKey],
      patch: [internalOnly],
      create: [internalOnly, function (context) {
        return context.event = null;
      }]
    }
  });
  app.use('vox/populi', new VoxPopuliService(app));
  app.service('vox/populi').hooks({
    before: {
      create: [internalOnly],
      remove: [verifyAPIKey]
    }
  });
  app.use('twitch/login', new TwitchLoginService(app));
};