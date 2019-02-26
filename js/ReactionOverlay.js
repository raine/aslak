import React, { useMemo, useRef, useState, useContext } from 'react'
import { Manager, Reference, Popper } from 'react-popper'
import { scaleLinear } from 'd3-scale'
import '../css/ReactionOverlay.scss'
import * as _ from 'lodash/fp'
import SlackMessage from './SlackMessage'
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
  ({ name, count, left: leftPos, promote, channelId, msg }) => {
    const mouseEnterTimeoutRef = useRef(null)
    // const [popupVisible, setPopupVisible] = useState(/* false */ msg.slackTs === '1551011539.089100')
    const [popupVisible, setPopupVisible] = useState(false)
    const { slack, emojis } = useContext(Options)
    const emoji = fixEmojiName(name)
    const emojiUrl = emojis[emoji]
    const onMouseEnter = () => {
      mouseEnterTimeoutRef.current = setTimeout(
        () => setPopupVisible(true),
        300
      )
    }
    const onMouseLeave = () => {
      clearTimeout(mouseEnterTimeoutRef.current)
      setPopupVisible(false)
    }
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
      <Manager>
        <Reference>
          {({ ref }) => (
            <animated.div
              ref={ref}
              title={`:${emoji}:`}
              className="reaction"
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              onClick={() => openSlackMessage(slack, channelId, msg.slackTs)}
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
          )}
        </Reference>
        {popupVisible && (
          <Popper
            placement="auto"
            modifiers={{
              arrow: { enabled: false }
            }}
          >
            {({ ref, style, placement, scheduleUpdate }) => (
              <div
                ref={ref}
                style={style}
                className="popper-container"
                data-placement={placement}
              >
                <SlackMessage {...msg} scheduleUpdate={scheduleUpdate} />
              </div>
            )}
          </Popper>
        )}
      </Manager>
    )
  }
)

Reaction.displayName = 'Reaction'

const getNormalizedReactions = _.pipe([
  _.filter((msg) => msg.reactions),
  _.flatMap((msg) =>
    msg.reactions.map((reactions) => ({
      ..._.omit(['users'], reactions),
      msg
    }))
  ),
  _.filter((r) => r.count > 1),
  _.uniqBy((r) => r.msg.slackTs),
  _.sortBy((r) => r.count)
])

const getCoordsRelativeToRect = (domRect, event) => ({
  x: event.clientX - domRect.left,
  y: event.clientY - domRect.top
})

const X_THRESHOLD = 12

const ReactionOverlay = React.memo(
  ({ width, left, xDomain, messages, channelId }) => {
    const overlayRef = useRef(null)
    const xRange = [0, width]
    const xScale = scaleLinear(xDomain, xRange)
    const [reactionNearMouse, setReactionNearMouse] = useState(null)
    const [nearbyReactions, setNearbyReactions] = useState({})
    const reactions = useMemo(() => getNormalizedReactions(messages), [
      messages
    ])
    const reactionsWithPositions = useMemo(
      () => _.map((r) => ({ ...r, left: xScale(r.msg.ts) }), reactions),
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
              if (r.msg.slackTs === reaction.msg.slackTs) return acc
              const offsetX = mouseX - r.left
              return {
                ...acc,
                ...(Math.abs(offsetX) < 15
                  ? { [r.msg.slackTs]: { offsetX } }
                  : {})
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
        {reactionsWithPositions.map(({ msg, left, ...rest }) => {
          const nr = nearbyReactions[msg.slackTs]

          return (
            <Reaction
              key={msg.slackTs}
              channelId={channelId}
              msg={msg}
              left={left - (nr ? calcPushedLeftOffset(nr) : 0)}
              promote={
                reactionNearMouse
                  ? reactionNearMouse.msg.slackTs === msg.slackTs
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
