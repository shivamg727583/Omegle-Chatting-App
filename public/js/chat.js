
        const input = document.querySelector('#message-input');
        const messageBox = document.querySelector('#chat-box');
        let room;
        let inputMsg;

        const socket = io();
        socket.emit('joinroom');

        socket.on('partnerjoined', (roomname) => {
            room = roomname;
            document.querySelector(".waiting_text").classList.add('hidden')

        });

        document.querySelector('#chatForm').addEventListener("submit", (event) => {
            event.preventDefault();
            const message = input.value.trim();
            if (message) {
                socket.emit('sendmessage', { room: room, message: message });
                const messageElement = document.createElement('div');
                messageElement.classList.add('bg-blue-500', 'p-2', 'rounded', 'text-white', 'self-end', 'w-fit');
                messageElement.innerHTML = message;
                messageBox.appendChild(messageElement);
                messageBox.scrollTop = messageBox.scrollHeight; 
                input.value = '';
            }
        })

        socket.on('message', (msg) => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('bg-gray-100', 'p-2', 'rounded', 'text-black', 'self-start', 'w-fit');
            messageElement.innerHTML = msg;
            messageBox.appendChild(messageElement);
            messageBox.scrollTop = messageBox.scrollHeight; 

        });

        //////////////////  WEBRTC START  //////////////////

        let localStream;
        let peerConnection;
        let remoteStream;
        let inCall = false;

        const rtcSetting = {
            "iceServers": [{ urls: "stun:stun.l.google.com:19302" }],
        }



        const initialize = async () => {

            socket.on("singlingMessage", HandleSignalingMessage)

            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                document.querySelector('#localVideo').srcObject = localStream;
                document.querySelector('#localVideo').style.display = "block";

                initiatOffer();

                inCall = true;

            } catch (error) {
                console.error('Error initializing WebRTC:', error);

            }

        }

        const initiatOffer = async () => {
            await createPeerConnection();
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('singlingMessage', {
                    room,
                    message: JSON.stringify({
                        type: 'offer',
                        offer
                    })
                });
            } catch (error) {
                console.error('Error creating offer:', error);
            }




        }

        const createPeerConnection = async () => {
            peerConnection = new RTCPeerConnection(rtcSetting);

            remoteStream = new MediaStream();
            document.querySelector("#remoteVideo").srcObject = remoteStream;
            document.querySelector("#remoteVideo").style.display = "block";

            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            peerConnection.ontrack = (event) => {
                event.streams[0].getTracks().forEach(track => {
                    remoteStream.addTrack(track);
                })
            }


            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("ICE candidate: ", event.candidate);
                    socket.emit('singlingMessage', {
                        room,
                        message: JSON.stringify({
                            type: 'candidate',
                            candidate: event.candidate
                        })
                    });
                }
            }
            peerConnection.oniceconnectionstatechange = () => {
                
                if (peerConnection.iceConnectionState === "failed") {
                    console.log("ICE connection failed");
                    inCall = false;
                    socket.emit('leave');
                }
            }
        }


        const HandleSignalingMessage = async (message) => {
            const { type, offer, candidate, answer } = JSON.parse(message);
            if (type === 'offer') handleOffer(offer);
            else if (type === 'answer') handleAnswer(answer);
            else if (type === 'candidate' && peerConnection) {
                try {
                    await peerConnection.addIceCandidate(candidate);

                } catch (error) {
                    console.log(error)
                }
            }
        }

        const handleOffer = async (offer) => {
            await createPeerConnection();
            try {
                await peerConnection.setRemoteDescription(offer);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('singlingMessage', {
                    room,
                    message: JSON.stringify({
                        type: 'answer',
                        answer
                    })
                   
                });
                inCall=true;
            } catch (error) {
                console.log('Failed to handle Offer',error);
            }
        }
      
        const handleAnswer = async (answer) => {
            try {
                await peerConnection.setRemoteDescription(answer);
                console.log("answer set");
            } catch (error) {
                console.log('Failed to handle answer',error);
            }
        }




//////////// set up ///////////
const videoBtn = document.getElementById('start-video-button');
const endBtn = document.getElementById('end-call-button');
const chatSection = document.getElementById('chat-section');
const videSection =document.getElementById('video-call-section');
const notify = document.getElementById('notify');
const notify_text = document.getElementById('notify-text');


videoBtn.addEventListener("click",()=>{
socket.emit("startVideoChat",{room})
document.getElementById('outgoing-call').classList.remove('hidden')

})
socket.on("incomingCall",()=>{
  document.getElementById('incoming-call').classList.remove('hidden')
    
})
    
document.getElementById('accept-call-button').addEventListener("click",()=>{
    videoBtn.classList.add('hidden')
    videSection.classList.remove('hidden');
document.getElementById('outgoing-call').classList.add('hidden')

    chatSection.classList.add('hidden');
    document.getElementById('incoming-call').classList.add('hidden');
    initialize();

    socket.emit("acceptCall",{room})
})
  
socket.on('callAccepted',()=>{
    document.getElementById('outgoing-call').classList.add('hidden')
    initialize();
    videoBtn.classList.add('hidden')
    videSection.classList.remove('hidden');
    chatSection.classList.add('hidden');
    document.getElementById('incoming-call').classList.add('hidden');

 
})



document.getElementById('decline-call-button').addEventListener('click',()=>{
    document.getElementById('incoming-call').classList.add('hidden');
    document.getElementById('outgoing-call').classList.add('hidden')
    socket.emit("declineCall",{room})

})

socket.on('callDeclined',()=>{
   notification('Call Declined')
    document.getElementById('incoming-call').classList.add('hidden');
    videSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
    document.getElementById('outgoing-call').classList.add('hidden')

    })


    endBtn.addEventListener("click",()=>{
        socket.emit("endCall",{room});
        videoBtn.classList.remove('hidden')
        videSection.classList.add('hidden');
        chatSection.classList.remove('hidden');
        document.getElementById('incoming-call').classList.add('hidden');
        if(peerConnection){
            peerConnection.close();
            peerConnection = null;
            localStream.getTracks().forEach(track=> track.stop());
            localStream = null;
            inCall = false;
            
            }

            console.log("End call")

        
    })


    socket.on('callEnded',()=>{
notification('Call Ended')
        videSection.classList.add('hidden');
        chatSection.classList.remove('hidden');
        videoBtn.classList.remove('hidden')
        document.getElementById('incoming-call').classList.add('hidden');

        if(peerConnection){
            peerConnection.close();
            peerConnection = null;
            localStream.getTracks().forEach(track=> track.stop());
            localStream = null;
            inCall = false;

        }

        })

      

const notification = (msg)=>{
    notify.classList.remove('hidden');
    notify_text.textContent = msg;
    setTimeout(() => {
        notify.classList.add('hidden');
        notify_text.textContent = '';
        }, 2000);

}


   