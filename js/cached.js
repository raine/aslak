import lscache from 'lscache'

const cached = (key, ttl, fn) => (...args) => {
  const x = lscache.get(key)
  return x
    ? Promise.resolve(x)
    : fn(...args).then((res) => {
        lscache.set(key, res, ttl)
        return res
      })
}

export default cached
