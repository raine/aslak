/* global process */

import qs from 'querystring'
import * as _ from 'lodash/fp'

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET
const X_WWW_FORM_URLENCODED = {
  'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
}

export const login = () => initSlack(SLACK_CLIENT_ID, SLACK_CLIENT_SECRET)
export const init = (token) => {
  const client = {
    get: get(token),
    getAll: getAll(token)
  }

  return {
    ...client,
    getChannels: getChannels(client)
  }
}

const fetchJSON = (...params) => fetch(...params).then((res) => res.json())

const get = (token) => (method, params) =>
  fetchJSON(
    `https://slack.com/api/${method}?` + qs.stringify({ token, ...params }),
    {
      method: 'get',
      headers: X_WWW_FORM_URLENCODED
    }
  ).then((json) => {
    const {
      response_metadata: { next_cursor = null }
    } = json

    return {
      body: json,
      next: next_cursor
        ? () =>
            get(token)(method, {
              ...params,
              cursor: next_cursor
            })
        : null
    }
  })

const getAll = (token) => (method, params, property) => {
  const recur = (acc, promise) =>
    promise.then(({ body, next }) => {
      const xs = acc.concat(body[property])
      return next ? recur(xs, next()) : xs
    })

  return recur([], get(token)(method, params))
}

const formatOauthUri = (clientId) =>
  'https://slack.com/oauth/authorize?' +
  qs.stringify({
    client_id: clientId,
    scope: 'channels:history channels:read'
    // TODO: specify team
  })

const oauthAccess = (clientId, clientSecret, code) =>
  fetchJSON(
    'https://slack.com/api/oauth.access?' +
      qs.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
  )

const initSlack = (clientId, clientSecret) => {
  const { search } = window.location
  const query = qs.parse(search.replace(/^\?/, ''))
  const baseUrl = window.location.href.replace(/\?.*/, '')

  if (query.code) {
    oauthAccess(clientId, clientSecret, query.code)
      .then(({ access_token }) => {
        localStorage.setItem('access_token', access_token)
        window.history.replaceState(
          null,
          document.title,
          baseUrl + (query.state ? atob(query.state) : '')
        )
      })
      .catch(console.error)
  } else if (!localStorage.getItem('access_token')) {
    window.location.replace(formatOauthUri(clientId))
  }

  return localStorage.getItem('access_token')
}

const getChannels = (client) => () =>
  client
    .getAll(
      'conversations.list',
      { limit: 1000, exclude_archived: true },
      'channels'
    )
    .then(
      _.pipe([
        // prettier-ignore
        _.orderBy((x) => x.num_members, ['desc']),
        _.map(_.pick(['id', 'name', 'num_members']))
      ])
    )
