import React from 'react'
import Dropdown from './dropdown'
import '../css/Controls.scss'

const TIMEFRAMES = [
  { key: '1h', text: '1h' },
  { key: '1d', text: '1d' },
  { key: '7d', text: '7d' },
  { key: '4w', text: '4w' }
]
const CHANNEL_SELECTION = [
  { key: 'MEMBER_OF', text: 'my channels' },
  { key: 'POPULAR', text: 'popular channels' }
]

const Controls = React.memo(({ dispatch, timeframe, channelListType }) => (
  <div className="controls">
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
))

Controls.displayName = 'Controls'

export default Controls
