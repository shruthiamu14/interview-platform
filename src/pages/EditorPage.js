import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import Client from "../components/Client";
import Editor from "../components/Editor";
import ACTIONS from "../Actions";
import { initSocket } from "../socket";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const peerConnections = useRef({});

  useEffect(() => {
    const init = async () => {
        socketRef.current = await initSocket();
        console.log(socketRef.current);
        socketRef.current.on('connect_error', (err) => handleErrors(err));
        socketRef.current.on('connect_failed', (err) => handleErrors(err));

        // Get user media
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            console.log('Stream acquired:', stream);
            console.log('Video tracks:', stream.getVideoTracks());
        } catch (error) {
            console.error('Error accessing media devices.', error);
        }

        socketRef.current.emit(ACTIONS.JOIN, {
            roomId,
            username: location.state?.username,
        });

        // Listen for joined event
        socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
            if (username !== location.state?.username) {
                toast.success(`${username} joined the room.`);
                console.log(`${username} joined`);
            }
            setClients(clients);
            // Only send the current code to the newly joined client
            if (codeRef.current) {
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    code: codeRef.current,
                    socketId,
                });
            }
            // Create peer connections
            clients.forEach(client => {
                if (client.socketId !== socketRef.current.id) {
                    createPeerConnection(client.socketId, localStream);
                }
            });
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
            toast.success(`${username} left the room.`);
            setClients((prev) => {
                return prev.filter((client) => client.socketId !== socketId);
            });
            if (peerConnections.current[socketId]) {
                peerConnections.current[socketId].close();
                delete peerConnections.current[socketId];
            }
        });

        // Handle WebRTC signaling
        socketRef.current.on(ACTIONS.SIGNAL, async ({ socketId, signal }) => {
            console.log('Received signal from:', socketId, signal);
            if (peerConnections.current[socketId]) {
                await peerConnections.current[socketId].signal(signal);
            }
        });
    };
    init();

    return () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        }
    };
}, [location.state?.username, roomId]);

  const handleErrors = (e) => {
    console.log("socket error", e);
    toast.error("Socket connection failed, try again later");
    reactNavigator("/");
  };

  const createPeerConnection = (socketId, stream) => {
    console.log('Creating peer connection for:', socketId);
    const peer = new RTCPeerConnection();
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit(ACTIONS.SIGNAL, {
          socketId,
          signal: event.candidate,
        });
        console.log('Sending ICE candidate to:', socketId, event.candidate);
      }
    };

    peer.ontrack = (event) => {
      const remoteStream = new MediaStream();
      remoteStream.addTrack(event.track);
      console.log("Remote stream received:", remoteStream);
      setClients((prev) =>
        prev.map((client) => {
          if (client.socketId === socketId) {
            return { ...client, stream: remoteStream };
          }
          return client;
        })
      );
    };

    peerConnections.current[socketId] = peer;
  };

  const toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled =
      !localStream.getVideoTracks()[0].enabled;
    console.log('Toggled video:', localStream.getVideoTracks()[0].enabled);
  };

  const toggleAudio = () => {
    localStream.getAudioTracks()[0].enabled =
      !localStream.getAudioTracks()[0].enabled;
    console.log('Toggled audio:', localStream.getAudioTracks()[0].enabled);
  };

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the room ID");
      console.log(err);
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className='mainWrap'>
      <div className='aside'>
        <div className='asideInner'>
          <div className='logo'>
            <img className='logoImg' src='/form.png' alt='logo' />
          </div>
          <h3>Connected</h3>
          <div className='ClientsList'>
            {clients.map((client) => (
              <Client
                key={client.socketId}
                socketId={client.socketId}
                username={client.username}
                stream={client.stream || localStream}
                toggleVideo={toggleVideo}
                toggleAudio={toggleAudio} />
            ))}
          </div>
        </div>
        <button className='btn copyBtn' onClick={copyRoomId}>Copy ROOM ID</button>
        <button className='btn leaveBtn' onClick={leaveRoom}>Leave</button>
      </div>
      <div className='editorWrap'>
        <Editor socketRef={socketRef} roomId={roomId} onCodeChange={(code) => { codeRef.current = code; }} />
      </div>
    </div>
  );
  
};

export default EditorPage;
