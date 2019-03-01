import React, { useContext, useEffect, useState, useMemo } from 'react'
import { useTransition, animated } from 'react-spring'
import { DateTime } from 'luxon'
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
        src={file.thumb_360}
        width={file.thumb_360_w}
        height={file.thumb_360_h}
      />
    </div>
  )
})

SlackMessageImage.displayName = 'SlackMessageImage'

const SlackMessage = React.memo((props) => {
  const {
    text,
    user: userId,
    ts,
    scheduleUpdate,
    files = [],
    slackTs,
    channelId
  } = props
  const { slack, openMessageInSlack } = useContext(State)
  const [user, setUser] = useState(null)
  const textHtml = useMemo(
    () => ({ __html: xss(slackdown.parse(text).replace(/\n/g, '<br />')) }),
    [text]
  )
  useEffect(() => {
    scheduleUpdate()
  }, [user])
  useEffect(() => {
    slack.getUserInfo(userId).then(setUser)
  }, [setUser])
  const transitions = useTransition(user, null, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 }
  })
  return transitions.map(
    ({ item, key, props }) =>
      item && (
        <animated.div key={key} className="slack-message" style={props}>
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
              <span className="timestamp">
                {DateTime.fromJSDate(ts).toFormat('HH:mm')}
              </span>
            </div>
            <div className="message-text" dangerouslySetInnerHTML={textHtml} />
            {files[0] && files[0].thumb_360 && (
              <SlackMessageImage {...files[0]} />
            )}
            <span
              className="open-in-slack"
              onClick={() => openMessageInSlack(channelId, slackTs)}
            >
              Open message in Slack
            </span>
          </div>
        </animated.div>
      )
  )
})

SlackMessage.displayName = 'SlackMessage'

export default SlackMessage
