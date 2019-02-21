import { FlexibleWidthXYPlot, AreaSeries, XAxis, YAxis } from 'react-vis'
import { DateTime } from 'luxon'
import React, { useContext, useRef, useMemo } from 'react'
import * as d3time from 'd3-time'
import * as _ from 'lodash/fp'
import * as d3scale from 'd3-scale'
import { Options } from './Context'
import { timeframeToDateTime } from './time'
import ReactionOverlay from './ReactionOverlay'
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

const PLOT_MARGIN = { left: 30, right: 10, top: 25, bottom: 30 }

const Channel = React.memo(({ name, emojis, messages = [] }) => {
  const { timeframe } = useContext(Options)
  const xyPlotRef = useRef(null)
  const dataTicks = makeTicks(
    timeframe,
    // prettier-ignore
    timeframe === '1h' ? d3time.timeMinute.every(5)  :
    timeframe === '1d' ? d3time.timeMinute.every(30) :
    timeframe === '7d' ? d3time.timeHour.every(2)    : null
  )
  const chartTicks = makeTicks(
    timeframe,
    // prettier-ignore
    timeframe === '1h' ? d3time.timeMinute.every(15) :
    timeframe === '1d' ? d3time.timeHour.every(6)    :
    timeframe === '7d' ? d3time.timeDay.every(1)     : null
  )
  const data = toActivityData(dataTicks, messages)
  const yMax = _.maxBy((obj) => obj.y, data).y
  const yDomainMax = yMax === 0 ? 1 : yMax
  const plotDims = xyPlotRef.current ? xyPlotRef.current.state : null
  const yDomain = [0, yDomainMax]
  const xDomain = [_.head(data).x, _.last(data).x]
  const channelReactions = useMemo(
    () => getNormalizedReactions(messages, data),
    [messages, data]
  )

  return (
    <div className="channel">
      <div className="name">#{name}</div>
      <div className="plot">
        <FlexibleWidthXYPlot
          ref={xyPlotRef}
          height={127}
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
          <YAxis
            tickFormat={(v) => parseInt(v).toString()}
            tickValues={[0, yMax]}
            tickSizeInner={0}
            tickSizeOuter={6}
          />
          <AreaSeries color="#8884d8" data={data} curve={'curveMonotoneX'} />
        </FlexibleWidthXYPlot>
        {plotDims && (
          <ReactionOverlay
            {...plotDims}
            {...PLOT_MARGIN}
            yDomain={yDomain}
            xDomain={xDomain}
            reactions={channelReactions}
            emojis={emojis}
          />
        )}
      </div>
    </div>
  )
})

Channel.displayName = 'Channel'

export default Channel
