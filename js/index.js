import * as slack from './slack'
import React from 'react'
import { render } from 'react-dom'
import App from './App'

const renderApp = (token) =>
  render(<App slackToken={token} />, document.getElementById('root'))

const token = localStorage.getItem('token')
if (token) renderApp(token)
else slack.getTokenWithCode().then(renderApp)

// // Disable HMR
// if (module.hot) {
//   module.hot.dispose(() => {
//     window.location.reload()
//   })
// }
