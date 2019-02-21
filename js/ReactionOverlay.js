import React, { useMemo, useRef, useState, useEffect, useContext } from 'react'
import { scaleLinear } from 'd3-scale'
import '../css/ReactionOverlay.scss'
import * as _ from 'lodash/fp'
import emojiShortcodeToChar from '../emojis.json'
import { useSpring, animated, config } from 'react-spring'
import { Options } from './Context'

const fixEmojiName = (name) =>
  name.replace(/\+/g, 'plus').replace(/::skin-tone-\d/, '')

const Reaction = React.memo(
  ({ emojis, name, count, left, promote, channelId, slackTs }) => {
    const { slack } = useContext(Options)
    const emoji = fixEmojiName(name)
    const emojiUrl = emojis[emoji]
    const props = useSpring({
      to: {
        transform: `scale(${promote ? '1.3' : '1.0'})`,
        boxShadow: promote
          ? `0px 0px 8px 1px rgba(0, 0, 0, 0.1)`
          : `0px 0px 0px 0px rgba(0, 0, 0, 0.0)`
      },
      config: { mass: 0.5, tension: 250, friction: 20 }
    })
    return (
      <animated.div
        title={`:${emoji}:`}
        className="reaction"
        onClick={() => {
          slack
            .getMessagePermaLink(channelId, slackTs)
            .then(({ permalink }) => {
              window.open(permalink, '_blank')
            })
        }}
        style={{
          left: `calc(${left}px - 12px)`,
          top: 0,
          zIndex: promote ? 1 : null,
          ...props
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
    _.map((r) => ({ ...r, left: xScale(r.x) })),
    _.sortBy((x) => x.count)
  ])(reactions)

const getCoordsRelativeToRect = ({ x, y }, event) => {
  return { x: event.clientX - x, y: event.clientY - y }
}

const ReactionOverlay = React.memo(
  ({ width, left, right, xDomain, reactions, emojis, channelId }) => {
    const overlayRef = useRef(null)
    const overlayEl = overlayRef.current
    const areaWidth = width - left - right
    const xRange = [0, areaWidth]
    const xScale = scaleLinear(xDomain, xRange)
    const [sortedReactions, setSortedReactions] = useState([])
    const [reactionNearMouse, setReactionNearMouse] = useState(null)

    useEffect(() => {
      setSortedReactions(getSortedReactions(xScale, reactions))
    }, [reactions])

    const clientRect = useMemo(
      () => (overlayEl ? overlayEl.getBoundingClientRect() : null),
      [overlayEl]
    )

    return (
      <div
        ref={overlayRef}
        className="reaction-overlay"
        style={{
          width: areaWidth,
          top: 0,
          left
        }}
        onMouseMove={(ev) => {
          const { x } = getCoordsRelativeToRect(clientRect, ev)
          const reaction = _.minBy((r) => Math.abs(r.left - x), sortedReactions)
          const isNearMouse = reaction && Math.abs(reaction.left - x) < 12
          setReactionNearMouse(isNearMouse ? reaction : null)
        }}
        onMouseLeave={() => {
          setReactionNearMouse(null)
        }}
      >
        {sortedReactions.map(({ slackTs, ...rest }) => (
          <Reaction
            key={slackTs}
            channelId={channelId}
            slackTs={slackTs}
            emojis={emojis}
            {...rest}
            promote={reactionNearMouse && reactionNearMouse.slackTs === slackTs}
          />
        ))}
      </div>
    )
  }
)

ReactionOverlay.displayName = 'ReactionOverlay'

export default ReactionOverlay
