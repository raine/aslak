import React from 'react'
import * as _ from 'lodash/fp'

const WEIGHTS = [300, 400, 500, 600]
const strToNumber = (str) =>
  _.sum(str.split('').map((c) => c.charCodeAt(0)))
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

export default Background
