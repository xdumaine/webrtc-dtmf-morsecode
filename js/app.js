/*
*  Copyright (c) Xander Dumaine2015
*   as a derivitive work from The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

const callButton = document.querySelector('#call');
const sendButton = document.querySelector('#send');
const hangupButton = document.querySelector('#hangup');

callButton.disabled = !RTCPeerConnection;
sendButton.disabled = true;
hangupButton.disabled = true;

if (!RTCPeerConnection) {
    alert(`Sorry, you won't be able to send messages, but you can still
    translate text to morse code`);
}

callButton.onclick = call;
sendButton.onclick = handleSendMessageClick;
hangupButton.onclick = hangup;

const messageInput = document.querySelector('input#message');
const messageOutput = document.querySelector('div#morsecode');

messageInput.onkeyup = function() {
    const value = messageInput.value;
    const morseCode = morseify(value);
    messageOutput.innerHTML = morseCode.join(' ');
}

function handleSendMessageClick() {
    sendMessage(messageInput.value);
}

const audio = document.querySelector('audio');

let pc1;
let pc2;
let localStream;
let dtmfSender;

const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 0
};
let morseCode = {
    'a': '.-',
    'b': '-...',
    'c': '-.-.',
    'd': '-..',
    'e': '.',
    'f': '..-.',
    'g': '--.',
    'h': '....',
    'i': '..',
    'j': '.---',
    'k': '-.-',
    'l': '.-..',
    'm': '--',
    'n': '-.',
    'o': '---',
    'p': '.--.',
    'q': '--.-',
    'r': '.-.',
    's': '...',
    't': '-',
    'u': '..-',
    'v': '...-',
    'w': '.--',
    'x': '-..-',
    'y': '-.--',
    'z': '--..',
    '0': '-----',
    '1': '.----',
    '2': '..---',
    '3': '...--',
    '4': '....-',
    '5': '.....',
    '6': '-....',
    '7': '--...',
    '8': '---..',
    '9': '----.',
    '.': '.-.-.-',
    ',': '--..--',
    ':': '---...',
    '?': '..--..',
    '\'': '.----.',
    '-': '-....-',
    '/': '-..-.',
    '(': '-.--.-',
    ')': '-.--.-',
    '"': '.-..-.',
    '@': '.--.-.',
    '=': '-...-',
    ' ': '/'
}

function morseify (string) {
    string = string.toLowerCase().replace(/[^a-z0-9,\.:\?\/\-\(\)"@=\s]/g, '');
    let output = [];
    for (let i = 0; i < string.length; i++) {
        output.push(morseCode[string.charAt(i)]);
    }
    return output;
}

function gotStream(stream) {
    trace('Received local stream');
    localStream = stream;
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length > 0) {
        trace('Using Audio device: ' + audioTracks[0].label);
    }
    pc1.addStream(localStream);
    trace('Adding Local Stream to peer connection');
    pc1.createOffer(gotDescription1, onCreateSessionDescriptionError, offerOptions);
}

function onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
}

function call() {
    trace('Starting call');
    let servers = null;
    const pcConstraints = {
        'optional': []
    };
    pc1 = new RTCPeerConnection(servers, pcConstraints);
    trace('Created local peer connection object pc1');
    pc1.onicecandidate = iceCallback1;
    pc2 = new RTCPeerConnection(servers, pcConstraints);
    trace('Created remote peer connection object pc2');
    pc2.onicecandidate = iceCallback2;
    pc2.onaddstream = gotRemoteStream;

    trace('Requesting local stream');
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
    })
    .then(gotStream)
    .catch(function(e) {
        alert('getUserMedia() error: ' + e.name);
    });

    callButton.disabled = true;
    hangupButton.disabled = false;
    sendButton.disabled = false;
}

function gotDescription1(desc) {
    pc1.setLocalDescription(desc);
    trace('Offer from pc1 \n' + desc.sdp);
    pc2.setRemoteDescription(desc);
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio.
    pc2.createAnswer(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription2(desc) {
    if (window.chrome) {
        // Setting PCMU as the preferred codec.
        desc.sdp = desc.sdp.replace(/m=.*\r\n/, 'm=audio 1 RTP/SAVPF 0 126\r\n');
        // Workaround for issue 1603.
        desc.sdp = desc.sdp.replace(/.*fmtp.*\r\n/g, '');
    }
    pc2.setLocalDescription(desc);
    trace('Answer from pc2: \n' + desc.sdp);
    pc1.setRemoteDescription(desc);
}

function hangup() {
    trace('Ending call');
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
    localStream = null;
    dtmfSender = null;
    callButton.disabled = false;
    hangupButton.disabled = true;
    sendButton.disabled = true;
}

function gotRemoteStream(e) {
    console.log('did not get remote stream');
    audio.srcObject = e.stream;
    trace('Received remote stream');
    if (pc1.createDTMFSender) {
        enableDtmfSender();
    } else {
        console.log('something broke');
        alert(
            'This demo requires the RTCPeerConnection method createDTMFSender() ' +
            'which is not support by this browser.'
        );
    }
}

function iceCallback1(event) {
    if (event.candidate) {
        pc2.addIceCandidate(new RTCIceCandidate(event.candidate),
        onAddIceCandidateSuccess, onAddIceCandidateError);
        trace('Local ICE candidate: \n' + event.candidate.candidate);
    }
}

function iceCallback2(event) {
    if (event.candidate) {
        pc1.addIceCandidate(new RTCIceCandidate(event.candidate),
        onAddIceCandidateSuccess, onAddIceCandidateError);
        trace('Remote ICE candidate: \n ' + event.candidate.candidate);
    }
}

function onAddIceCandidateSuccess() {
    trace('AddIceCandidate success');
}

function onAddIceCandidateError(error) {
    trace('Failed to add Ice Candidate: ' + error.toString());
}

function enableDtmfSender() {
    if (localStream !== null) {
        const localAudioTrack = localStream.getAudioTracks()[0];
        dtmfSender = pc1.createDTMFSender(localAudioTrack);
        trace('Created DTMFSender:\n');
    } else {
        trace('No local stream to create DTMF Sender\n');
    }
}

function sendNextTone(tones) {
    if (tones.length === 0) {
        return;
    }
    const tone = tones.shift();
    if (!tone.space) {
        dtmfSender.insertDTMF([tone.tone], tone.duration, tone.delay);
    } else {
        tone.duration = 1500;
    }
    setTimeout(function () {
        sendNextTone(tones);
    }, tone.delay + tone.duration);
}

function sendMessage(message) {
    if (dtmfSender) {
        const morse = morseify(message);
        const tones = [];
        morse.forEach((code) => {
            console.log('sending code', code);
            for (let i = 0; i < code.length; i++) {
                const char = code.charAt(i);
                let duration = char === '.' ? 100 : 300;
                tones.push({
                    tone: 8,
                    duration: duration,
                    delay: 50,
                    space: char === '/'
                });
            }
        });
        sendNextTone(tones);
    }
}
