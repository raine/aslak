/* global process */

import qs from 'querystring'
import * as _ from 'lodash/fp'
import { timeframeToDateTime, fromSlackTimestamp, floorInterval } from './time'
import K from 'kefir'
import lscache from 'lscache'

const REDIRECT_URI = `${location.protocol}//${location.host}${location.pathname}`
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET
const X_WWW_FORM_URLENCODED = {
  'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
}

// 53-bit hash function from stackoverflow
var cyrb53 = function(str, seed = 0) {
  var h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed
  for (var i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

const lsMemoize = (fn, ttl, keyPrefix = '') => (...args) => {
  const key = cyrb53(`${keyPrefix}_${JSON.stringify(args)}`)
  const cached = lscache.get(key)
  return cached
    ? Promise.resolve(cached)
    : fn(...args).then((res) => {
        lscache.set(key, res, ttl)
        return res
      })
}

export const login = () => initSlack(SLACK_CLIENT_ID, SLACK_CLIENT_SECRET)

export const init = (token, cacheTTL = 5) => {
  const api = {}
  api.get = get(token, fetchJSON)
  api.getCached = get(token, fetchJSONCached(cacheTTL))
  api.getAll = getAll(api.get)
  api.getAllStreamed = getAllStreamed(api.get)
  api.getAllStreamedCached = getAllStreamed(api.getCached)
  api.getChannels = getChannels(api.getAll)
  api.getChannelsCached = getChannels(getAll(api.getCached))
  api.streamChannelHistory = streamChannelHistory(api.getAllStreamed)
  api.streamChannelHistoryCached = streamChannelHistory(
    api.getAllStreamedCached
  )
  api.streamChannelsHistory = streamChannelsHistory(api.streamChannelHistory)
  api.streamChannelsHistoryCached = streamChannelsHistory(
    api.streamChannelHistoryCached
  )
  api.getMessagePermaLink = getMessagePermaLink(api.get)
  api.getEmojiList = getEmojiList(api.get)
  api.getCachedTeamId = getCachedTeamId
  api.formatChannelLink = formatChannelLink
  return api
}

const fetchJSON = (...params) =>
  fetch(...params)
    .then((res) => Promise.all([res.ok, res.json()]))
    .then(([ok, json]) => {
      if (!ok || !json.ok) throw new Error(JSON.stringify(json))
      else return json
    })
    .catch((err) => {
      console.error(err)
      throw err
    })

const get = (token, fetch) => (method, params) =>
  fetch(
    `https://slack.com/api/${method}?` + qs.stringify({ token, ...params }),
    {
      method: 'get',
      headers: X_WWW_FORM_URLENCODED
    }
  ).then((json) => {
    const next_cursor = _.get('response_metadata.next_cursor', json)

    return {
      body: json,
      next: next_cursor
        ? () =>
            get(token, fetch)(method, {
              ...params,
              cursor: next_cursor
            })
        : null
    }
  })

const fetchJSONCached = (ttl) => lsMemoize(fetchJSON, ttl)

const getAll = (get) => (method, params, property) => {
  const recur = (acc, promise) =>
    promise.then(({ body, next }) => {
      const xs = acc.concat(body[property])
      return next ? recur(xs, next()) : xs
    })

  return recur([], get(method, params))
}

const getAllStreamed = (get) => (method, params, property) =>
  K.stream(({ emit, end }) => {
    const recur = (promise) =>
      promise.then(({ body, next }) => {
        emit(body[property])
        if (next) recur(next())
        else end()
      })

    recur(get(method, params))
  })

const formatOauthUri = (clientId) =>
  'https://slack.com/oauth/authorize?' +
  qs.stringify({
    client_id: clientId,
    scope: 'channels:history channels:read emoji:read',
    redirect_uri: REDIRECT_URI
  })

const oauthAccess = (clientId, clientSecret, code) =>
  fetchJSON(
    'https://slack.com/api/oauth.access?' +
      qs.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: REDIRECT_URI
      })
  )

const initSlack = (clientId, clientSecret) => {
  const { search } = window.location
  const query = qs.parse(search.replace(/^\?/, ''))
  const baseUrl = window.location.href.replace(/\?.*/, '')

  if (query.code) {
    return oauthAccess(clientId, clientSecret, query.code)
      .then((res) => {
        localStorage.setItem('slack_access_token', res.access_token)
        localStorage.setItem('slack_team_id', res.team_id)
        window.history.replaceState(
          null,
          document.title,
          baseUrl + (query.state ? atob(query.state) : '')
        )
        return res.access_token
      })
      .catch(console.error)
  } else if (!localStorage.getItem('slack_access_token')) {
    window.location.replace(formatOauthUri(clientId))
  }

  return Promise.resolve(localStorage.getItem('slack_access_token'))
}

const getChannels = (getAll) => () =>
  getAll(
    'conversations.list',
    { limit: 1000, exclude_archived: true },
    'channels'
  ).then(
    _.pipe([
      _.orderBy((x) => x.num_members, ['desc']),
      _.map(_.pick(['id', 'name', 'num_members']))
    ])
  )

const sanitizeMessages = _.pipe([
  _.reject((msg) => msg.subtype === 'bot_message'),
  _.map(
    _.pipe([
      _.pick(['ts', 'user', 'reactions']),
      (msg) => ({
        ...msg,
        slackTs: msg.ts,
        ts: fromSlackTimestamp(msg.ts).toJSDate()
      })
    ])
  )
])

const streamChannelHistory = (getAllStreamed) => (timeframe, id) =>
  getAllStreamed(
    'conversations.history',
    {
      limit: 1000,
      channel: id,
      oldest: floorInterval(5, timeframeToDateTime(timeframe)).toSeconds()
    },
    'messages'
  )
    // At this point, strip data that is not going to be useful
    .map(sanitizeMessages)

const streamChannelsHistory = (streamChannelHistory) => (timeframe, channels) =>
  K.sequentially(0, channels).flatMapConcurLimit(
    (c) => streamChannelHistory(timeframe, c.id).map((xs) => [c.id, xs]),
    5
  )

const getMessagePermaLink = (get) => (channel, message_ts) =>
  get('chat.getPermalink', { channel, message_ts }).then(_.get('body'))

const getEmojiList = (get) => () => get('emoji.list').then(_.get('body.emoji'))

const getCachedTeamId = () => localStorage.getItem('slack_team_id')

const formatChannelLink = (teamId, channelId) =>
  `slack://channel?id=${channelId}&team=${teamId}`
