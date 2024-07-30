import React, { useRef, useEffect } from 'react';

const Client = ({ socketId, username, stream, toggleVideo, toggleAudio }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      console.log('Video element updated with stream:', stream);
    } else {
      console.log('Video element or stream is not available:', videoRef.current, stream);
    }
  }, [stream]);

  return (
    <div className="client">
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: 'auto' }}></video>
      <div className="controls">
        <button onClick={toggleVideo}>Toggle Video</button>
        <button onClick={toggleAudio}>Toggle Audio</button>
      </div>
      <p>{username}</p>
    </div>
  );
};

export default Client;
