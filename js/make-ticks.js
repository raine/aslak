import * as d3scale from 'd3-scale'

const makeTicks = (from, to, step) =>
  d3scale
    .scaleTime()
    .domain([from.toJSDate(), to.toJSDate()])
    .ticks(step)
    .map((date) => date.getTime())

export default makeTicks
