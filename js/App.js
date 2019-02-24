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

const updateChannelMessages = (id, channelMessages) => (messages) => ({
  ...messages,
  [id]: _.uniqBy((m) => m.slackTs, (messages[id] || []).concat(channelMessages))
})

const unbind = (k) => k.offValue.bind(k)

const getChannelsByListType = (type, allChannels) =>
  type === 'POPULAR'   ? allChannels.slice(0, 15) :
  type === 'MEMBER_OF' ? allChannels.filter((c) => c.is_member) : []

const App = ({ slack }) => {
  const [allChannels, setAllChannels] = useState([])
  const [channels, setChannels] = useState([])
  const [channelListType, setChannelListType] = useState(DEFAULT_CHANNEL_LIST_TYPE)
  const [messages, setMessages] = useState({})
  const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME)
  const [emojis, setEmojis] = useState({})
  const timeframeInterval = [
    timeframeToDateTime(timeframe).toJSDate(),
    new Date()
  ]

  useEffect(() => {
    Promise.all([
      cached('emoji.list', 120, slack.getEmojiList)(),
      slack.getChannelsCached()
    ]).then(([emojis, allChannels]) => {
      setAllChannels(allChannels)
      setEmojis(emojis)
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
    <Options.Provider value={{ timeframe, timeframeInterval, slack }}>
      <Fragment>
        <Background channels={allChannels.slice(0, 60)} />
        <div className="app-container">
          <Controls
            {...{
              timeframe,
              setTimeframe,
              channelListType,
              setChannelListType
            }}
          />
          {channels.length > 0 && (
            <div className="channels">
              {channels.map((c) => (
                <Channel
                  key={c.id}
                  emojis={emojis}
                  messages={messages[c.id]}
                  {...c}
                />
              ))}
            </div>
          )}
        </div>
      </Fragment>
    </Options.Provider>
  )
}

export default App
