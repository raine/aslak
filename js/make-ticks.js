import * as d3scale from 'd3-scale'

const makeTicks = (from, to, step) =>
  d3scale
    .scaleTime()
    .domain([from, to])
    .ticks(step)
    .map((x) => x.getTime())

export default makeTicks