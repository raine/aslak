import React, { useMemo, useRef, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import '../css/ReactionOverlay.scss'
import * as _ from 'lodash/fp'
import Reaction from './Reaction'
import { useThrottle } from 'use-lodash-debounce-throttle'

const calcPushedLeftOffset = (reaction) =>
  Math.sqrt(1 / Math.abs(reaction.offsetX)) *
  15 *
  (reaction.offsetX < 0 ? -1 : 1)

const MAX_REACTION_COUNT = 20

const getNormalizedReactions = _.pipe([
  _.filter((msg) => msg.reactions),
  _.flatMap((msg) =>
    msg.reactions.map((reactions) => ({
      ..._.omit(['users'], reactions),
      msg
    }))
  ),
  _.filter((r) => r.count > 1),
  // Take the most popular reaction from each message
  _.orderBy((r) => r.count, ['desc']),
  _.uniqBy((r) => r.msg.ts),

  // Sort in ascending order to have reactions with larger count render on top
  _.orderBy((r) => r.count, ['asc']),

  (reactions) =>
    reactions.length <= MAX_REACTION_COUNT
      ? reactions
      : _.takeLast(
          MAX_REACTION_COUNT,
          reactions.slice((reactions.length + 1) / 2, -1)
        )
])

const getCoordsRelativeToRect = (domRect, event) => ({
  x: event.clientX - domRect.left,
  y: event.clientY - domRect.top
})

const X_THRESHOLD = 12

const ReactionOverlay = React.memo(
  ({ parentWidth, plotMargin, xDomain, messages, animateEmoji }) => {
    const width = parentWidth - plotMargin.left - plotMargin.right
    const left = plotMargin.left
    const overlayRef = useRef(null)
    const xRange = [0, width]
    const xScale = scaleLinear(xDomain, xRange)
    const [reactionNearMouse, setReactionNearMouse] = useState(null)
    const [nearbyReactions, setNearbyReactions] = useState({})
    const reactions = useMemo(() => getNormalizedReactions(messages), [
      messages
    ])
    const reactionsWithPositions = useMemo(
      () => _.map((r) => ({ ...r, left: xScale(r.msg.tsMillis) }), reactions),
      [reactions, xScale]
    )

    const throttledMouseMove = useThrottle((ev) => {
      const overlayEl = overlayRef.current
      if (overlayEl === null) return
      const clientRect = overlayEl.getBoundingClientRect()
      const { x: mouseX, y: mouseY } = getCoordsRelativeToRect(clientRect, ev)
      // Restrict vertical area on which mouse move can trigger update to
      // reactions. Fixes this event from firing after mouse leave event and
      // not clearing promoted reaction state.
      if (mouseY < 0 || mouseY > 30) return
      const reaction = _.minBy(
        (r) => Math.abs(r.left - mouseX),
        reactionsWithPositions
      )
      const isNearMouse =
        reaction && Math.abs(reaction.left - mouseX) < X_THRESHOLD

      setReactionNearMouse(isNearMouse ? reaction : null)
      setNearbyReactions(
        isNearMouse
          ? reactionsWithPositions.reduce((acc, r) => {
              if (r.msg.ts === reaction.msg.ts) return acc
              const offsetX = mouseX - r.left
              return {
                ...acc,
                ...(Math.abs(offsetX) < 15 ? { [r.msg.ts]: { offsetX } } : {})
              }
            }, {})
          : {}
      )
    }, 50)

    return (
      <div
        className="reaction-overlay-container"
        style={{ width: parentWidth }}
      >
        <div
          ref={overlayRef}
          className="reaction-overlay"
          style={{
            width,
            left
          }}
          onMouseMove={(ev) => {
            ev.persist()
            throttledMouseMove(ev)
          }}
          onMouseLeave={() => {
            setReactionNearMouse(null)
            setNearbyReactions({})
          }}
        >
          {reactionsWithPositions.map(({ msg, left, ...rest }) => {
            const nr = nearbyReactions[msg.ts]

            return (
              <Reaction
                key={msg.ts}
                msg={msg}
                left={left - (nr ? calcPushedLeftOffset(nr) : 0)}
                promote={
                  reactionNearMouse
                    ? reactionNearMouse.msg.ts === msg.ts
                    : false
                }
                animateEmoji={animateEmoji}
                {...rest}
              />
            )
          })}
        </div>
      </div>
    )
  }
)

ReactionOverlay.displayName = 'ReactionOverlay'

export default ReactionOverlay
