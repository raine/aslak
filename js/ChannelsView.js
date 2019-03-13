import React, { Fragment, useContext, useEffect } from 'react'
import { floorInterval } from './time'
import * as _ from 'lodash/fp'
import cached from './cached'
import Controls from './Controls'
import State from './Context'
import Channels from './Channels'

const unbind = (k) => k.offValue.bind(k)
const DEFAULT_MESSAGES = []
const updateChannelMessages = (id, channelMessages) => (messages) => ({
  ...messages,
  [id]: _.uniqBy(
    (m) => m.ts,
    (messages[id] || DEFAULT_MESSAGES).concat(channelMessages)
  )
})

const getChannelsByListType = (type, allChannels) =>
  // prettier-ignore
  type === 'POPULAR'   ? allChannels.slice(0, 32) :
  type === 'MEMBER_OF' ? allChannels.filter((c) => c.is_member) : []

const ChannelsView = React.memo(
  ({
    channels,
    setMessages,
    messages,
    slackClient,
    dispatch,
    allChannels,
    setAllChannels,
    setChannels
  }) => {
    const { channelListType, timeframe, expand, interval } = useContext(State)

    useEffect(() => {
      cached('emoji.list', 120, slackClient.getEmojiList)().then((emojis) =>
        dispatch({ type: 'setEmojis', value: emojis })
      )

      cached('channels', 120, slackClient.getChannels)().then(setAllChannels)
    }, [])

    useEffect(() => {
      setChannels(getChannelsByListType(channelListType, allChannels))
    }, [channelListType, allChannels])

    useEffect(
      () =>
        unbind(
          slackClient
            .streamChannelsHistoryCached(
              { oldest: floorInterval(5, interval.start).toSeconds() },
              channels
            )
            .onValue(([channelId, messages]) => {
              setMessages(updateChannelMessages(channelId, messages))
            })
        ),
      [channels, timeframe]
    )

    return (
      <Fragment>
        <Controls
          {...{
            channelListType,
            timeframe,
            dispatch,
            expand
          }}
        />
        {channels.length > 0 && (
          <Channels channels={channels} messages={messages} expand={expand} />
        )}
      </Fragment>
    )
  }
)

ChannelsView.displayName = 'ChannelsView'

export default ChannelsView
