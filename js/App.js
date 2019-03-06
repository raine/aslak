import React, { Fragment, useState, useEffect, useReducer } from 'react'
import Background from './Background'
import * as _ from 'lodash/fp'
import Controls from './Controls'
import NewWindow from 'react-new-window'
import Channels from './Channels'
import State from './Context'
import cached from './cached'
import { floorInterval, intervalFromTimeframe } from './time'

import '../css/reboot.css'
import '../css/main.scss'
import '../css/App.scss'
import 'react-vis/dist/style.css'

const DEFAULT_TIMEFRAME = '7d'
const DEFAULT_CHANNEL_LIST_TYPE = 'MEMBER_OF'
const DEFAULT_MESSAGES = []

const updateChannelMessages = (id, channelMessages) => (messages) => ({
  ...messages,
  [id]: _.uniqBy(
    (m) => m.ts,
    (messages[id] || DEFAULT_MESSAGES).concat(channelMessages)
  )
})

const unbind = (k) => k.offValue.bind(k)

const openMessageInSlack = (slack, setMessagePermalinkUrl) => ({
  channelId,
  ts
}) => {
  slack.getMessagePermaLink(channelId, ts).then(({ permalink }) => {
    setMessagePermalinkUrl(permalink)
  })
}

const getChannelsByListType = (type, allChannels) =>
  // prettier-ignore
  type === 'POPULAR'   ? allChannels.slice(0, 32) :
  type === 'MEMBER_OF' ? allChannels.filter((c) => c.is_member) : []

const SlackMessagePopup = ({ messagePermalinkUrl, onUnload }) => (
  <NewWindow
    copyStyles={false}
    center={false}
    features={{ width: 400, height: 450, left: 0, top: 0 }}
    url={messagePermalinkUrl}
    onUnload={onUnload}
  />
)

// prettier-ignore
const appStateReducer = (state, { type, value }) =>
  type === 'setTimeframe' ? {
    ...state,
    timeframe: value,
    interval: intervalFromTimeframe(value)
  } :
  type === 'setChannelListType' ? { ...state, channelListType: value } :
  type === 'setEmojis' ? { ...state, emojis: value } :
  type === 'setExpand' ? { ...state, expand: value } : state

const App = ({ slack }) => {
  const [messagePermalinkUrl, setMessagePermalinkUrl] = useState(null)
  const [allChannels, setAllChannels] = useState([])
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState({})
  const [appState, dispatch] = useReducer(appStateReducer, {
    timeframe: DEFAULT_TIMEFRAME,
    interval: intervalFromTimeframe(DEFAULT_TIMEFRAME),
    channelListType: DEFAULT_CHANNEL_LIST_TYPE,
    slack,
    emojis: {},
    openMessageInSlack: openMessageInSlack(slack, setMessagePermalinkUrl),
    expand: false
  })

  const { channelListType, timeframe, interval, expand } = appState

  useEffect(() => {
    cached('emoji.list', 120, slack.getEmojiList)().then((emojis) =>
      dispatch({ type: 'setEmojis', value: emojis })
    )

    cached('channels', 120, slack.getChannels)().then(setAllChannels)
  }, [])

  useEffect(() => {
    setChannels(getChannelsByListType(channelListType, allChannels))
  }, [channelListType, allChannels])

  useEffect(
    () =>
      unbind(
        slack
          .streamChannelsHistoryCached(
            { oldest: floorInterval(5, interval.start).toSeconds() },
            channels
          )
          .onValue(([channelId, messages]) => {
            setMessages(updateChannelMessages(channelId, messages))
          })
      ),
    [channels, timeframe]
  )

  return (
    <Fragment>
      {messagePermalinkUrl && (
        <SlackMessagePopup
          messagePermalinkUrl={messagePermalinkUrl}
          onUnload={() => setMessagePermalinkUrl(null)}
        />
      )}
      <Background channels={allChannels} />
      <div className="app-container">
        <Controls
          {...{
            channelListType,
            timeframe,
            dispatch,
            expand
          }}
        />
        <State.Provider value={appState}>
          {channels.length > 0 && (
            <Channels channels={channels} messages={messages} expand={expand} />
          )}
        </State.Provider>
      </div>
    </Fragment>
  )
}

export default App
