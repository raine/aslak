/* global module */
import * as slack from './slack'
import React from 'react'
import { render } from 'react-dom'
import App from './App'

const token = slack.login()
if (token) {
  const client = slack.init(token)
  render(<App slack={client} />, document.getElementById('root'))
}

// // Disable HMR
// if (module.hot) {
//   module.hot.dispose(() => {
//     window.location.reload()
//   })
// }
