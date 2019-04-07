import React from 'react'
import classNames from 'classnames'
import Channel from './Channel'
import memoizee from 'memoizee'

import '../css/Channels.scss'

const EMPTY = []
const isMessageWithinInterval = (interval) => (msg) =>
  msg.date >= interval.start && msg.date <= interval.end

const filterWithInterval = memoizee((interval, messages) =>
  messages.filter(isMessageWithinInterval(interval))
)

const Channels = React.memo(({ channels, interval, messages, expand }) => (
  <div className={classNames('channels', { expand })}>
    {channels.map((c) => (
      <Channel
        key={c.id}
        id={c.id}
        name={c.name}
        messages={filterWithInterval(interval, messages[c.id] || EMPTY)}
      />
    ))}
  </div>
))

Channels.displayName = 'Channels'

export default Channels
