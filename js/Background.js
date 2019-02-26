import React from 'react'
import { animated, useTransition } from 'react-spring'
import * as _ from 'lodash/fp'
import '../css/Background.scss'

const WEIGHTS = [300, 400, 500, 600]
const strToNumber = (str) => _.sum(str.split('').map((c) => c.charCodeAt(0)))
const pickFromArray = (arr, str) => {
  const i = strToNumber(str)
  const len = arr.length
  return arr[((i % len) + len) % len]
}

const Background = React.memo(
  ({ channels: allChannels }) => {
    const channels = allChannels.slice(0, 75)
    const transitions = useTransition(channels, (c) => c.id, {
      from: { opacity: 0 },
      enter: { opacity: 1.0 },
      trail: 15
    })

    return (
      <div className="background">
        {_.shuffle(transitions).map(({ item, props, key }) => (
          <animated.span
            key={key}
            style={{
              fontWeight: pickFromArray(WEIGHTS, item.id),
              ...props
            }}
          >{`#${item.name} `}</animated.span>
        ))}
      </div>
    )
  },
  (prev) => prev.channels.length > 0
)

Background.displayName = 'Background'

export default Background
