/* global module */
import * as slack from './slack'
import React from 'react'
import { render } from 'react-dom'
import App from './App'

slack.login().then((token) => {
  render(<App slack={slack.init(token)} />, document.getElementById('root'))
})

// // Disable HMR
// if (module.hot) {
//   module.hot.dispose(() => {
//     window.location.reload()
//   })
// }
