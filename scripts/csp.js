/* global require */
const csp = require('content-security-policy-builder')

console.log(
  csp({
    directives: {
      defaultSrc: [
        "'self'",
        'https://apis.google.com/',
        'https://fonts.gstatic.com/'
      ],
      connectSrc: ['ws://localhost:*', 'https://slack.com'],
      imgSrc: [
        'http://localhost:*',
        'https://*.slack-edge.com',
        'https://secure.gravatar.com',
        'https://files.slack.com',
        'https://slack-imgs.com',
        'https://i2.wp.com/*.slack-edge.com;',
        'https://pages.reaktor.com'
      ],
      styleSrc: [
        'https://fonts.googleapis.com',
        'http://localhost:*',
        'https://pages.reaktor.com',
        "'sha256-deDIoPlRijnpfbTDYsK+8JmDfUBmpwpnb0L/SUV8NeU='",
      ],
      objectSrc: "'none'"
    }
  })
)
