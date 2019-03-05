import React, {
  useContext,
  useEffect,
  useState,
  useMemo,
  useLayoutEffect
} from 'react'
import { useSpring, animated } from 'react-spring'
import slackdown from 'slackdown'
import State from './Context'
import xss from 'xss'

import '../css/SlackMessage.scss'

const SlackMessageImage = React.memo((file) => {
  return (
    <div
      className="message-image"
      style={{
        width: file.thumb_360_w,
        height: file.thumb_360_h
      }}
    >
      <img
        src={file.thumb_720}
        width={file.thumb_360_w}
        height={file.thumb_360_h}
      />
    </div>
  )
})

SlackMessageImage.displayName = 'SlackMessageImage'

const SlackMessage = React.memo(
  ({ isVisible, msg, scheduleUpdate, onFadeOutDone }) => {
    const { text, user: userId, datetime, files = [] } = msg
    const { slack, openMessageInSlack } = useContext(State)
    const [user, setUser] = useState(null)
    const textHtml = useMemo(
      () => ({ __html: xss(slackdown.parse(text).replace(/\n/g, '<br />')) }),
      [text]
    )

    useLayoutEffect(() => {
      scheduleUpdate()
    }, [user])

    useEffect(() => {
      slack.getUserInfo(userId).then(setUser)
    }, [setUser])

    const props = useSpring({
      from: { opacity: 0 },
      to: (next) =>
        next({ opacity: isVisible && user ? 1 : 0 }).then(() => {
          if (user && !isVisible) onFadeOutDone()
        }),
      config: { duration: 125 }
    })

    return user ? (
      <animated.div className="slack-message" style={props}>
        <div className="avatar-column">
          <div className="avatar-background">
            <img
              src={user.profile.image_48}
              srcSet={`${user.profile.image_72} 2x`}
            />
          </div>
        </div>
        <div className="message-column">
          <div className="message-top-row">
            <span className="sender">{user.profile.real_name}</span>
            <span className="timestamp">{datetime.toFormat('HH:mm')}</span>
          </div>
          <div className="message-text" dangerouslySetInnerHTML={textHtml} />
          {files[0] && files[0].thumb_360 && (
            <SlackMessageImage {...files[0]} />
          )}
          <span
            className="open-in-slack"
            onClick={() => openMessageInSlack(msg)}
          >
            Open message in Slack
          </span>
        </div>
      </animated.div>
    ) : null
  }
)

SlackMessage.displayName = 'SlackMessage'

export default SlackMessage
