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
import * as _ from 'lodash/fp'
import seq from './seq'
import { pMap, then } from './promise'
import xss from 'xss'

import '../css/SlackMessage.scss'

const SlackMessageImage = React.memo((file) => {
  const isMobile = document.body.clientWidth <= 450
  let width = file.thumb_360_w
  let height = file.thumb_360_h
  const landscape = width > height
  width = isMobile && landscape ? 0.8 * width : width
  height = isMobile && landscape ? 0.8 * height : height
  return (
    <div className="message-image" style={{ width, height }}>
      <img
        src={file.thumb_720 || file.thumb_480 || file.thumb_360}
        width={width}
        height={height}
      />
    </div>
  )
})

SlackMessageImage.displayName = 'SlackMessageImage'

// slackdown returns html with user ids wrapped in <span
// class="slack-user">..</span>
const parseSlackUserIdsFromHtml = (html) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return [...doc.querySelectorAll('.slack-user')].map(
    ({ textContent }) => 'U' + textContent
  )
}

const SlackMessage = React.memo(
  ({ isVisible, msg, scheduleUpdate, onFadeOutDone }) => {
    const { text, user: userId, datetime, files = [] } = msg
    const { slackClient, openMessageInSlack } = useContext(State)
    const [mentionedUsersData, setMentionedUsersData] = useState([])
    const [user, setUser] = useState(null)
    const textHtml = useMemo(
      () =>
        xss(slackdown.parse(text).replace(/\n/g, '<br />'), {
          whiteList: {
            ...xss.whiteList,
            span: ['class'] // slackdown sets class on span
          }
        }),
      [text]
    )
    const textHtmlWithUsers = useMemo(
      () =>
        mentionedUsersData.reduce(
          (html, user) =>
            html.replace(
              new RegExp(user.id.substr(1), 'g'),
              user.profile.display_name_normalized
            ),
          textHtml
        ),
      [textHtml, mentionedUsersData]
    )

    useLayoutEffect(() => {
      scheduleUpdate()
    }, [user])

    useEffect(() => {
      slackClient.getUserInfoCached(userId).then(setUser)
    }, [setUser])

    useEffect(() => {
      seq(
        textHtml,
        parseSlackUserIdsFromHtml,
        pMap(slackClient.getUserInfoCached),
        then(setMentionedUsersData)
      )
    }, [textHtml])

    const props = useSpring({
      from: { opacity: 0 },
      to: (next) =>
        Promise.resolve()
          .then(() => next({ opacity: isVisible && user ? 1 : 0 }))
          .then(() => {
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
          <div
            className="message-text"
            dangerouslySetInnerHTML={{ __html: textHtmlWithUsers }}
          />
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
