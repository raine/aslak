import React, { useContext, useMemo, useState, Fragment } from 'react'
import { getAttributeScale } from 'react-vis/es/utils/scales-utils'
import * as d3time from 'd3-time'
import * as _ from 'lodash/fp'
import State from './Context'
import makeTicks from './make-ticks'
import ReactionOverlay from './ReactionOverlay'
import Plot from './Plot'
import AutoSizer from 'react-virtualized-auto-sizer'
import '../css/Channel.scss'

const PLOT_MARGIN = { left: 10, right: 10, top: 10, bottom: 35 }
const dataTickStep = (timeframe) =>
  // prettier-ignore
  timeframe === '1h' ? d3time.timeMinute.every(5)  :
  timeframe === '1d' ? d3time.timeMinute.every(30) :
  timeframe === '7d' ? d3time.timeHour.every(2)    :
  timeframe === '1m' ? d3time.timeDay.every(1)     :
  timeframe === '3m' ? d3time.timeDay.every(1)     :
  timeframe === '6m' ? d3time.timeWeek.every(1)    : null

const toActivityData = (ticks, data) =>
  ticks.map((tick, idx, all) => {
    const nextTick = all[idx + 1]
    return {
      x: tick,
      y: data.reduce(
        (acc, { date }) =>
          date > tick && (nextTick ? date < nextTick : true) ? acc + 1 : acc,
        0
      )
    }
  })

const Channel = React.memo(({ id, name, messages = [] }) => {
  const { timeframe, interval, slack } = useContext(State)
  const [animateEmoji, setAnimateEmoji] = useState(false)
  const [dimensions, setDimensions] = useState({})
  const { width } = dimensions
  const dataTicks = useMemo(
    () => makeTicks(interval.start, interval.end, dataTickStep(timeframe)),
    [interval, timeframe]
  )
  const messagesWithinTimeframe = useMemo(
    () =>
      messages.filter(
        (m) => m.date >= interval.start && m.date <= interval.end
      ),
    [messages, interval]
  )
  const data = useMemo(
    () => toActivityData(dataTicks, messagesWithinTimeframe),
    [dataTicks, messagesWithinTimeframe]
  )
  const yMax = _.maxBy((obj) => obj.y, data).y
  const yDomain = [0, yMax === 0 ? 1 : yMax]
  const xDomain = [_.head(data).x, _.last(data).x]
  const innerPlotWidth = width - PLOT_MARGIN.left - PLOT_MARGIN.right
  const xRange = [0, innerPlotWidth]
  const xScale = useMemo(
    () =>
      getAttributeScale(
        {
          _allData: [data],
          _adjustWhat: [0],
          _adjustBy: ['x'],
          xType: 'time',
          xRange,
          xDomain
        },
        'x'
      ),
    [data, xRange, xDomain]
  )

  return (
    <div
      className="channel"
      onMouseEnter={() => {
        setAnimateEmoji(true)
      }}
      onMouseLeave={() => {
        setAnimateEmoji(false)
      }}
    >
      <div className="header">
        <a
          className="name"
          href={slack.formatChannelLink(slack.getCachedTeamId(), id)}
        >
          #{name}
        </a>
        <span className="message-count">
          {messagesWithinTimeframe.length} message
          {messagesWithinTimeframe.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="plot-container">
        <AutoSizer onResize={setDimensions}>
          {({ height, width }) => (
            <Fragment>
              <ReactionOverlay
                parentWidth={width}
                plotMargin={PLOT_MARGIN}
                xScale={xScale}
                messages={messagesWithinTimeframe}
                animateEmoji={animateEmoji}
              />
              <Plot
                margin={PLOT_MARGIN}
                {...{
                  height: height - 40,
                  width,
                  xDomain,
                  yDomain,
                  xScale,
                  data,
                  messagesWithinTimeframe
                }}
              />
            </Fragment>
          )}
        </AutoSizer>
      </div>
    </div>
  )
})

Channel.displayName = 'Channel'

export default Channel
