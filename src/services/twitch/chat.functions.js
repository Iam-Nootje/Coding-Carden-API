const tmi = require('tmi.js');
const { sub } = require('date-fns');

const parseEmotes = require('../../lib/parseEmotes');

function listenChats(app) {
  const client = new tmi.Client({
    connection: {
      secure: true,
      reconnect: true
    },
    channels: [process.env.TWITCH_CHANNEL_NAME]
  });
  client.connect();
  client.on('message', async (channel, tags, message) => {
    if (tags['message-type'] === 'whisper') return;
    tags.badges = tags.badges || {};
    const item = Object.entries(tags).reduce((all, [key, value]) => {
      all[key.replace(/-/g, '_')] = value;
      return all;
    }, {});
    item.name = item.display_name || item.username;
    item.created_at = new Date(+item.tmi_sent_ts);
    item.deleted_at = null;
    item.message = message;
    item.parsedMessage = await parseEmotes(message, item.emotes);
    app.service('twitch/chat').create(item);
  });
  client.on('timeout', async (channel, username, reason, duration, tags) => {
    const user_id = tags['target-user-id'];
    const recentChats = await app.service('twitch/chat').find({
      query: {
        user_id,
      },
      created_at: {
        $gte: sub(new Date(), {
          minutes: 10,
        }),
      }
    });
    await Promise.all(
      recentChats.map(async (chat) => {
        await app.service('twitch/chat').remove(chat.id);
      })
    );
  });
  client.on('messagedeleted', (channel, username, deletedMessage, userstate) => {
    const id = userstate['target-msg-id'];
    app.service('twitch/chat').remove(id);
  });
}

module.exports = {
  listenChats,
};
