/* global require, process */
const csp = require('content-security-policy-builder')
const isLocalhost = process.env.PUBLIC_URL.includes('localhost')

console.log(
  csp({
    directives: {
      defaultSrc: [
        "'self'",
        'https://apis.google.com/',
        'https://fonts.gstatic.com/',
        isLocalhost ? "'unsafe-eval'" : ''
      ],
      connectSrc: [isLocalhost ? 'ws://localhost:*' : '', 'https://slack.com'],
      imgSrc: [
        'https://*.slack-edge.com',
        'https://secure.gravatar.com',
        'https://files.slack.com',
        'https://slack-imgs.com',
        'https://i2.wp.com/*.slack-edge.com',
        process.env.PUBLIC_URL
      ],
      styleSrc: [
        'https://fonts.googleapis.com',
        process.env.PUBLIC_URL,
        // For react-virtualized-auto-sizer
        "'sha256-deDIoPlRijnpfbTDYsK+8JmDfUBmpwpnb0L/SUV8NeU='"
      ],
      objectSrc: "'none'"
    }
  })
)
