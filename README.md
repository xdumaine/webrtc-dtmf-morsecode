### What is this?

This is a simple little app that creates a WebRTC peer connection to yourself
then allows you to send a morse code message via DTMF tones.

### Huh?
Creating a peer connection (a basic webrtc connection) to yourself means that no
information or media is being sent to any third party. There isn't even a
websocket connection. Then it takes a bunch of text, converts it to morse code,
and sends it over that connection using standard telephony tones to represent
the message.

#### Credits
DTMF sending code is adapted from WebRTC Samples https://github.com/webrtc/samples/tree/gh-pages/src/content/peerconnection/dtmf

#### Browser support
This supports Chrome. I may later add a Firefox polyfill.
