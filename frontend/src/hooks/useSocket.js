import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      socketRef.current.emit('join', user.id);
    });

    socketRef.current.on('notification', (notification) => {
      console.log('New notification received:', notification);
      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Optionally show a toast or alert
      // if (Notification.permission === 'granted') {
      //   new Notification('ShiftSync Update', { body: notification.payload?.message });
      // }
    });

    socketRef.current.on('schedule_update', (data) => {
      console.log('Schedule update received:', data);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, queryClient]);

  return socketRef.current;
};
