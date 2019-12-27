const axios = require('axios');
const io = require('socket.io-client');

const {
  STREAMLABS_SOCKET_TOKEN: socketToken
} = process.env;

const {
  key,
  externalChannelId,
  context,
  headers,
  referrer,
} = require('./members.config');

const studioBaseURL = 'https://studio.youtube.com/youtubei/v1';
const streamLabsURL = 'https://sockets.streamlabs.com';

async function getMemberData() {
  const { data } = await axios.post(`${studioBaseURL}/sponsors/creator_sponsorships_data?alt=json&key=${key}`, {
    context,
    externalChannelId,
    mask: {
      sponsorshipsTierData: {
        all: true,
      },
      sponsorsData: {
        all: true,
      },
    },
    sponsorsOptions: {
      pageSize: 100,
      filter: {},
    },
  }, {
    headers,
    referrer,
  });
  return {
    tiers: data.sponsorshipsData.sponsorshipsTierData.tiers,
    memberData: data.sponsorshipsData.sponsorsData.sponsors,
  };
}

async function getChannelData(channelIds) {
  const { data } = await axios.post(`${studioBaseURL}/creator/get_creator_channels?alt=json&key=${key}`, {
    context,
    channelIds,
    mask: {
      channelId: true,
      title: true,
    },
  }, {
    headers,
    referrer,
  });
  return data.channels;
}

const reduceById = prop => (byId, item) => {
  byId[item[prop]] = item;
  return byId;
};

const daysToMilliseconds = days => (60 * 60 * 24 * days * 1000);
const emojiRegex = new RegExp(['💧', '🌻', '💩', '🥑', '🚜'].join('|'), 'g');

async function getMembers() {
  const { tiers, memberData } = await getMemberData();
  const channelData = await getChannelData(memberData.map(m => m.externalChannelId));
  const channelsById = channelData.reduce(reduceById('channelId'), {});
  const tiersById = tiers.reduce(reduceById('id'), {});
  const usersById = {};
  const users = memberData.map((member) => {
    const tier = tiersById[member.tierId];
    const user = {
      id: member.externalChannelId,
      name: channelsById[member.externalChannelId].title.split(' ')[0],
      level: {
        level_id: tier.id,
        amount_cents: tier.pricingLevelId / 10000,
        created_at: new Date(Date.now() - daysToMilliseconds(member.durationAtCurrentTier.amount)),
      },
    };
    usersById[member.externalChannelId] = user;
    return user;
  });
  return {
    users,
    usersById,
    levels: tiers.reduce((all, tier) => {
      all[tier.id] = tier.liveVersion.name.replace(emojiRegex, '').trim();
      return all;
    }, {}),
  };
}

function listenForMembers(app) {
  const streamlabs = io(`${streamLabsURL}?token=${socketToken}`, {
    transports: ['websocket']
  });
  streamlabs.on('connect', () => {
    console.log('connected to streamlabs');
  });
  streamlabs.on('connect_error', (error) => {
    console.log('error connecting to streamlabs');
    console.error(error);
  });
  streamlabs.on('event', (eventData) => {
    if (eventData.for === 'youtube_account' && eventData.type === 'subscription') {
      app.service('youtube/members').create({});
    }
  });
}

module.exports = {
  getMembers,
  listenForMembers
};
