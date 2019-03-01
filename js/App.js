import React, { Fragment, useState, useEffect } from 'react'
import Background from './Background'
import * as _ from 'lodash/fp'
import Controls from './Controls'
import NewWindow from 'react-new-window'
import Channels from './Channels'
import State from './Context'
import { DateTime } from 'luxon'
import { floorInterval } from './time'
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

const openMessageInSlack = (slack, setMessagePermalinkUrl) => (
  channelId,
  slackTs
) => {
  slack.getMessagePermaLink(channelId, slackTs).then(({ permalink }) => {
    setMessagePermalinkUrl(permalink)
    // Automatically close the popup and hope that slack had opened
    // during the timeout delay
    setTimeout(() => {
      setMessagePermalinkUrl(null)
    }, 3000)
  })
}

const getChannelsByListType = (type, allChannels) =>
  // prettier-ignore
  type === 'POPULAR'   ? allChannels.slice(0, 32) :
  type === 'MEMBER_OF' ? allChannels.filter((c) => c.is_member) : []

const SlackMessagePopup = ({ messagePermalinkUrl }) => (
  <NewWindow
    copyStyles={false}
    center={false}
    features={{ width: 400, height: 450, left: 0, top: 0 }}
    url={messagePermalinkUrl}
  />
)

const App = ({ slack }) => {
  const [messagePermalinkUrl, setMessagePermalinkUrl] = useState(null)
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
    emojis: {},
    openMessageInSlack: openMessageInSlack(slack, setMessagePermalinkUrl)
  })

  const { channelListType, timeframe, timeframeInterval } = appState

  useEffect(() => {
    cached('emoji.list', 120, slack.getEmojiList)().then((emojis) =>
      setAppState((state) => ({ ...state, emojis }))
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
            {
              oldest: floorInterval(
                5,
                DateTime.fromJSDate(timeframeInterval[0])
              ).toSeconds()
            },
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
        <SlackMessagePopup messagePermalinkUrl={messagePermalinkUrl} />
      )}
      <Background channels={allChannels} />
      <div className="app-container">
        <Controls
          {...{
            channelListType,
            timeframe,
            setAppState
          }}
        />
        <State.Provider value={appState}>
          {channels.length > 0 && (
            <Channels channels={channels} messages={messages} />
          )}
        </State.Provider>
      </div>
    </Fragment>
  )
}

export default App
