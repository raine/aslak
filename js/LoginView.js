import React from 'react'
import * as slack from './slack'
import '../css/LoginView.scss'

const LoginView = React.memo(() => (
  <div className="login-view">
    <div className="login-box">
      <h3>aslak. a slack dashboard</h3>
      <p>
        To get started, the dashboard requires permissions to access some
        content in your Slack workspace.
      </p>
      <p>
        This app runs purely in your browser. Any data fetched from the Slack
        API stays here.
      </p>
      <div className="sign-in-with-slack">
        <a href={slack.formatOauthAuthorizeUri(slack.CLIENT_ID, slack.TEAM_ID)}>
          <img
            alt="Sign in with Slack"
            height="40"
            width="172"
            src="https://platform.slack-edge.com/img/sign_in_with_slack.png"
            srcSet="https://platform.slack-edge.com/img/sign_in_with_slack.png 1x, https://platform.slack-edge.com/img/sign_in_with_slack@2x.png 2x"
          />
        </a>
      </div>
    </div>
  </div>
))

LoginView.displayName = 'LoginView'

export default LoginView
