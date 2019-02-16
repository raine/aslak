import React, {
  Fragment,
  useState,
  useEffect,
  useContext
} from 'react'
// import { FlexibleXYPlot, LineSeries } from 'react-vis'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis
} from 'recharts'
import { DateTime } from 'luxon'
import { timeframeToDateTime } from './time'
import * as d3scale from 'd3-scale'
import * as d3time from 'd3-time'
import * as L from 'partial.lenses'
import cached from './cached'
import Background from './Background'

import '../css/reboot.css'
import '../css/main.scss'
import '../css/App.scss'
// import 'react-vis/dist/style.css'

const TIMEFRAME = '7d'
const CHANNELS_CACHE_TTL = 1440

const updateChannelMessages = (id, messages) => (channels) =>
  L.modify(
    [L.whereEq({ id }), 'messages', L.valueOr([])],
    (msgs) => msgs.concat(messages),
    channels
  )

const makeTicks = (timeframe, step) => {
  const fromDate = timeframeToDateTime(timeframe).toJSDate()
  const toDate = new Date()
  return d3scale
    .scaleTime()
    .domain([fromDate, toDate])
    .ticks(step)
    .map((x) => x.getTime())
}

const toActivityData = (ticks, data) =>
  ticks.map((tick, idx, all) => {
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

const Channel = ({ name, messages = [] }) => {
  const { timeframe } = useContext(Options)
  const dataTicks = makeTicks(
    timeframe,
    // prettier-ignore
    timeframe === '1h' ? d3time.timeMinute.every(5)  :
    timeframe === '1d' ? d3time.timeMinute.every(30) :
    timeframe === '7d' ? d3time.timeHour.every(1)    : null
  )
  const chartTicks = makeTicks(
    timeframe,
    // prettier-ignore
    timeframe === '1h' ? d3time.timeMinute.every(60) :
    timeframe === '1d' ? d3time.timeHour.every(6)    :
    timeframe === '7d' ? d3time.timeDay.every(1)     : null
  )

  const data = toActivityData(dataTicks, messages)

  return (
    <div className="channel">
      <div className="name">#{name}</div>
      <div className="plot">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis
              tickFormatter={(tick) =>
                // prettier-ignore
                DateTime.fromMillis(tick).toFormat(
                  timeframe === '1h' ? 'HH:mm' :
                  timeframe === '1d' ? 'HH:mm' : 
                  timeframe === '7d' ? 'ccc'   : null
                )
              }
              height={15}
              tickSize={3}
              interval={0}
              ticks={chartTicks}
              tick={{ fontSize: 10 }}
              dataKey="x"
              scale="time"
              type="number"
              domain={['dataMin', 'dataMax']}
            />
            <Line
              id={name}
              dot={false}
              type="basis"
              dataKey="y"
              stroke="#8884d8"
              strokeWidth={1}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const Options = React.createContext()

const App = ({ slack }) => {
  const [allChannels, setAllChannels] = useState([])
  const [channels, setChannels] = useState([])
  const [timeframe, setTimeframe] = useState(TIMEFRAME)

  useEffect(() => {
    // slack.getCached('conversation.history', {
    //   limit: 1000,
    //   channel: 'C029SKMGS'
    // })
    // .then(console.log)

    slack.getChannelsCached().then(
      (allChannels) => {
        // const channels = allChannels.filter(
        //   (x) => x.name === 'hobby-shitposting'
        // )
        const channels = allChannels.filter((c) =>
          [
            'autokerho',
            'hobby-stanga-cycling',
            'politics',
            'heirs',
            'help-admin',
            'design',
            'tech-web',
            'team-gossip',
            'spacelab',
            'investing',
            'sylvanerstallone',
            'hobby-video-gaming'
          ].includes(c.name)
        )
        setAllChannels(allChannels)
        setChannels(channels)
        slack
          .streamChannelsHistoryCached(timeframe, channels)
          .onValue(([channelId, messages]) => {
            setChannels(updateChannelMessages(channelId, messages))
          })
          .log()
      }
    )
  }, [])

  return (
    <Options.Provider value={{ timeframe }}>
      <Fragment>
        <Background channels={allChannels.slice(0, 60)} />
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

// <YAxis
//             tick={{ fontSize: 12 }}
//             axisLine={false}
//             tickLine={false}
//             width={25}
//             domain={['dataMin', 'dataMax']}
//             allowDecimals={false}
//           />
