import { DateTime } from 'luxon'
import parseDuration from 'parse-duration'

export const timeframeToDateTime = (timeframe) =>
  DateTime.utc().minus(parseDuration(timeframe))

export const fromSlackTimestamp = (ts) =>
  DateTime.fromSeconds(parseFloat(ts))

export const floorInterval = (interval, dateTime) =>
  dateTime.set({
    minute: Math.floor(dateTime.minute / interval) * interval,
    second: 0,
    milliseconds: 0
  })
