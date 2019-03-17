import { get, set } from 'idb-keyval'

const formatChannelFirstSeen = (id) => `c_${id}_ts`
const formatMsgSeen = (ts) => `m_${ts}`

export const getChannelFirstSeen = (id) => get(formatChannelFirstSeen(id))
const setChannelFirstSeen = (id, millis) =>
  set(formatChannelFirstSeen(id), millis)
export const initChannelFirstSeen = (id) =>
  getChannelFirstSeen(id).then((val) =>
    val === undefined ? setChannelFirstSeen(id, Date.now()) : null
  )

export const getMsgSeen = (ts) => get(formatMsgSeen(ts))
export const setMsgSeen = (ts) => set(formatMsgSeen(ts), true)
