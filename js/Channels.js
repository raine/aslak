import React from 'react'
import classNames from 'classnames'
import Channel from './Channel'

import '../css/Channels.scss'

const Channels = React.memo(({ channels, messages, expand }) => (
  <div className={classNames('channels', { expand })}>
    {channels.map((c) => (
      <Channel key={c.id} id={c.id} name={c.name} messages={messages[c.id]} />
    ))}
  </div>
))

Channels.displayName = 'Channels'

export default Channels
