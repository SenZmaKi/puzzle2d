import { io } from 'socket.io-client';
import createLogger from './logger';

const log = createLogger('Socket');
const URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
const socket = io(URL, { autoConnect: false });

socket.on('connect', () => log.info('Connected', { id: socket.id }));
socket.on('disconnect', (reason) => log.warn('Disconnected', { reason }));
socket.on('connect_error', (err) => log.error('Connection error', { error: err.message }));

export default socket;
