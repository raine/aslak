import React, {
  useMemo,
  useRef,
  useState,
  useContext,
  useCallback
} from 'react'
import { scaleLinear } from 'd3-scale'
import '../css/ReactionOverlay.scss'
import * as _ from 'lodash/fp'
import emojiShortcodeToChar from '../emojis.json'
import { useSpring, animated } from 'react-spring'
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
    const { scale, left, boxShadow, opacity } = useSpring({
      to: {
        scale: promote ? 1.25 : 1.0,
        boxShadow: promote
          ? `0px 0px 8px 1px rgba(0, 0, 0, 0.2)`
          : `0px 0px 2px 1px rgba(0, 0, 0, 0.1)`,
        opacity: 1,
        left: leftPos
      },
      from: { opacity: 0 },
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
          opacity,
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

const getSortedReactions = (xScale, reactions) =>
  _.pipe([
    _.filter(({ count }) => count > 1),
    _.map((r) => ({ ...r, left: xScale(r.ts) })),
    _.sortBy((x) => x.count)
  ])(reactions)

const getCoordsRelativeToRect = (domRect, event) => ({
  x: event.clientX - domRect.left,
  y: event.clientY - domRect.top
})

const X_THRESHOLD = 12

const ReactionOverlay = React.memo(
  ({ width, left, xDomain, reactions, emojis, channelId }) => {
    const overlayRef = useRef(null)
    const overlayEl = overlayRef.current
    const xRange = [0, width]
    const xScale = scaleLinear(xDomain, xRange)
    const [reactionNearMouse, setReactionNearMouse] = useState(null)
    const [nearbyReactions, setNearbyReactions] = useState({})
    const sortedReactions = useMemo(
      () => getSortedReactions(xScale, reactions),
      [reactions, width]
    )
    const throttledMouseMove = useCallback(
      _.throttle(50, (ev) => {
        const clientRect = overlayEl.getBoundingClientRect()
        const { x: mouseX, y: mouseY } = getCoordsRelativeToRect(clientRect, ev)
        // Restrict vertical area on which mouse move can trigger update to
        // reactions. Fixes this event from firing after mouse leave event and
        // not clearing promoted reaction state.
        if (mouseY < 0 || mouseY > 30) return
        const reaction = _.minBy(
          (r) => Math.abs(r.left - mouseX),
          sortedReactions
        )
        const isNearMouse =
          reaction && Math.abs(reaction.left - mouseX) < X_THRESHOLD

        setReactionNearMouse(isNearMouse ? reaction : null)
        setNearbyReactions(
          isNearMouse
            ? sortedReactions.reduce((acc, r) => {
                if (r.slackTs === reaction.slackTs) return acc
                const offsetX = mouseX - r.left
                return {
                  ...acc,
                  ...(Math.abs(offsetX) < 12
                    ? { [r.slackTs]: { offsetX } }
                    : {})
                }
              }, {})
            : {}
        )
      }),
      [sortedReactions]
    )

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
        {sortedReactions.map(({ slackTs, left, ...rest }) => {
          const nr = nearbyReactions[slackTs]

          return (
            <Reaction
              key={slackTs}
              channelId={channelId}
              slackTs={slackTs}
              emojis={emojis}
              left={left - (nr ? calcPushedLeftOffset(nr) : 0)}
              {...rest}
              promote={
                reactionNearMouse && reactionNearMouse.slackTs === slackTs
              }
            />
          )
        })}
      </div>
    )
  }
)

ReactionOverlay.displayName = 'ReactionOverlay'

export default ReactionOverlay
