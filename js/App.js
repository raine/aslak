import React, {
  Fragment,
  useState,
  useReducer,
  useMemo,
  useEffect
} from 'react'
import Background from './Background'
import NewWindow from 'react-new-window'
import ChannelsView from './ChannelsView'
import LoginView from './LoginView'
import State from './Context'
import * as _ from 'lodash/fp'
import * as slack from './slack'
import { intervalFromTimeframe } from './time'
import channelNames from '../channel-names.json'

import '../css/reboot.css'
import '../css/main.scss'
import '../css/App.scss'
import 'react-vis/dist/style.css'

const DEFAULT_TIMEFRAME = '7d'
const DEFAULT_CHANNELS = []
const DEFAULT_CHANNEL_LIST_TYPE = 'MEMBER_OF'
const DEFAULT_MESSAGES = []

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
  type === 'setAllChannels' ? { ...state, allChannels: value } :
  type === 'setChannels' ? { ...state, channels: value } :
  type === 'updateChannelMessages' ? (([channelId, channelMessages]) => {
    const { messages} = state
    const newChannelMessages = _.uniqBy(
      (msg) => msg.ts,
      _.getOr(DEFAULT_MESSAGES, channelId, messages).concat(channelMessages)
    )
    return {
      ...state,
      messages: {
        ...messages,
        [channelId]: newChannelMessages
      }
    }
  })(value) :
  type === 'setExpand' ? { ...state, expand: value } : state

const App = ({ slackToken }) => {
  const slackClient = useMemo(
    () => (slackToken ? slack.init(slackToken) : null),
    []
  )
  const [messagePermalinkUrl, setMessagePermalinkUrl] = useState(null)
  const [appState, _dispatch] = useReducer(appStateReducer, {
    allChannels: DEFAULT_CHANNELS,
    channels: DEFAULT_CHANNELS,
    timeframe: DEFAULT_TIMEFRAME,
    interval: intervalFromTimeframe(DEFAULT_TIMEFRAME),
    channelListType: DEFAULT_CHANNEL_LIST_TYPE,
    messages: {},
    slackClient,
    emojis: {},
    openMessageInSlack: openMessageInSlack(slackClient, setMessagePermalinkUrl),
    expand: false
  })

  const dispatch = _.curry((type, value) => _dispatch({ type, value }))

  useEffect(() => {
    window.addEventListener('beforeunload', () => {
      slackClient.revokeToken()
    })
  }, [])

  return (
    <Fragment>
      {messagePermalinkUrl && (
        <SlackMessagePopup
          messagePermalinkUrl={messagePermalinkUrl}
          onUnload={() => setMessagePermalinkUrl(null)}
        />
      )}
      <Background
        channels={
          slackClient ? appState.allChannels.map((c) => c.name) : channelNames
        }
      />
      <div className="app-container">
        <State.Provider value={appState}>
          {slackClient ? <ChannelsView {...{ dispatch, slackClient }} /> : null}
          {!slackClient ? <LoginView /> : null}
        </State.Provider>
      </div>
    </Fragment>
  )
}

export default App
