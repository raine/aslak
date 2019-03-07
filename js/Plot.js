import XYPlot from 'react-vis/es/plot/xy-plot'
import VerticalBarSeries from 'react-vis/es/plot/series/vertical-bar-series'
import XAxis from 'react-vis/es/plot/axis/x-axis'
import classNames from 'classnames'
import * as d3time from 'd3-time'
import React, { useMemo, useState, useCallback, useContext } from 'react'
import { DateTime } from 'luxon'
import makeTicks from './make-ticks'
import State from './Context'

import '../css/Plot.scss'

const chartTickStep = (timeframe) =>
  // prettier-ignore
  timeframe === '1h' ? d3time.timeMinute.every(15) :
  timeframe === '1d' ? d3time.timeHour.every(6)    :
  timeframe === '7d' ? d3time.timeDay.every(1)     :
  timeframe === '1m' ? d3time.timeWeek.every(1)    :
  timeframe === '3m' ? d3time.timeMonth.every(1)   :
  timeframe === '6m' ? d3time.timeMonth.every(1)   : null

const formatTick = (timeframe) => (v) =>
  // prettier-ignore
  DateTime.fromMillis(v).toFormat(
   timeframe === '1h' ? 'HH:mm' :
   timeframe === '1d' ? 'HH:mm' :
   timeframe === '7d' ? 'ccc'   : 'MMM d'
  )

const findMessageClosestToTimestamp = (messages, timestamp) =>
  messages.reduce((prev, curr) =>
    Math.abs(curr.tsMillis - timestamp) < Math.abs(prev.tsMillis - timestamp)
      ? curr
      : prev
  )

const findDataPointForMessage = (data, msg) =>
  data.find(({ x }, idx, all) => {
    const next = all[idx + 1]
    return msg.tsMillis >= x && (next ? msg.tsMillis < next.x : true)
  })

const Plot = React.memo(
  ({
    width,
    height,
    margin,
    xDomain,
    yDomain,
    xScale,
    data,
    messagesWithinTimeframe
  }) => {
    const { openMessageInSlack, timeframe, interval } = useContext(State)
    const [msgNearestToCursor, setMsgNearestToCursor] = useState(null)
    const chartTicks = useMemo(
      () => makeTicks(interval.start, interval.end, chartTickStep(timeframe)),
      [interval]
    )

    // Find data point matching msgNearestToCursor and override the color
    // property for that data point
    const dataWithHighlight = useMemo(() => {
      const d = msgNearestToCursor
        ? findDataPointForMessage(data, msgNearestToCursor)
        : null
      return data.map((_d, idx) => ({
        ..._d,
        ...(idx === data.indexOf(d) ? { color: 'hsl(243, 52%, 82%)' } : {})
      }))
    }, [msgNearestToCursor, data])

    const onPlotMouseMove = useCallback((ev) => {
      if (!messagesWithinTimeframe.length) return
      const el = ev.currentTarget
      const elDomRect = el.getBoundingClientRect()
      const mouseX = ev.clientX - elDomRect.left - margin.left
      const mouseDate = xScale.invert(mouseX)
      const msg = findMessageClosestToTimestamp(
        messagesWithinTimeframe,
        mouseDate.getTime()
      )
      setMsgNearestToCursor(
        msg &&
          msg.tsMillis >= xScale.invert(mouseX - 30) &&
          msg.tsMillis <= xScale.invert(mouseX + 30)
          ? msg
          : null
      )
    }, [messagesWithinTimeframe, xScale])

    return (
      <XYPlot
        className={classNames('plot', { pointer: msgNearestToCursor })}
        height={height}
        width={width}
        margin={margin}
        animation={false}
        xDomain={xDomain}
        yDomain={yDomain}
        xType="time"
        colorType="literal"
        onMouseMove={onPlotMouseMove}
        onMouseLeave={() => {
          setMsgNearestToCursor(null)
        }}
        onClick={() => {
          if (msgNearestToCursor) openMessageInSlack(msgNearestToCursor)
        }}
      >
        <XAxis
          tickSizeInner={0}
          tickSizeOuter={6}
          tickValues={chartTicks}
          tickFormat={formatTick(timeframe)}
        />
        <VerticalBarSeries
          color="#8884d8"
          barWidth={0.7}
          data={dataWithHighlight}
        />
      </XYPlot>
    )
  }
)

Plot.displayName = 'Plot'

export default Plot
