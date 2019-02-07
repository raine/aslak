import React, { Fragment, useState, useEffect } from 'react'
import * as _ from 'lodash/fp'
import cached from './cached'
import '../css/reboot.css'
import '../css/main.scss'
import '../css/App.scss'

const WEIGHTS = [300, 400, 500, 600]
const strToNumber = (str) => _.sum(str.split('').map((c) => c.charCodeAt(0)))
const pickFromArray = (arr, str) => {
  const i = strToNumber(str)
  const len = arr.length
  return arr[((i % len) + len) % len]
}

const Background = ({ channels }) => (
  <div className="background">
    {channels.map((c) => (
      <span
        key={c.id}
        style={{ fontWeight: pickFromArray(WEIGHTS, c.id) }}
      >{`#${c.name} `}</span>
    ))}
  </div>
)

const App = ({ slack }) => {
  const [initialized, setInitialized] = useState(false)
  const [channels, setChannels] = useState([])

  useEffect(() => {
    if (!initialized) {
      cached('channels', 1440, slack.getChannels)().then(setChannels)
      setInitialized(true)
    }
  })

  return (
    <Fragment>
      <Background channels={channels} />
      <div className="app-container">
        <div className="channels">
          {channels.slice(0,20).map((c) => (
            <div className="channel" key={c.id}>
              <span>#{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </Fragment>
  )
}

export default App
