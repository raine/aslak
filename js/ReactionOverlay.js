import React from 'react'
import { scaleLinear } from 'd3-scale'
import '../css/ReactionOverlay.scss'
import emojiShortcodeToChar from '../emojis.json'

const getEmojiUrlByName = (emojis, name) => emojis[name.replace(/\+/g, 'plus')]

const Reaction = React.memo(({ emojis, name, count, left, top }) => {
  const emojiUrl = getEmojiUrlByName(emojis, name)
  return (
    <div
      title={`:${name}:`}
      className="reaction"
      style={{
        left: `calc(${left}px - 0.5rem)`,
        top: `calc(${top}px - 1.4rem)`
      }}
    >
      <div
        className="emoji"
        style={{
          ...(emojiUrl ? { backgroundImage: `url(${emojiUrl})` } : {})
        }}
      >
        {!emojiUrl ? emojiShortcodeToChar[name] : null}
      </div>
      <div className="count">{count}</div>
    </div>
  )
})

Reaction.displayName = 'Reaction'

const ReactionOverlay = React.memo(
  ({
    width,
    height,
    top,
    left,
    right,
    bottom,
    xDomain,
    yDomain,
    reactions,
    emojis
  }) => {
    const areaHeight = height - bottom - top
    const areaWidth = width - left - right
    const yRange = [0, areaHeight]
    const xRange = [0, areaWidth]
    const xScale = scaleLinear(xDomain, xRange)
    const yScale = scaleLinear(yDomain, yRange)

    return (
      <div
        className="reaction-overlay"
        style={{
          height: areaHeight,
          width: areaWidth,
          top,
          left
        }}
      >
        {reactions
          .filter(({ count }) => count > 1)
          .map(({ x, y, ts, ...rest }) => (
            <Reaction
              key={ts}
              left={xScale(x)}
              top={areaHeight - yScale(y)}
              emojis={emojis}
              {...rest}
            />
          ))}
      </div>
    )
  }
)

ReactionOverlay.displayName = 'ReactionOverlay'

export default ReactionOverlay
