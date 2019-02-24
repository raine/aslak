import { XYPlot, VerticalBarSeries, XAxis } from 'react-vis'
import * as d3time from 'd3-time'
import React, { useMemo } from 'react'
import { DateTime } from 'luxon'
import makeTicks from './make-ticks'

const chartTickStep = (timeframe) =>
  // prettier-ignore
  timeframe === '1h' ? d3time.timeMinute.every(15) :
  timeframe === '1d' ? d3time.timeHour.every(6)    :
  timeframe === '7d' ? d3time.timeDay.every(1)     :
  timeframe === '4w' ? d3time.timeWeek.every(1)    : null

const formatTick = (timeframe) => (v) =>
  // prettier-ignore
  DateTime.fromMillis(v).toFormat(
   timeframe === '1h' ? 'HH:mm' :
   timeframe === '1d' ? 'HH:mm' :
   timeframe === '7d' ? 'ccc'   :
   timeframe === '4w' ? 'MMM d' : null
  )

const Plot = React.memo(
  ({ timeframe, timeframeInterval, width, margin, xDomain, yDomain, data }) => {
    const [timeframeFrom, timeframeTo] = timeframeInterval
    const chartTicks = useMemo(
      () => makeTicks(timeframeFrom, timeframeTo, chartTickStep(timeframe)),
      [timeframeFrom, timeframeTo]
    )
    return (
      <XYPlot
        height={150}
        width={width}
        margin={margin}
        animation={false}
        xDomain={xDomain}
        yDomain={yDomain}
      >
        <XAxis
          tickSizeInner={0}
          tickSizeOuter={6}
          tickValues={chartTicks}
          tickFormat={formatTick(timeframe)}
        />
        <VerticalBarSeries color="#8884d8" barWidth={0.7} data={data} />
      </XYPlot>
    )
  }
)

Plot.displayName = 'Plot'

export default Plot
