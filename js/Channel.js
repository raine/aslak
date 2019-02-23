import { XYPlot, AreaSeries, LineMarkSeries, XAxis, YAxis } from 'react-vis'
import { DateTime } from 'luxon'
import React, { useContext, useRef, useMemo, useEffect } from 'react'
import * as d3time from 'd3-time'
import * as _ from 'lodash/fp'
import * as d3scale from 'd3-scale'
import { Options } from './Context'
import { timeframeToDateTime } from './time'
import ReactionOverlay from './ReactionOverlay'
import AutoSizer from 'react-virtualized-auto-sizer'
import '../css/Channel.scss'

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

const makeTicks = (timeframe, step) => {
  const fromDate = timeframeToDateTime(timeframe).toJSDate()
  const toDate = new Date()
  return d3scale
    .scaleTime()
    .domain([fromDate, toDate])
    .ticks(step)
    .map((x) => x.getTime())
}

// Move to overlay?
const getNormalizedReactions = (messages, data) =>
  _.pipe([
    _.filter((msg) => msg.reactions),
    _.flatMap((msg) =>
      msg.reactions.map((reactions) => ({
        ..._.omit(['users'], reactions),
        slackTs: msg.slackTs,
        ts: msg.ts.getTime()
      }))
    ),
    _.orderBy((x) => x.count, ['desc']),
    _.map((msg) => ({
      ...msg,
      ...(data.find(({ x }, idx) => {
        const next = data[idx + 1]
        return x <= msg.ts && (next ? next.x >= msg.ts : true)
      }) || data[0])
    })),
    _.uniqBy((r) => r.x)
  ])(messages)

const PLOT_MARGIN = { left: 10, right: 10, top: 40, bottom: 35 }

const Channel = React.memo(({ id, name, emojis, messages = [] }) => {
  const { timeframe, slack } = useContext(Options)
  const xyPlotRef = useRef(null)
  const dataTicks = makeTicks(
    timeframe,
    // prettier-ignore
    timeframe === '1h' ? d3time.timeMinute.every(5)  :
    timeframe === '1d' ? d3time.timeMinute.every(30) :
    timeframe === '7d' ? d3time.timeHour.every(3)    : null
  )
  const chartTicks = makeTicks(
    timeframe,
    // prettier-ignore
    timeframe === '1h' ? d3time.timeMinute.every(15) :
    timeframe === '1d' ? d3time.timeHour.every(6)    :
    timeframe === '7d' ? d3time.timeDay.every(1)     : null
  )
  const data = toActivityData(dataTicks, messages)
  let yMax = _.maxBy((obj) => obj.y, data).y
  yMax = yMax === 0 ? 1 : yMax
  const plotDims = xyPlotRef.current ? xyPlotRef.current.state : null
  const yDomain = [0, yMax]
  const xDomain = [_.head(data).x, _.last(data).x]
  const channelReactions = useMemo(
    () => getNormalizedReactions(messages, data),
    [messages, data]
  )

  return (
    <div className="channel">
      <div className="name">
        <a href={slack.formatChannelLink(slack.getCachedTeamId(), id)}>
          #{name}
        </a>
      </div>
      <AutoSizer>
        {({ width, height }) => (
          <div className="plot">
            <XYPlot
              ref={xyPlotRef}
              height={150}
              width={width}
              margin={PLOT_MARGIN}
              animation
              xDomain={xDomain}
              yDomain={yDomain}
            >
              <XAxis
                tickSizeInner={0}
                tickSizeOuter={6}
                tickValues={chartTicks}
                tickFormat={(v) =>
                  // prettier-ignore
                  DateTime.fromMillis(v).toFormat(
                 timeframe === '1h' ? 'HH:mm' :
                 timeframe === '1d' ? 'HH:mm' :
                 timeframe === '7d' ? 'ccc'   : null
                )
                }
              />
              <LineMarkSeries
                size={1}
                markStyle={{ fill: 'white', strokeWidth: 2 }}
                color="#8884d8"
                data={data}
              />
            </XYPlot>
            <ReactionOverlay
              left={PLOT_MARGIN.left}
              width={width - PLOT_MARGIN.left - PLOT_MARGIN.right}
              yDomain={yDomain}
              xDomain={xDomain}
              reactions={channelReactions}
              emojis={emojis}
              channelId={id}
            />
          </div>
        )}
      </AutoSizer>
    </div>
  )
})

Channel.displayName = 'Channel'

export default Channel
