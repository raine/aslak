import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import '../css/Controls.scss'
import { timeframeToDateTime } from './time'
import K from 'kefir'

const TIMEFRAMES = ['1h', '1d', '7d', '4w']
const CHANNEL_SELECTION = [
  { key: 'MEMBER_OF', value: 'my channels' },
  { key: 'POPULAR', value: 'popular channels' }
]

const Controls = React.memo(({ setAppState, timeframe, channelListType }) => {
  const [isScrolledTop, setIsScrolledTop] = useState(true)

  useEffect(() => {
    const s = K.fromEvents(document, 'scroll')
      .throttle(20)
      .map(() => document.scrollingElement.scrollTop === 0)
      .skipDuplicates()

    s.onValue(setIsScrolledTop)
    return () => s.offValue(setIsScrolledTop)
  }, [])

  return (
    <div
      className={classNames('controls', { 'is-scrolled-top': isScrolledTop })}
    >
      <div className="channel-selector">
        <ul>
          {CHANNEL_SELECTION.map(({ key, value }) => (
            <li
              className={classNames({ selected: channelListType === key })}
              key={key}
              onClick={() =>
                setAppState((state) => ({ ...state, channelListType: key }))
              }
            >
              {value}
            </li>
          ))}
        </ul>
      </div>
      <div className="timeframe-selector">
        <ul>
          {TIMEFRAMES.map((t) => (
            <li
              className={classNames({ selected: timeframe === t })}
              key={t}
              onClick={() =>
                setAppState((state) => ({
                  ...state,
                  timeframe: t,
                  timeframeInterval: [
                    timeframeToDateTime(t).toJSDate(),
                    new Date()
                  ]
                }))
              }
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})

Controls.displayName = 'Controls'

export default Controls
