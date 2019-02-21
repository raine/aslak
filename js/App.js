import React, { Fragment, useState, useEffect } from 'react'
import * as L from 'partial.lenses'
import Background from './Background'
import Channel from './Channel'
import { Options } from './Context'
import cached from './cached'

import '../css/reboot.css'
import '../css/main.scss'
import '../css/App.scss'
import 'react-vis/dist/style.css'

const TIMEFRAME = '7d'

const updateChannelMessages = (id, messages) => (channels) =>
  L.modify(
    [L.whereEq({ id }), 'messages', L.valueOr([])],
    (msgs) => msgs.concat(messages),
    channels
  )

const App = ({ slack }) => {
  const [allChannels, setAllChannels] = useState([])
  const [channels, setChannels] = useState([])
  const [timeframe, setTimeframe] = useState(TIMEFRAME)
  const [emojis, setEmojis] = useState({})

  useEffect(() => {
    Promise.all([
      cached('emoji.list', 120, slack.getEmojiList)(),
      slack.getChannelsCached()
    ]).then(([emojis, allChannels]) => {
      const channels = allChannels.filter((c) =>
        [
          'autokerho',
          'hobby-stanga-cycling',
          'politics',
          'heirs',
          'announce-global',
          'help-admin',
          'design',
          'tech-web',
          'team-gossip',
          'spacelab',
          'investing',
          'sylvanerstallone',
          'hobby-shitposting',
          'hobby-video-gaming',
          'typescript'
        ].includes(c.name)
      )
      // const channels = allChannels.slice(0, 20)
      setAllChannels(allChannels)
      setChannels(channels)
      setEmojis(emojis)
      slack
        .streamChannelsHistoryCached(timeframe, channels)
        .onValue(([channelId, messages]) => {
          setChannels(updateChannelMessages(channelId, messages))
        })
    })
  }, [])

  return (
    <Options.Provider value={{ timeframe, slack }}>
      <Fragment>
        <Background channels={allChannels.slice(0, 60)} />
        {channels.length > 0 && (
          <div className="app-container">
            <div className="channels">
              {channels.map((c) => (
                <Channel key={c.id} emojis={emojis} {...c} />
              ))}
            </div>
          </div>
        )}
      </Fragment>
    </Options.Provider>
  )
}

export default App
