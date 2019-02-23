import { XYPlot, LineMarkSeries, XAxis } from 'react-vis'
import * as d3time from 'd3-time'
import React, { useMemo } from 'react'
import { DateTime } from 'luxon'
import makeTicks from './make-ticks'

const formatTick = (timeframe) => (v) =>
  // prettier-ignore
  DateTime.fromMillis(v).toFormat(
   timeframe === '1h' ? 'HH:mm' :
   timeframe === '1d' ? 'HH:mm' :
   timeframe === '7d' ? 'ccc'   : null
  )

const Plot = React.memo(
  ({ timeframe, width, margin, xDomain, yDomain, data }) => {
    const chartTicks = useMemo(
      () =>
        makeTicks(
          timeframe,
          // prettier-ignore
          timeframe === '1h' ? d3time.timeMinute.every(15) :
          timeframe === '1d' ? d3time.timeHour.every(6)    :
          timeframe === '7d' ? d3time.timeDay.every(1)     : null
        ),
      [timeframe]
    )
    return (
      <XYPlot
        height={150}
        width={width}
        margin={margin}
        animation
        xDomain={xDomain}
        yDomain={yDomain}
      >
        <XAxis
          tickSizeInner={0}
          tickSizeOuter={6}
          tickValues={chartTicks}
          tickFormat={formatTick(timeframe)}
        />
        <LineMarkSeries
          size={1}
          markStyle={{ fill: 'white', strokeWidth: 2 }}
          color="#8884d8"
          data={data}
        />
      </XYPlot>
    )
  }
)

Plot.displayName = 'Plot'

export default Plot
