import React, {
  useMemo,
  useRef,
  useState,
  useContext
} from 'react'
import { scaleLinear } from 'd3-scale'
import '../css/ReactionOverlay.scss'
import * as _ from 'lodash/fp'
import emojiShortcodeToChar from '../emojis.json'
import { useSpring, animated } from 'react-spring'
import { useThrottle } from 'use-lodash-debounce-throttle'
import { Options } from './Context'

const fixEmojiName = (name) =>
  name.replace(/\+/g, 'plus').replace(/::skin-tone-\d/, '')

const openSlackMessage = (slack, channelId, ts) =>
  slack.getMessagePermaLink(channelId, ts).then(({ permalink }) => {
    window.open(permalink, '_blank')
  })

const calcPushedLeftOffset = (reaction) =>
  Math.sqrt(1 / Math.abs(reaction.offsetX)) *
  15 *
  (reaction.offsetX < 0 ? -1 : 1)

const Reaction = React.memo(
  ({ emojis, name, count, left: leftPos, promote, channelId, slackTs }) => {
    const { slack } = useContext(Options)
    const emoji = fixEmojiName(name)
    const emojiUrl = emojis[emoji]
    const { scale, left, boxShadow } = useSpring({
      to: {
        scale: promote ? 1.25 : 1.0,
        boxShadow: promote
          ? `0px 0px 8px 1px rgba(0, 0, 0, 0.2)`
          : `0px 0px 2px 1px rgba(0, 0, 0, 0.1)`,
        left: leftPos
      },
      config: { mass: 0.5, tension: 250, friction: 20 }
    })
    return (
      <animated.div
        title={`:${emoji}:`}
        className="reaction"
        onClick={() => openSlackMessage(slack, channelId, slackTs)}
        style={{
          top: 0,
          left: left.interpolate((left) => `calc(${left}px - 10px)`),
          zIndex: promote ? 1 : null,
          boxShadow,
          transform: scale.interpolate((scale) => `scale(${scale})`)
        }}
      >
        <div
          className="emoji"
          style={{
            ...(emojiUrl ? { backgroundImage: `url(${emojiUrl})` } : {})
          }}
        >
          {!emojiUrl ? emojiShortcodeToChar[emoji] : null}
        </div>
        <div className="count">{count}</div>
      </animated.div>
    )
  }
)

Reaction.displayName = 'Reaction'

const getNormalizedReactions = _.pipe([
  _.filter((msg) => msg.reactions),
  _.flatMap((msg) =>
    msg.reactions.map((reactions) => ({
      ..._.omit(['users'], reactions),
      slackTs: msg.slackTs,
      ts: msg.ts.getTime()
    }))
  ),
  _.filter((r) => r.count > 1),
  _.uniqBy((r) => r.slackTs),
  _.sortBy((r) => r.count)
])

const getCoordsRelativeToRect = (domRect, event) => ({
  x: event.clientX - domRect.left,
  y: event.clientY - domRect.top
})

const X_THRESHOLD = 12

const ReactionOverlay = React.memo(
  ({ width, left, xDomain, messages, emojis, channelId }) => {
    const overlayRef = useRef(null)
    const xRange = [0, width]
    const xScale = scaleLinear(xDomain, xRange)
    const [reactionNearMouse, setReactionNearMouse] = useState(null)
    const [nearbyReactions, setNearbyReactions] = useState({})
    const reactions = useMemo(() => getNormalizedReactions(messages), [
      messages
    ])
    const reactionsWithPositions = useMemo(
      () => _.map((r) => ({ ...r, left: xScale(r.ts) }), reactions),
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
              if (r.slackTs === reaction.slackTs) return acc
              const offsetX = mouseX - r.left
              return {
                ...acc,
                ...(Math.abs(offsetX) < 15 ? { [r.slackTs]: { offsetX } } : {})
              }
            }, {})
          : {}
      )
    }, 50)

    return (
      <div
        ref={overlayRef}
        className="reaction-overlay"
        style={{
          width,
          top: 0,
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
        {reactionsWithPositions.map(({ slackTs, left, ...rest }) => {
          const nr = nearbyReactions[slackTs]

          return (
            <Reaction
              key={slackTs}
              channelId={channelId}
              slackTs={slackTs}
              emojis={emojis}
              left={left - (nr ? calcPushedLeftOffset(nr) : 0)}
              promote={
                reactionNearMouse
                  ? reactionNearMouse.slackTs === slackTs
                  : false
              }
              {...rest}
            />
          )
        })}
      </div>
    )
  }
)

ReactionOverlay.displayName = 'ReactionOverlay'

export default ReactionOverlay
