import React from 'react'
import classNames from 'classnames'
import '../css/Controls.scss'

const TIMEFRAMES = ['1h', '1d', '7d', '4w']
const CHANNEL_SELECTION = [
  { key: 'MEMBER_OF', value: 'my channels' },
  { key: 'POPULAR', value: 'popular channels' }
]

const Controls = React.memo(({ setAppState, timeframe, channelListType }) => (
  <div className="controls">
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
            onClick={() => setAppState((state) => ({ ...state, timeframe: t }))}
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  </div>
))

Controls.displayName = 'Controls'

export default Controls
