/* global process */

import qs from 'querystring'
import * as _ from 'lodash/fp'
import { fromSlackTimestamp } from './time'
import K from 'kefir'
import pMemoize from 'promise-memoize'

const REDIRECT_URI = `${location.protocol}//${location.host}${
  location.pathname
}`

const SCOPES = ['channels:history', 'channels:read', 'emoji:read', 'users:read']
const LS_TEAM_ID = 'slack_team_id' // TODO: not necessary with team_id is an env variable
export const CLIENT_ID = process.env.SLACK_CLIENT_ID
export const TEAM_ID = process.env.SLACK_TEAM_ID
const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET
const X_WWW_FORM_URLENCODED = {
  'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
}

export const getTokenWithCode = () => {
  const { search } = window.location
  const query = qs.parse(search.replace(/^\?/, ''))
  return query.code
    ? oauthAccess(CLIENT_ID, CLIENT_SECRET, query.code)
        .then((res) => {
          const baseUrl = window.location.href.replace(/\?.*/, '')
          localStorage.setItem(LS_TEAM_ID, res.team_id)
          window.history.replaceState(
            null,
            document.title,
            baseUrl + (query.state ? atob(query.state) : '')
          )
          return res.access_token
        })
        .catch(console.error)
    : Promise.resolve(null)
}

const DEFAULT_TTL = 5 * 60 * 1000

export const init = (token, cacheTTL = DEFAULT_TTL) => {
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
  api.getUserInfo = getUserInfo(api.get)
  api.getUserInfoCached = pMemoize(api.getUserInfo, { maxAge: cacheTTL })
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

const get = (token, fetchJSON) => (method, params) =>
  fetchJSON(
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
            get(token, fetchJSON)(method, {
              ...params,
              cursor: next_cursor
            })
        : null
    }
  })

const fetchJSONCached = (ttl) => pMemoize(fetchJSON, { maxAge: ttl })

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

export const formatOauthAuthorizeUri = (clientId, teamId) =>
  'https://slack.com/oauth/authorize?' +
  qs.stringify({
    client_id: clientId,
    scope: SCOPES.join(' '),
    redirect_uri: REDIRECT_URI,
    team: teamId
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

const getChannels = (getAll) => () =>
  getAll(
    'conversations.list',
    { limit: 1000, exclude_archived: true },
    'channels'
  ).then(
    _.pipe([
      _.orderBy((x) => x.num_members, ['desc']),
      _.map(_.pick(['id', 'name', 'is_member', 'num_members']))
    ])
  )

const IGNORED_MESSAGE_SUBTYPES = [
  'channel_join',
  'channel_leave',
  'bot_message'
]

const sanitizeMessages = (channelId) =>
  _.pipe([
    _.reject((msg) => IGNORED_MESSAGE_SUBTYPES.includes(msg.subtype)),
    _.map((msg) => {
      const datetime = fromSlackTimestamp(msg.ts)
      return {
        ...msg,
        tsMillis: datetime.toMillis(),
        date: datetime.toJSDate(),
        datetime,
        channelId
      }
    })
  ])

const streamChannelHistory = (getAllStreamed) => (params, channelId) =>
  getAllStreamed(
    'conversations.history',
    {
      limit: 1000,
      channel: channelId,
      ...params
    },
    'messages'
  ).map(sanitizeMessages(channelId))

const streamChannelsHistory = (streamChannelHistory) => (
  params,
  channels,
  concurrency = 2
) =>
  K.sequentially(0, channels).flatMapConcurLimit(
    (c) => streamChannelHistory(params, c.id).map((xs) => [c.id, xs]),
    concurrency
  )

const getMessagePermaLink = (get) => (channel, message_ts) =>
  get('chat.getPermalink', { channel, message_ts }).then(_.get('body'))

const getEmojiList = (get) => () => get('emoji.list').then(_.get('body.emoji'))

const getCachedTeamId = () => localStorage.getItem(LS_TEAM_ID)

const formatChannelLink = (teamId, channelId) =>
  `slack://channel?id=${channelId}&team=${teamId}`

const getUserInfo = (get) => (user) =>
  get('users.info', { user }).then(_.get('body.user'))
