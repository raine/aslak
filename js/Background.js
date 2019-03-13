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

const takeRepeat = (n, xs) => {
  if (!xs.length) return []
  let i = 0
  let j = 0
  const arr = []
  while (i < n) {
    arr.push(xs[j])
    j = j === xs.length - 1 ? 0 : j + 1
    i = i + 1
  }
  return arr
}

const Background = React.memo(
  ({ channels }) => {
    channels = takeRepeat(80, channels)
    const transitions = useTransition(channels, (c, idx) => idx, {
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
              fontWeight: pickFromArray(WEIGHTS, item),
              ...props
            }}
            data-text={`#${item} `}
          />
        ))}
      </div>
    )
  },
  (prev) => prev.channels.length > 0
)

Background.displayName = 'Background'

export default Background
