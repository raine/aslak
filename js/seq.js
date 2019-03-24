export default function seq(x, ...fns) {
  for (let i = 0, n = fns.length; i < n; ++i) x = fns[i](x)
  return x
}
