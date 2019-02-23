import { timeframeToDateTime } from './time'
import * as d3scale from 'd3-scale'

const makeTicks = (timeframe, step) => {
  const fromDate = timeframeToDateTime(timeframe).toJSDate()
  const toDate = new Date()
  return d3scale
    .scaleTime()
    .domain([fromDate, toDate])
    .ticks(step)
    .map((x) => x.getTime())
}

export default makeTicks
