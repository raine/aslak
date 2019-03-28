import * as slack from './slack'
import React from 'react'
import { render } from 'react-dom'
import App from './App'

slack.getTokenWithCode().then((token) => {
  render(
    <App slackToken={token} />,
    document.getElementById('root')
  )
})

// // Disable HMR
// if (module.hot) {
//   module.hot.dispose(() => {
//     window.location.reload()
//   })
// }
