import React, { useContext, useMemo } from 'react'
import * as d3time from 'd3-time'
import * as _ from 'lodash/fp'
import { Options } from './Context'
import makeTicks from './make-ticks'
import ReactionOverlay from './ReactionOverlay'
import Plot from './Plot'
import AutoSizer from 'react-virtualized-auto-sizer'
import '../css/Channel.scss'

const PLOT_MARGIN = { left: 10, right: 10, top: 40, bottom: 35 }

const toActivityData = (ticks, data) =>
  ticks.map((tick, idx, all) => {
    const nextTick = all[idx + 1]
    return {
      x: tick,
      y: data.reduce(
        (acc, { ts }) =>
          ts > tick && (nextTick ? ts < nextTick : true) ? acc + 1 : acc,
        0
      )
    }
  })

const Channel = React.memo(({ id, name, emojis, messages = [] }) => {
  const { timeframe, slack } = useContext(Options)
  const dataTicks = useMemo(
    () =>
      makeTicks(
        timeframe,
        // prettier-ignore
        timeframe === '1h' ? d3time.timeMinute.every(5)  :
        timeframe === '1d' ? d3time.timeMinute.every(30) :
        timeframe === '7d' ? d3time.timeHour.every(3)    : null
      ),
    [timeframe]
  )

  const data = toActivityData(dataTicks, messages)
  const yMax = _.maxBy((obj) => obj.y, data).y
  const yDomain = [0, yMax === 0 ? 1 : yMax]
  const xDomain = [_.head(data).x, _.last(data).x]

  return (
    <div className="channel">
      <div className="header">
        <a
          className="link"
          href={slack.formatChannelLink(slack.getCachedTeamId(), id)}
        >
          #{name}
        </a>
        {messages.length > 0 && (
          <span className="message-count">
            {messages.length} messages / {timeframe}
          </span>
        )}
      </div>
      <AutoSizer>
        {({ width }) => (
          <div className="plot">
            <Plot
              margin={PLOT_MARGIN}
              {...{
                timeframe,
                width,
                xDomain,
                yDomain,
                data
              }}
            />
            {messages.length ? (
              <ReactionOverlay
                left={PLOT_MARGIN.left}
                width={width - PLOT_MARGIN.left - PLOT_MARGIN.right}
                xDomain={xDomain}
                messages={messages}
                emojis={emojis}
                channelId={id}
              />
            ) : null}
          </div>
        )}
      </AutoSizer>
    </div>
  )
})

Channel.displayName = 'Channel'

export default Channel
