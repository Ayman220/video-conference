import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button, Badge, Modal } from '../components/ui';
import { 
  FiMic, 
  FiMicOff, 
  FiVideo, 
  FiVideoOff, 
  FiPhone, 
  FiMessageSquare, 
  FiUsers, 
  FiSettings,
  FiShare,
  FiCopy
} from 'react-icons/fi';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

const Meeting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  
  // Get URL parameters for guest access
  const urlParams = new URLSearchParams(location.search);
  const isGuest = urlParams.get('guest') === 'true';
  const guestName = urlParams.get('name') || 'Guest';

  // Debug: Log guest detection, auth state, and URL
  console.log('Meeting page loaded. isGuest:', isGuest, 'isAuthenticated:', isAuthenticated, 'location.search:', location.search, 'URL:', window.location.href);
  
  // State
  const [meeting, setMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peers, setPeers] = useState({});
  const [socket, setSocket] = useState(null);

  // Refs
  const screenShareRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peersRef = useRef({});
  const myUserId = useRef(null); // Track current user's userId
  const pendingPeers = useRef([]); // Queue for user-joined events when localStream is not ready
  const localStreamRef = useRef(null); // Ref for latest localStream

  // Fetch meeting details
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        if (isGuest) {
          // For guests, use the public endpoint for meeting ID
          const response = await api.get(`/meetings/guest/${id}`);
          setMeeting(response.data.meeting);
        } else {
          // For authenticated users, use the protected endpoint
          const response = await api.get(`/meetings/${id}`);
          setMeeting(response.data.meeting);
        }
      } catch (error) {
        console.error('Failed to fetch meeting:', error);
        toast.error('Failed to load meeting');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchMeeting();
    }
  }, [id, navigate, isGuest, isAuthenticated]);

  // Update peers ref when peers state changes
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // Initialize WebRTC
  useEffect(() => {
    if (!meeting) return;

    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled,
          audio: isAudioEnabled
        });
        
        setLocalStream(stream);
        localStreamRef.current = stream;
        console.log('[DEBUG] localStream set:', stream);
        
        // Set local video stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Process any pending peers
        if (pendingPeers.current.length > 0) {
          pendingPeers.current.forEach(({ userId, username, isGuest }) => {
            console.log('[DEBUG] Processing pending peer after localStream ready:', userId);
            // Only create a peer as initiator if the joining user is NOT you
            if (userId === myUserId.current) return;
            if (peersRef.current[userId]) return;
            const peer = new Peer({
              initiator: true,
              trickle: false,
              stream: stream
            });
            peer.on('signal', (data) => {
              console.log('[DEBUG] Peer signal event (offer) for', userId, data);
              if (socket) {
                console.log('Sending offer to:', userId, data);
                socket.emit('offer', { to: userId, offer: data });
              }
            });
            peer.on('stream', (remoteStream) => {
              console.log('Received remote stream from:', userId);
              setRemoteStreams(prev => ({ ...prev, [userId]: remoteStream }));
            });
            setPeers(prev => {
              const newPeers = { ...prev, [userId]: peer };
              peersRef.current = newPeers;
              return newPeers;
            });
            setParticipants(prev => prev.some(p => p.id === userId) ? prev : [...prev, { id: userId, name: username, isGuest: isGuest, isCurrentUser: false }]);
          });
          pendingPeers.current = [];
        }
        
        // Connect to signaling server
        const userId = isGuest ? `guest-${Date.now()}` : `user-${Date.now()}`;
        myUserId.current = userId; // Store current user's userId
        const userName = isGuest ? guestName : (user?.name || 'User');
        // Debug: Log userName and user object before socket connection
        console.log('Connecting socket with userName:', userName, 'user:', user);
        
        // Use meeting.id from the fetched meeting data to ensure consistency
        const meetingId = meeting.id;
        console.log('Connecting to socket with meeting ID:', meetingId);
        
        const newSocket = io(window.APP_CONFIG?.SOCKET_URL || process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
          query: { 
            meetingId: meetingId, 
            userId: userId,
            userName: userName,
            isGuest: isGuest
          }
        });
        
        // Wait for socket connection before setting up handlers
        newSocket.on('connect', () => {
          console.log('Connected to signaling server for meeting:', meetingId);

          // Handle existing users (for new joiner)
          newSocket.on('existing-users', ({ users }) => {
            console.log('Existing users in meeting:', users);
            // Only update participants list for UI, do not create Peers here
            setParticipants(prev => {
              const newParticipants = [...prev];
              users.forEach(existingUser => {
                // existingUser can be a string (userId) or an object with id/name
                let userId, userName, isGuest;
                if (typeof existingUser === 'object') {
                  userId = existingUser.id;
                  userName = existingUser.name || 'Participant';
                  isGuest = existingUser.isGuest;
                } else {
                  userId = existingUser;
                  userName = 'Participant';
                  isGuest = true;
                }
                if (!newParticipants.some(p => p.id === userId)) {
                  newParticipants.push({ id: userId, name: userName, isGuest: isGuest, isCurrentUser: false });
                }
              });
              return newParticipants;
            });
          });

          // Socket event handlers - define inline to avoid circular dependencies
          newSocket.on('user-joined', ({ userId, username, isGuest }) => {
            console.log('[DEBUG] user-joined handler called:', { userId, username, isGuest });
            console.log('[DEBUG] localStream value in user-joined handler:', localStreamRef.current);
            setParticipants(prev => {
              // Update or add the participant with the correct name
              const exists = prev.some(p => p.id === userId);
              if (exists) {
                return prev.map(p => p.id === userId ? { ...p, name: username, isGuest } : p);
              } else {
                return [...prev, { id: userId, name: username, isGuest, isCurrentUser: false }];
              }
            });
            if (!localStreamRef.current) {
              console.warn('[DEBUG] localStream not ready in user-joined handler, queueing peer for', userId);
              pendingPeers.current.push({ userId, username, isGuest });
              // If localStream is now available, process the queue immediately
              if (localStreamRef.current) {
                while (pendingPeers.current.length > 0) {
                  const { userId: queuedId, username: queuedName, isGuest: queuedGuest } = pendingPeers.current.shift();
                  console.log('[DEBUG] Processing pending peer after localStream ready (immediate):', queuedId);
                  if (queuedId === myUserId.current) continue;
                  if (peersRef.current[queuedId]) continue;
                  const peer = new Peer({
                    initiator: true,
                    trickle: false,
                    stream: localStreamRef.current
                  });
                  peer.on('signal', (data) => {
                    console.log('[DEBUG] Peer signal event (offer) for', queuedId, data);
                    if (socket) {
                      console.log('Sending offer to:', queuedId, data);
                      socket.emit('offer', { to: queuedId, offer: data });
                    }
                  });
                  peer.on('stream', (remoteStream) => {
                    console.log('Received remote stream from:', queuedId);
                    setRemoteStreams(prev => ({ ...prev, [queuedId]: remoteStream }));
                  });
                  setPeers(prev => {
                    const newPeers = { ...prev, [queuedId]: peer };
                    peersRef.current = newPeers;
                    return newPeers;
                  });
                  setParticipants(prev => prev.some(p => p.id === queuedId) ? prev : [...prev, { id: queuedId, name: queuedName, isGuest: queuedGuest, isCurrentUser: false }]);
                }
              }
              return;
            }

            // Only create a peer as initiator if the joining user is NOT you
            if (userId === myUserId.current) return;

            // Prevent duplicate peers
            if (peersRef.current[userId]) {
              console.log('[DEBUG] Peer already exists for', userId);
              return;
            }

            console.log('[DEBUG] Creating Peer as initiator for', userId);
            const peer = new Peer({
              initiator: true,
              trickle: false,
              stream: localStreamRef.current
            });

            peer.on('signal', (data) => {
              console.log('[DEBUG] Peer signal event (offer) for', userId, data);
              if (newSocket) {
                console.log('Sending offer to:', userId, data);
                newSocket.emit('offer', { to: userId, offer: data });
              }
            });

            peer.on('stream', (stream) => {
              console.log('Received remote stream from:', userId);
              setRemoteStreams(prev => ({ ...prev, [userId]: stream }));
            });

            setPeers(prev => {
              const newPeers = { ...prev, [userId]: peer };
              peersRef.current = newPeers;
              return newPeers;
            });
            setParticipants(prev => prev.some(p => p.id === userId) ? prev : [...prev, { id: userId, name: username, isGuest: isGuest, isCurrentUser: false }]);
          });

          newSocket.on('offer', ({ from, offer }) => {
            console.log('[DEBUG] Received offer from:', from, offer);
            if (!localStreamRef.current) {
              console.warn('[DEBUG] localStream not ready in offer handler, skipping Peer creation for', from);
              return;
            }

            // Prevent duplicate peers
            let peer = peersRef.current[from];
            if (!peer) {
              console.log('[DEBUG] Creating Peer as non-initiator for', from);
              peer = new Peer({
                initiator: false,
                trickle: false,
                stream: localStreamRef.current
              });

              peer.on('signal', (data) => {
                console.log('[DEBUG] Peer signal event (answer) for', from, data);
                if (newSocket) {
                  console.log('Sending answer to:', from, data);
                  newSocket.emit('answer', { to: from, answer: data });
                }
              });

              peer.on('stream', (stream) => {
                console.log('[DEBUG] Received remote stream from:', from, stream);
                setRemoteStreams(prev => ({ ...prev, [from]: stream }));
              });

              setPeers(prev => {
                const newPeers = { ...prev, [from]: peer };
                peersRef.current = newPeers;
                return newPeers;
              });
            }
            peer.signal(offer);
          });

          newSocket.on('answer', ({ from, answer }) => {
            console.log('Received answer from:', from, answer);
            if (peersRef.current[from] && peersRef.current[from].signal) {
              peersRef.current[from].signal(answer);
            }
          });

          newSocket.on('ice-candidate', ({ from, candidate }) => {
            console.log('Received ICE candidate from:', from, candidate);
            if (peersRef.current[from] && peersRef.current[from].signal) {
              peersRef.current[from].signal(candidate);
            }
          });

          console.log('Joining meeting room:', meetingId);
          newSocket.emit('join-meeting', { meetingId: meetingId });
          
          // Debug: Check active meetings
          setTimeout(() => {
            newSocket.emit('debug-meetings');
          }, 1000);
          
          // Add current user to participants list
          setParticipants(prev => prev.some(p => p.id === userId) ? prev : [...prev, { 
            id: userId, 
            name: userName, 
            isGuest: isGuest,
            isCurrentUser: true 
          }]);
        });
        
        setSocket(newSocket);

        return () => {
          // Cleanup function
          if (stream) {
            stream.getTracks().forEach(track => {
              track.stop();
              console.log('Stopped track:', track.kind);
            });
          }
          if (newSocket) {
            newSocket.disconnect();
          }
        };
      } catch (error) {
        console.error('Failed to access media devices:', error);
        toast.error('Failed to access camera/microphone');
      }
    };

    const cleanup = initializeMedia();
    
    // Return cleanup function
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [meeting, isVideoEnabled, isAudioEnabled, isGuest, guestName, user]);

  // Process pending peers when localStream becomes available
  useEffect(() => {
    console.log('[DEBUG] useEffect for localStream fired. localStream:', localStream, 'pendingPeers:', pendingPeers.current);
    if (localStreamRef.current && pendingPeers.current.length > 0) {
      pendingPeers.current.forEach(({ userId, username, isGuest }) => {
        console.log('[DEBUG] Processing pending peer after localStream ready (useEffect):', userId);
        if (userId === myUserId.current) return;
        if (peersRef.current[userId]) return;
        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: localStreamRef.current
        });
        peer.on('signal', (data) => {
          console.log('[DEBUG] Peer signal event (offer) for', userId, data);
          if (socket) {
            console.log('Sending offer to:', userId, data);
            socket.emit('offer', { to: userId, offer: data });
          }
        });
        peer.on('stream', (remoteStream) => {
          console.log('Received remote stream from:', userId);
          setRemoteStreams(prev => ({ ...prev, [userId]: remoteStream }));
        });
        setPeers(prev => {
          const newPeers = { ...prev, [userId]: peer };
          peersRef.current = newPeers;
          return newPeers;
        });
        setParticipants(prev => prev.some(p => p.id === userId) ? prev : [...prev, { id: userId, name: username, isGuest: isGuest, isCurrentUser: false }]);
      });
      pendingPeers.current = [];
    }
  }, [localStream]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      console.log('[DEBUG] Meeting component unmounted, cleaning up...');
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Handle page unload (browser back/close)
    const handleBeforeUnload = () => {
      console.log('Page unloading, cleaning up media streams...');
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track on page unload:', track.kind);
        });
      }
      
      // Stop screen share if active
      if (isScreenSharing && screenShareRef.current) {
        const screenTracks = screenShareRef.current.getTracks();
        screenTracks.forEach(track => {
          track.stop();
          console.log('Stopped screen share track on page unload:', track.kind);
        });
      }
      
      // Destroy all peer connections
      Object.values(peers).forEach(peer => {
        if (peer && typeof peer.destroy === 'function') {
          peer.destroy();
        }
      });
      
      // Disconnect socket
      if (socket) {
        socket.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Ensure all media streams are stopped when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track on unmount:', track.kind);
        });
      }
      
      // Stop all peer connections
      Object.values(peers).forEach(peer => {
        if (peer && typeof peer.destroy === 'function') {
          peer.destroy();
        }
      });
      
      // Disconnect socket
      if (socket) {
        socket.disconnect();
      }
    };
  }, [localStream, peers, socket, isScreenSharing, screenShareRef]);

  // Media controls
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio track enabled:', audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video track enabled:', videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        // Store screen stream reference for cleanup
        screenShareRef.current = screenStream;
        
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = Object.values(peers).find(peer => peer.getSenders)?.getSenders()
          .find(s => s.track?.kind === 'video');
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        setLocalStream(screenStream);
        localStreamRef.current = screenStream; // Update ref
        setIsScreenSharing(true);
        
        videoTrack.onended = () => {
          console.log('Screen share ended by user');
          toggleScreenShare();
        };
      } else {
        // Stop screen share stream
        if (screenShareRef.current) {
          screenShareRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped screen share track:', track.kind);
          });
          screenShareRef.current = null;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isAudioEnabled
        });
        
        const videoTrack = stream.getVideoTracks()[0];
        const sender = Object.values(peers).find(peer => peer.getSenders)?.getSenders()
          .find(s => s.track?.kind === 'video');
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        setLocalStream(stream);
        localStreamRef.current = stream; // Update ref
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Screen share error:', error);
      toast.error('Failed to toggle screen sharing');
    }
  };

  const leaveMeeting = () => {
    console.log('Leaving meeting, cleaning up media streams...');
    
    // Stop all local media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped local track:', track.kind);
      });
      setLocalStream(null);
    }
    
    // Stop screen share if active
    if (isScreenSharing && screenShareRef.current) {
      const screenTracks = screenShareRef.current.getTracks();
      screenTracks.forEach(track => {
        track.stop();
        console.log('Stopped screen share track:', track.kind);
      });
      setIsScreenSharing(false);
    }
    
    // Destroy all peer connections
    Object.values(peers).forEach(peer => {
      if (peer && typeof peer.destroy === 'function') {
        peer.destroy();
        console.log('Destroyed peer connection');
      }
    });
    setPeers({});
    
    // Clear remote streams
    setRemoteStreams({});
    
    // Disconnect socket
    if (socket) {
      if (meeting && meeting.id) {
        socket.emit('leave-meeting', { meetingId: meeting.id });
      }
      socket.disconnect();
      setSocket(null);
    }
    
    // Clear video refs
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    Object.values(remoteVideosRef.current).forEach(videoRef => {
      if (videoRef) {
        videoRef.srcObject = null;
      }
    });
    remoteVideosRef.current = {};
    
    console.log('Meeting cleanup completed');
    navigate('/dashboard');
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Joining meeting...</p>
        </div>
      </div>
    );
  }
  console.log("Meeting:", meeting);
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">{meeting?.title || 'Meeting'}</h1>
          <Badge variant="primary">Live</Badge>
          <span className="text-sm text-gray-300">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + '/join/' + meeting.meetingLink);
              toast.success('Meeting link copied!');
            }}
            className="text-white border-gray-600 hover:bg-gray-700"
            title="Copy meeting link"
          >
            <FiCopy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            <FiUsers className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            <FiMessageSquare className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            <FiSettings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            {isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <div className="text-center text-gray-400">
                  <FiVideoOff className="w-12 h-12 mx-auto mb-2" />
                  <p>Camera Off</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              You
            </div>
          </div>

          {/* Remote Videos or Placeholders for All Other Participants */}
          {participants
            .filter(p => !p.isCurrentUser)
            .map(participant => (
              <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                {remoteStreams[participant.id] ? (
                  <video
                    ref={el => {
                      if (el) {
                        el.srcObject = remoteStreams[participant.id];
                        remoteVideosRef.current[participant.id] = el;
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-700">
                    <div className="text-center text-gray-400">
                      <FiVideoOff className="w-12 h-12 mx-auto mb-2" />
                      <p>Waiting for video...</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {participant.name || 'Participant'}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={isAudioEnabled ? "outline" : "danger"}
            size="lg"
            onClick={toggleAudio}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            {isAudioEnabled ? <FiMic className="w-5 h-5" /> : <FiMicOff className="w-5 h-5" />}
          </Button>
          
          <Button
            variant={isVideoEnabled ? "outline" : "danger"}
            size="lg"
            onClick={toggleVideo}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            {isVideoEnabled ? <FiVideo className="w-5 h-5" /> : <FiVideoOff className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={toggleScreenShare}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            <FiShare className="w-5 h-5" />
          </Button>
          
          <Button
            variant="danger"
            size="lg"
            onClick={leaveMeeting}
          >
            <FiPhone className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Participants Panel */}
      <Modal
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        title="Participants"
        size="sm"
      >
        <div className="space-y-2">
          {participants.map(participant => (
            <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="font-medium">
                {participant.isCurrentUser ? "You" : participant.name}
              </span>
              {participant.isCurrentUser ? (
                <Badge variant="primary">Host</Badge>
              ) : (
                <Badge variant="success">Online</Badge>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Chat Panel */}
      <Modal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        title="Chat"
        size="md"
      >
        <div className="h-64 flex flex-col">
          <div className="flex-1 bg-gray-50 rounded p-4 mb-4 overflow-y-auto">
            <p className="text-sm text-gray-500 text-center">Chat functionality coming soon...</p>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button variant="primary" size="sm">
              Send
            </Button>
          </div>
        </div>
      </Modal>

      {/* Settings Panel */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Camera
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>Default Camera</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Microphone
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>Default Microphone</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Meeting; 