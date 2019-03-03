import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import Dropdown from './dropdown'
import '../css/Controls.scss'
import K from 'kefir'

const TIMEFRAMES = [
  { key: '1h', text: '1h' },
  { key: '1d', text: '1d' },
  { key: '7d', text: '7d' },
  { key: '4w', text: '4w' }
]
const CHANNEL_SELECTION = [
  { key: 'MEMBER_OF', text: 'my channels' },
  { key: 'POPULAR', text: 'popular channels' },
  { key: 'RANDOM', text: 'surprise me' }
]

const Controls = React.memo(({ dispatch, timeframe, channelListType }) => {
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
        <Dropdown
          options={CHANNEL_SELECTION}
          value={channelListType}
          setValue={(value) => dispatch({ type: 'setChannelListType', value })}
        />
      </div>
      <div className="timeframe-selector">
        <Dropdown
          options={TIMEFRAMES}
          value={timeframe}
          setValue={(value) => dispatch({ type: 'setTimeframe', value })}
        />
      </div>
    </div>
  )
})

Controls.displayName = 'Controls'

export default Controls
