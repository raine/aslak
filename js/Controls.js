import React from 'react'
import classNames from 'classnames'
import Dropdown from './dropdown'
import '../css/Controls.scss'

const TIMEFRAMES = [
  { key: '1h', text: '1h' },
  { key: '1d', text: '1d' },
  { key: '7d', text: '7d' },
  { key: '1m', text: '1m' },
  { key: '3m', text: '3m' },
  { key: '6m', text: '6m' }
]

const CHANNEL_SELECTION = [
  { key: 'MEMBER_OF', text: 'my channels' },
  { key: 'POPULAR', text: 'popular channels' },
  { key: 'DISCOVER', text: 'discover' }
]

const ExpandIcon = () => (
  <svg
    width="24"
    height="24"
    fill="none"
    stroke="#000"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.807 8.597L22.211 12l-3.404 3.403M14.268 12h6.922M5.193 15.403L1.789 12l3.404-3.403M9.732 12H2.81" />
  </svg>
)

const Controls = React.memo(
  ({ dispatch, timeframe, channelListType, expand }) => (
    <div className="controls">
      <div>
        <Dropdown
          options={CHANNEL_SELECTION}
          value={channelListType}
          setValue={(value) => dispatch('setChannelListType', value)}
        />
      </div>
      <div className="controls-right">
        <div
          title="Expand channels horizontally"
          className={classNames('expand', { active: expand })}
          onClick={() => dispatch('setExpand', !expand)}
        >
          <ExpandIcon />
        </div>
        <div>
          <Dropdown
            options={TIMEFRAMES}
            value={timeframe}
            setValue={(value) => dispatch('setTimeframe', value)}
          />
        </div>
      </div>
    </div>
  )
)

Controls.displayName = 'Controls'

export default Controls
