import {io} from 'socket.io-client';
const SOCKET_URL = "http://localhost:10000";
export const initSocket = async () => {
    const options = {
      'for new connection': true,
      reconnectionAttempt: 'Infinity',
      timeout: 10000,
      transports: ['websocket'],
    };
    return io(SOCKET_URL, options);
  };

  