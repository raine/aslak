import React, { Fragment, useState, useEffect } from 'react'
import Background from './Background'
import Channel from './Channel'
import * as _ from 'lodash/fp'
import Controls from './Controls'
import { Options } from './Context'
import cached from './cached'
import { timeframeToDateTime } from './time'

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
    (m) => m.slackTs,
    (messages[id] || DEFAULT_MESSAGES).concat(channelMessages)
  )
})

const unbind = (k) => k.offValue.bind(k)

const getChannelsByListType = (type, allChannels) =>
  // prettier-ignore
  type === 'POPULAR'   ? allChannels.slice(0, 15) :
  type === 'MEMBER_OF' ? allChannels.filter((c) => c.is_member) : []

const Channels = React.memo(({ channels, messages }) => (
  <div className="channels">
    {channels.map((c) => (
      <Channel key={c.id} name={c.name} messages={messages[c.id]} />
    ))}
  </div>
))

Channels.displayName = 'Channels'

const App = ({ slack }) => {
  const [allChannels, setAllChannels] = useState([])
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState({})
  const [appState, setAppState] = useState({
    timeframe: DEFAULT_TIMEFRAME,
    timeframeInterval: [
      timeframeToDateTime(DEFAULT_TIMEFRAME).toJSDate(),
      new Date()
    ],
    channelListType: DEFAULT_CHANNEL_LIST_TYPE,
    slack,
    emojis: {}
  })

  const { channelListType, timeframe, timeframeInterval } = appState

  // TODO: Set channels separately from emojis to have bg load faster
  useEffect(() => {
    Promise.all([
      cached('emoji.list', 120, slack.getEmojiList)(),
      slack.getChannelsCached()
    ]).then(([emojis, allChannels]) => {
      setAllChannels(allChannels)
      setAppState((state) => ({ ...state, emojis }))
    })
  }, [])

  useEffect(() => {
    setChannels(getChannelsByListType(channelListType, allChannels))
  }, [channelListType, allChannels])

  useEffect(
    () =>
      unbind(
        slack
          .streamChannelsHistoryCached(timeframeInterval, channels)
          .onValue(([channelId, messages]) => {
            setMessages(updateChannelMessages(channelId, messages))
          })
      ),
    [channels, timeframe]
  )

  return (
    <Fragment>
      <Background channels={allChannels.slice(0, 60)} />
      <div className="app-container">
        <Controls
          {...{
            channelListType,
            timeframe,
            setAppState
          }}
        />
        <Options.Provider value={appState}>
          {channels.length > 0 && (
            <Channels channels={channels} messages={messages} />
          )}
        </Options.Provider>
      </div>
    </Fragment>
  )
}

export default App
