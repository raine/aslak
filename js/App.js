import React, {
  Fragment,
  useState,
  useEffect,
  useContext
} from 'react'
import { FlexibleXYPlot, LineSeries } from 'react-vis'
import { timeframeToDateTime } from './time'
import * as d3scale from 'd3-scale'
import * as L from 'partial.lenses'
import * as _ from 'lodash/fp'
import cached from './cached'
import '../css/reboot.css'
import '../css/main.scss'
import '../css/App.scss'
import 'react-vis/dist/style.css'

const TIMEFRAME = '7d'
const CHANNELS_CACHE_TTL = 1440
const WEIGHTS = [300, 400, 500, 600]
const strToNumber = (str) =>
  _.sum(str.split('').map((c) => c.charCodeAt(0)))
const pickFromArray = (arr, str) => {
  const i = strToNumber(str)
  const len = arr.length
  return arr[((i % len) + len) % len]
}

const Background = ({ channels }) => (
  <div className="background">
    {channels.map((c) => (
      <span
        key={c.id}
        style={{ fontWeight: pickFromArray(WEIGHTS, c.id) }}
      >{`#${c.name} `}</span>
    ))}
  </div>
)

const updateChannelMessages = (id, messages) => (channels) =>
  L.modify(
    [L.whereEq({ id }), 'messages', L.valueOr([])],
    (msgs) => msgs.concat(messages),
    channels
  )

const toActivityData = (timeframe, tickCount, data) => {
  if (!data.length) return []
  const fromDate = timeframeToDateTime(timeframe).toJSDate()
  const toDate = new Date()
  const ticks = d3scale
    .scaleTime()
    .domain([fromDate, toDate])
    .ticks(tickCount)

  return ticks.map((tick, idx, all) => {
    const nextTick = all[idx + 1]
    return {
      x: tick,
      y: data.reduce(
        (acc, { ts }) =>
          ts > tick && (nextTick ? ts < nextTick : true)
            ? acc + 1
            : acc,
        0
      )
    }
  })
}

const Channel = ({ name, messages = [] }) => {
  const { timeframe, tickCount } = useContext(Options)

  return (
    <div className="channel">
      <div className="name">#{name}</div>
      <div className="plot">
        <FlexibleXYPlot
          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
          animation={{ duration: 500 }}
        >
          <LineSeries
            data={toActivityData(
              timeframe,
              tickCount,
              messages
            )}
            curve={'curveBasis'}
          />
        </FlexibleXYPlot>
      </div>
    </div>
  )
}

const Options = React.createContext()

const App = ({ slack }) => {
  const [initialized, setInitialized] = useState(false)
  const [allChannels, setAllChannels] = useState([])
  const [channels, setChannels] = useState([])
  const [timeframe, setTimeframe] = useState(TIMEFRAME)
  const tickCount = 70

  useEffect(() => {
    if (!initialized) {
      cached(
        'channels',
        CHANNELS_CACHE_TTL,
        slack.getChannels
      )().then((allChannels) => {
        const channels = allChannels.slice(4, 10)
        setAllChannels(allChannels)
        setChannels(channels)
        slack
          .streamChannelsHistory(timeframe, channels)
          .onValue(([channelId, messages]) => {
            setChannels(updateChannelMessages(channelId, messages))
          })
          .log()
      })

      setInitialized(true)
    }
  })

  return (
    <Options.Provider value={{ timeframe, tickCount }}>
      <Fragment>
        <Background channels={allChannels} />
        {channels.length > 0 && (
          <div className="app-container">
            <div className="channels">
              {channels.map((c) => (
                <Channel key={c.id} {...c} />
              ))}
            </div>
          </div>
        )}
      </Fragment>
    </Options.Provider>
  )
}

export default App
