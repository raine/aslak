import { DateTime, Interval } from 'luxon'

const timeframeToDurationObject = (timeframe) => {
  const [, digit, char] = timeframe.match(/^(\d+)([a-z])$/)
  const unit =
    // prettier-ignore
    char === 'h' ? 'hours' :
    char === 'd' ? 'days' :
    char === 'm' ? 'months' :
    char === 'y' ? 'years' : null
  return { [unit]: parseInt(digit) }
}

export const timeframeToDateTime = (timeframe) =>
  DateTime.local().minus(timeframeToDurationObject(timeframe))

export const intervalFromTimeframe = (timeframe) =>
  Interval.fromDateTimes(timeframeToDateTime(timeframe), DateTime.local())

export const fromSlackTimestamp = (ts) => DateTime.fromSeconds(parseFloat(ts))

export const floorInterval = (interval, dateTime) =>
  dateTime.set({
    minute: Math.floor(dateTime.minute / interval) * interval,
    second: 0,
    milliseconds: 0
  })
