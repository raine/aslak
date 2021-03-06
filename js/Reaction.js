import React, { useRef, useState, useContext, useEffect } from 'react'
import { Manager, Reference, Popper } from 'react-popper'
import '../css/Reaction.scss'
import SlackMessage from './SlackMessage'
import emojiShortcodeToChar from '../emojis.json'
import { useSpring, animated } from 'react-spring'
import State from './Context'
import { getChannelFirstSeen, getMsgSeen, setMsgSeen } from './idb'

const fixEmojiName = (name) => name.replace(/::skin-tone-\d/, '')

const NewCircle = React.memo(({ show }) => (
  <animated.div
    style={useSpring({
      from: { opacity: 0 },
      to: { opacity: show ? 1 : 0 }
    })}
    className="new-circle"
  />
))

NewCircle.displayName = 'NewCircle'

const Reaction = React.memo(
  ({ name, count, left: leftPos, promote, msg, animateEmoji = false }) => {
    const mouseEnterTimeoutRef = useRef(null)
    const mouseLeaveTimeoutRef = useRef(null)
    const [showNewIndicator, setShowNewIndicator] = useState(false)
    const [showPopper, setShowPopper] = useState(false)
    const [showSlackMessage, setShowSlackMessage] = useState(false)
    const { emojis } = useContext(State)
    const emoji = fixEmojiName(name)
    const emojiUrl = emojis[emoji]
    const staticEmojiUrl = emojiUrl
      ? 'https://slack-imgs.com/?c=1&o1=gu&url=' + encodeURIComponent(emojiUrl)
      : null
    const onMouseEnter = () => {
      clearTimeout(mouseLeaveTimeoutRef.current)
      mouseEnterTimeoutRef.current = setTimeout(() => {
        setShowNewIndicator(false)
        setShowPopper(true)
        setShowSlackMessage(true)
      }, 300)
    }
    const onMouseLeave = () => {
      clearTimeout(mouseEnterTimeoutRef.current)
      mouseLeaveTimeoutRef.current = setTimeout(
        () => setShowSlackMessage(false),
        200
      )
    }
    const { scale, left, boxShadow } = useSpring({
      to: {
        scale: promote ? 1.25 : 1.0,
        boxShadow: promote
          ? `0px 0px 5px 1px rgba(0, 0, 0, 0.15)`
          : `0px 0px 2px 0px rgba(0, 0, 0, 0.2)`,
        left: leftPos
      },
      config: { mass: 0.5, tension: 250, friction: 20 }
    })

    useEffect(() => {
      Promise.all([
        getChannelFirstSeen(msg.channelId),
        getMsgSeen(msg.ts)
      ]).then(([channelFirstSeen, seen]) => {
        if (msg.tsMillis >= channelFirstSeen) {
          setShowNewIndicator(!seen)
          setMsgSeen(msg.ts)
        }
      })
    }, [])

    return (
      <React.Fragment>
        <Manager>
          <Reference>
            {({ ref }) => (
              <animated.div
                ref={ref}
                className="reaction"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{
                  top: 0,
                  left: left.interpolate((left) => `calc(${left}px - 10px)`),
                  zIndex: promote ? 1 : null,
                  boxShadow,
                  transform: scale.interpolate((scale) => `scale(${scale})`)
                }}
              >
                <NewCircle show={showNewIndicator} />
                {emojiUrl ? (
                  <div
                    className="custom-emoji"
                    style={{
                      ...(staticEmojiUrl
                        ? { backgroundImage: `url(${staticEmojiUrl})` }
                        : {})
                    }}
                  >
                    {animateEmoji ? (
                      <div
                        className="custom-emoji animated"
                        style={{
                          backgroundImage: `url(${emojiUrl})`
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
                {!emojiUrl ? (
                  <div className="char-emoji">
                    {emojiShortcodeToChar[emoji]}
                  </div>
                ) : null}
                <div className="count">{count}</div>
              </animated.div>
            )}
          </Reference>
          {showPopper && (
            <Popper
              placement="bottom"
              positionFixed
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
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                >
                  <SlackMessage
                    isVisible={showSlackMessage}
                    scheduleUpdate={scheduleUpdate}
                    onFadeOutDone={() => setShowPopper(false)}
                    msg={msg}
                  />
                </div>
              )}
            </Popper>
          )}
        </Manager>
      </React.Fragment>
    )
  }
)

Reaction.displayName = 'Reaction'

export default Reaction
