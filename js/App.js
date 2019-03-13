import React, { Fragment, useState, useReducer, useMemo } from 'react'
import Background from './Background'
import NewWindow from 'react-new-window'
import ChannelsView from './ChannelsView'
import LoginView from './LoginView'
import State from './Context'
import * as slack from './slack'
import { intervalFromTimeframe } from './time'
import channelNames from '../channel-names.json'

import '../css/reboot.css'
import '../css/main.scss'
import '../css/App.scss'
import 'react-vis/dist/style.css'

const DEFAULT_TIMEFRAME = '7d'
const DEFAULT_CHANNEL_LIST_TYPE = 'MEMBER_OF'

const openMessageInSlack = (slackClient, setMessagePermalinkUrl) => ({
  channelId,
  ts
}) => {
  slackClient.getMessagePermaLink(channelId, ts).then(({ permalink }) => {
    setMessagePermalinkUrl(permalink)
  })
}

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

const App = ({ slackToken }) => {
  const slackClient = useMemo(
    () => (slackToken ? slack.init(slackToken) : null),
    []
  )
  const [messagePermalinkUrl, setMessagePermalinkUrl] = useState(null)
  const [allChannels, setAllChannels] = useState([])
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState({})
  const [appState, dispatch] = useReducer(appStateReducer, {
    timeframe: DEFAULT_TIMEFRAME,
    interval: intervalFromTimeframe(DEFAULT_TIMEFRAME),
    channelListType: DEFAULT_CHANNEL_LIST_TYPE,
    slackClient,
    emojis: {},
    openMessageInSlack: openMessageInSlack(slackClient, setMessagePermalinkUrl),
    expand: false
  })

  return (
    <Fragment>
      {messagePermalinkUrl && (
        <SlackMessagePopup
          messagePermalinkUrl={messagePermalinkUrl}
          onUnload={() => setMessagePermalinkUrl(null)}
        />
      )}
      <Background
        channels={slackClient ? allChannels.map((c) => c.name) : channelNames}
      />
      <div className="app-container">
        <State.Provider value={appState}>
          {slackClient ? (
            <ChannelsView
              {...{
                dispatch,
                channels,
                messages,
                slackClient,
                allChannels,
                setAllChannels,
                setChannels,
                setMessages
              }}
            />
          ) : null}
          {!slackClient ? <LoginView /> : null}
        </State.Provider>
      </div>
    </Fragment>
  )
}

export default App
