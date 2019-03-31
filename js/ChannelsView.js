import React, { Fragment, useContext, useEffect } from 'react'
import { floorInterval } from './time'
import * as _ from 'lodash/fp'
import cached from './cached'
import Controls from './Controls'
import State from './Context'
import Channels from './Channels'
import seq from './seq'

const unbind = (k) => k.offValue.bind(k)

const getChannelsByListType = (type, allChannels) =>
  // prettier-ignore
  type === 'POPULAR'   ? allChannels.slice(0, 32) :
  type === 'MEMBER_OF' ? allChannels.filter((c) => c.is_member) :
  type === 'DISCOVER'  ?
    seq(
      allChannels,
      _.filter(({ num_members, is_member }) => num_members >= 10 && !is_member),
      _.shuffle,
      _.take(32)
    )
                       : []

const ChannelsView = React.memo(({ slackClient, dispatch }) => {
  const {
    allChannels,
    messages,
    channelListType,
    timeframe,
    expand,
    interval,
    channels
  } = useContext(State)

  useEffect(() => {
    cached('emoji.list', 120, slackClient.getEmojiList)().then((emojis) =>
      dispatch('setEmojis', emojis)
    )

    cached('channels', 120, slackClient.getChannels)().then((channels) =>
      dispatch('setAllChannels', channels)
    )
  }, [])

  useEffect(() => {
    dispatch('setChannels', getChannelsByListType(channelListType, allChannels))
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
            dispatch('updateChannelMessages', [channelId, messages])
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
      <Channels
        channels={channels}
        messages={messages}
        expand={expand}
        interval={interval}
      />
    </Fragment>
  )
})

ChannelsView.displayName = 'ChannelsView'

export default ChannelsView
