import React from 'react'
import Channel from './Channel'

import '../css/Channels.scss'

const Channels = React.memo(({ channels, messages }) => (
  <div className="channels">
    {channels.map((c) => (
      <Channel key={c.id} id={c.id} name={c.name} messages={messages[c.id]} />
    ))}
  </div>
))

Channels.displayName = 'Channels'

export default Channels
