# aslak

A dashboard that helps you find interesting content in your Slack workspace.

![](https://raine.github.io/aslak/screenshot.png)

## key features

- Graphs channel activity over time
- Highlights potentially significant or interesting messages based on their
  reaction volume
- Helps discover new channels
- No backend component: all communication is between the browser and Slack API

## local development

1. [Create a new Slack app](https://api.slack.com/apps)

   - Allow the following OAuth scopes: `channels:history`, `channels:read`,
     `emoji:read`, `users:read`
   - Set up `http://localhost:1234` as allowed OAuth redirect URI.

2. Create an `.env` file:

   ```sh
   SLACK_CLIENT_ID=<from slack app basic information page>
   SLACK_CLIENT_SECRET=<from slack app basic information page>
   SLACK_TEAM_ID=<slack workspace id>
   ```

3. Run with `yarn dev`

## deployment

**NOTE**: The dashboard uses Slack API's OAuth server-side flow to gain access
to user's Slack workspace. Being a purely client-side application, this requires
the OAuth client secret is exposed in the deployed source code. This should not
be a problem when deployed in a private environment, however, public deployment
is not feasible for that reason. A backend component that handles the creation
of OAuth access tokens against the Slack API would solve this issue.

### build the app

Follow the steps 1 and 2 under [Local development](#local-development), and then:

```
# PUBLIC_URL is for Content Security Policy and should be the location where the
# dashboard is accessed
PUBLIC_URL="https://example.com" yarn build
```
