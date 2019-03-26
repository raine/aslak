export const pAll = Promise.all.bind(Promise)
export const pMap = (fn) => (xs) => pAll(xs.map(fn))
export const then = (fn) => (p) => p.then(fn)
