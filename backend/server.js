import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import roomStore from './utils/roomStore.js';

dotenv.config();

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false
    },
    transports: ['polling', 'websocket'],
    pingInterval: 25000,
    pingTimeout: 60000,
});

const PORT = process.env.PORT || 5000;

// Health check route for Render / browser
app.get("/", (req, res) => {
    res.send("CodexView API running");
});

app.get("/api/ping", (req, res) => {
    res.json({ status: "OK", message: "Server running" });
});

app.use((req, res) => {
    console.log("Unhandled route:", req.path);
    res.status(404).send("Route not found");
});


// Store muted participants (audio blocked at server)
const mutedParticipants = {};
// Track self-muted participants separately (can unmute themselves)
const selfMutedParticipants = {};
// roomId -> timeout: grace period after a host disconnects (e.g. page refresh)
// before the session is actually ended for everyone else
const pendingHostEnd = {};
const HOST_DISCONNECT_GRACE_MS = Number(process.env.HOST_DISCONNECT_GRACE_MS) || 30000;

const clearPendingHostEnd = (roomId) => {
    if (pendingHostEnd[roomId]) {
        clearTimeout(pendingHostEnd[roomId]);
        delete pendingHostEnd[roomId];
    }
};

const endSession = (roomId, reason) => {
    clearPendingHostEnd(roomId);
    io.in(roomId).emit('session-ended', { reason });
    roomStore.deleteRoom(roomId);
    delete mutedParticipants[roomId];
    delete selfMutedParticipants[roomId];
};

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Connection quality tracking
    socket.on('ping', (data) => {
        socket.emit('pong', data);
    });

    // Mute participant endpoint (host mute)
    socket.on('mute-participant', async (data) => {
        const { roomId, socketId } = data;
        try {
            if (!mutedParticipants[roomId]) {
                mutedParticipants[roomId] = {};
            }
            if (!selfMutedParticipants[roomId]) {
                selfMutedParticipants[roomId] = {};
            }
            mutedParticipants[roomId][socketId] = true;
            // Clear self-mute if it exists (host-mute overrides)
            delete selfMutedParticipants[roomId][socketId];
            // Notify the muted participant
            io.to(socketId).emit('you-were-muted', { reason: 'Host muted you' });
            // Broadcast to all participants in room that this person was muted by host
            io.to(roomId).emit('participant-mute-status', { 
                participantId: socketId, 
                isSelfMuted: false, 
                isMuted: true 
            });
        } catch (error) {
            console.error('Error muting participant:', error);
        }
    });

    // Unmute participant endpoint
    socket.on('unmute-participant', async (data) => {
        const { roomId, socketId } = data;
        try {
            // Only clear host-mute, preserve self-mute state
            if (mutedParticipants[roomId]) {
                delete mutedParticipants[roomId][socketId];
            }
            // Check if user is still self-muted
            const isSelfMuted = selfMutedParticipants[roomId] && selfMutedParticipants[roomId][socketId];
            
            // Notify the unmuted participant (clearing host-mute)
            io.to(socketId).emit('you-were-unmuted', { reason: 'Host unmuted you', isSelfMuted });
            // Broadcast to all participants - preserve self-mute state
            io.to(roomId).emit('participant-mute-status', { 
                participantId: socketId, 
                isSelfMuted: !!isSelfMuted, 
                isMuted: !!isSelfMuted  // Only muted if self-muted
            });
        } catch (error) {
            console.error('Error unmuting participant:', error);
        }
    });

    // Self-mute status (when participant mutes themselves)
    socket.on('participant-self-muted', async (data) => {
        const { roomId, isMuted } = data;
        try {
            if (!selfMutedParticipants[roomId]) selfMutedParticipants[roomId] = {};
            if (!mutedParticipants[roomId]) mutedParticipants[roomId] = {};

            if (isMuted) {
                // Mark as self-muted
                selfMutedParticipants[roomId][socket.id] = true;
                mutedParticipants[roomId][socket.id] = true;
            } else {
                // Unmute: remove from both if it's self-unmute (not host-unmute)
                delete selfMutedParticipants[roomId][socket.id];
                delete mutedParticipants[roomId][socket.id];
            }

            // Broadcast to ALL participants in room (including the sender)
            io.to(roomId).emit('participant-mute-status', { 
                participantId: socket.id, 
                isSelfMuted: isMuted,
                isMuted: isMuted 
            });
        } catch (error) {
            console.error('Error broadcasting self-mute:', error);
        }
    });

    // Room creation
    socket.on('create-room', (data) => {
        const { roomId, roomName, subject, hostName } = data;
        try {
            let room = roomStore.getRoom(roomId);
            if (room) {
                socket.emit('error', 'Room already exists.');
                return;
            }
            room = roomStore.createRoom({ roomId, roomName, subject, hostSocketId: socket.id, hostName });
            socket.join(roomId);
            socket.emit('room-created', room);
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', 'Could not create room.');
        }
    });

    // Joining a room
    socket.on('join-room', (data) => {
        const { roomId, userName, wasHost } = data;
        try {
            let room = roomStore.getRoom(roomId);
            if (!room) {
                socket.emit('error', 'Room not found.');
                return;
            }

            // Check if user already exists in the room (by name) to prevent duplicates on reconnect
            const existingParticipant = room.participants.find(p => p.name === userName);
            if (existingParticipant) {
                // Update existing participant's socket ID
                existingParticipant.socketId = socket.id;
                socket.join(roomId);
                socket.emit('room-joined', room);

                // Host reconnected (e.g. page refresh) before the grace period expired
                if (existingParticipant.isHost) clearPendingHostEnd(roomId);

                // If this participant was previously muted on this room, notify them and the room
                if (mutedParticipants[roomId] && mutedParticipants[roomId][socket.id]) {
                    io.to(socket.id).emit('you-were-muted', { reason: 'Muted on rejoin' });
                    io.to(roomId).emit('participant-muted', { socketId: socket.id });
                }

                // Sync all participants to ensure everyone has correct list
                io.to(roomId).emit('sync-participants', { participants: room.participants });
                return;
            }
            
            // Check if user is rejoining as a host
            const isHost = wasHost === true;
            const newParticipant = { socketId: socket.id, name: userName, isHost };
            room.participants.push(newParticipant);

            // Host reconnected (e.g. page refresh) before the grace period expired
            if (isHost) clearPendingHostEnd(roomId);

            socket.join(roomId);
            io.to(roomId).emit('participant-joined', { room, newParticipant });
            socket.emit('room-joined', room);

            // By default self-mute new joiners so they can unmute themselves unless host blocks them
            if (!isHost) {
                if (!selfMutedParticipants[roomId]) selfMutedParticipants[roomId] = {};
                selfMutedParticipants[roomId][socket.id] = true;
                // Also add to mutedParticipants for audio blocking
                if (!mutedParticipants[roomId]) mutedParticipants[roomId] = {};
                mutedParticipants[roomId][socket.id] = true;
                // Notify the new participant that they self-muted on join
                io.to(socket.id).emit('you-were-self-muted', { reason: 'Self-muted on join' });
                // Notify everyone that this participant is self-muted in UI
                io.to(roomId).emit('participant-mute-status', { 
                    participantId: socket.id, 
                    isSelfMuted: true, 
                    isMuted: true 
                });
            }

            // Send authoritative mute status of all existing participants to the new joiner
            // Send self-muted participants
            if (selfMutedParticipants[roomId]) {
                Object.keys(selfMutedParticipants[roomId]).forEach((participantSocketId) => {
                    io.to(socket.id).emit('participant-mute-status', {
                        participantId: participantSocketId,
                        isSelfMuted: true,
                        isMuted: true
                    });
                });
            }

            // Send host-muted participants (if any were host-muted, they'd be in mutedParticipants but NOT in selfMutedParticipants)
            if (mutedParticipants[roomId]) {
                Object.keys(mutedParticipants[roomId]).forEach((participantSocketId) => {
                    // Check if this is host-muted (in mutedParticipants but NOT in selfMutedParticipants)
                    const isSelfMuted = selfMutedParticipants[roomId] && selfMutedParticipants[roomId][participantSocketId];
                    if (!isSelfMuted) {
                        io.to(socket.id).emit('participant-mute-status', {
                            participantId: participantSocketId,
                            isSelfMuted: false,
                            isMuted: true
                        });
                    }
                });
            }

            // Sync all participants to ensure everyone has correct list
            io.to(roomId).emit('sync-participants', { participants: room.participants });
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', 'Could not join room.');
        }
    });

    // Code updates
    socket.on('code-update', (data) => {
        const { roomId, content } = data;
        try {
            const room = roomStore.getRoom(roomId);
            if (room) room.codeContent = content;
            socket.to(roomId).emit('code-mirrored', content);
        } catch (error) {
            console.error('Error updating code:', error);
        }
    });

    // Language changes
    socket.on('language-change', (data) => {
        const { roomId, language } = data;
        try {
            // Update language in memory
            const room = roomStore.getRoom(roomId);
            if (room) room.language = language;

            // Determine default snippets for languages
            const defaultSnippets = {
                javascript: `// JavaScript example\nfunction greet(name) {\n  console.log('Hello, ' + name + '!');\n}\n\ngreet('World');\n`,
                python: `# Python example\ndef greet(name):\n    print(f"Hello, {name}!")\n\nif __name__ == '__main__':\n    greet('World')\n`,
                html: `<!doctype html>\n<html>\n  <head><meta charset=\"utf-8\"><title>Example</title></head>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>\n`,
                css: `/* CSS example */\nbody {\n  font-family: system-ui, sans-serif;\n  background: #fff;\n  color: #111;\n}\n`,
                cpp: `#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!\n";\n  return 0;\n}\n`
            };

            // Notify participants that language changed (include sender)
            io.to(roomId).emit('language-updated', language);

            // Current code content
            let snippetToSend = room?.codeContent || '';

            // Check if code is empty or just the default "Welcome to CodexView" template
            const isDefaultOrEmpty = !snippetToSend ||
                                     snippetToSend.toString().trim().length === 0 ||
                                     snippetToSend.includes('Welcome to CodexView') ||
                                     snippetToSend.includes('console.log("Hello World")') ||
                                     snippetToSend.includes("console.log('Hello World')");

            if (isDefaultOrEmpty) {
                const key = (language || '').toLowerCase();
                snippetToSend = defaultSnippets[key] || '';

                // Save default snippet in memory so new participants also receive it
                if (snippetToSend && room) {
                    room.codeContent = snippetToSend;
                }
            }

            // Emit a language-changed event with language and the snippet (may be empty)
            io.to(roomId).emit('language-changed', { language, snippet: snippetToSend });

            // Also ensure clients get the mirrored code content (for compatibility)
            if (snippetToSend) {
                io.to(roomId).emit('code-mirrored', snippetToSend);
            }
        } catch (error) {
            console.error('Error changing language:', error);
        }
    });

    // Client can request authoritative room state (codeContent + language)
    socket.on('request-room-state', (data) => {
        const { roomId } = data || {};
        try {
            const room = roomStore.getRoom(roomId);
            if (room) {
                io.to(socket.id).emit('room-state', {
                    codeContent: room.codeContent || '',
                    language: room.language || ''
                });
            }
        } catch (err) {
            console.error('Error handling request-room-state:', err);
        }
    });

    // Cursor movement
    socket.on('cursor-move', (data) => {
        const { roomId, selection, label } = data;
        socket.to(roomId).emit('cursor-mirrored', {
            participantId: socket.id,
            participantName: label,
            position: selection.endLineNumber ? { line: selection.endLineNumber, column: selection.endColumn } : null,
        });
    });

    // Audio chunk streaming - with mute enforcement
    socket.on('audio-chunk', (data) => {
        const { roomId, audioData, timestamp } = data;
        
        // Check if participant is muted
        if (mutedParticipants[roomId] && mutedParticipants[roomId][socket.id]) {
            console.log(`Audio from muted participant ${socket.id} in room ${roomId} - dropping audio`);
            return; // Don't broadcast muted participant's audio
        }
        
        // Broadcast audio to all other participants in the room
        socket.to(roomId).emit('audio-stream', {
            participantId: socket.id,
            audioData: audioData,
            timestamp: timestamp
        });
    });

    // Speaker status updates
    socket.on('speaker-status', (data) => {
        const { roomId, isSpeaking } = data;
        // Broadcast speaking status to all participants
        io.to(roomId).emit('participant-speaking', {
            participantId: socket.id,
            isSpeaking: isSpeaking
        });
    });

    // Remove participant
    socket.on('remove-participant', (data) => {
        const { roomId, socketId } = data;
        try {
            let room = roomStore.getRoom(roomId);
            if (room) {
                const participant = room.participants.find(p => p.socketId === socketId);
                room.participants = room.participants.filter(p => p.socketId !== socketId);

                // Notify the removed user
                io.to(socketId).emit('you-were-removed', { reason: 'Removed by host' });
                
                // Notify all users in room about removal
                io.to(roomId).emit('participant-left', { room, participantName: participant?.name, participantId: socketId });

                // Sync full participant list to all remaining users
                io.to(roomId).emit('sync-participants', { participants: room.participants });

                if (mutedParticipants[roomId]) delete mutedParticipants[roomId][socketId];
                if (selfMutedParticipants[roomId]) delete selfMutedParticipants[roomId][socketId];
            }
        } catch (error) {
            console.error('Error removing participant:', error);
        }
    });

    // User leaving room
    socket.on('leave-room', (data) => {
        const { roomId } = data;
        try {
            let room = roomStore.getRoom(roomId);
            if (room) {
                const participant = room.participants.find(p => p.socketId === socket.id);
                const participantName = participant?.name || 'Unknown';
                const isHost = participant?.isHost;

                room.participants = room.participants.filter(p => p.socketId !== socket.id);

                // If host is leaving, end the entire session for everyone
                if (isHost) {
                    endSession(roomId, 'Host ended the session');
                } else {
                    // Regular participant leaving
                    io.to(roomId).emit('participant-left', { room, participantName, participantId: socket.id });

                    // Sync full participant list to all remaining users
                    io.to(roomId).emit('sync-participants', { participants: room.participants });

                    if (mutedParticipants[roomId]) delete mutedParticipants[roomId][socket.id];
                    if (selfMutedParticipants[roomId]) delete selfMutedParticipants[roomId][socket.id];
                }

                // Remove socket from room
                socket.leave(roomId);
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        try {
            const room = roomStore.getRoomByParticipantSocketId(socket.id);
            if (room) {
                const participant = room.participants.find(p => p.socketId === socket.id);
                const wasHost = participant?.isHost;
                const roomId = room.roomId;

                room.participants = room.participants.filter(p => p.socketId !== socket.id);
                io.to(roomId).emit('participant-left', { room, participantName: participant?.name, participantId: socket.id });

                // Sync full participant list to all remaining users
                io.to(roomId).emit('sync-participants', { participants: room.participants });

                // Clean up muted participants data for this socket
                for (const rid in mutedParticipants) {
                    delete mutedParticipants[rid][socket.id];
                }
                for (const rid in selfMutedParticipants) {
                    delete selfMutedParticipants[rid][socket.id];
                }

                // The host disconnecting (closed tab, dropped connection, or a page
                // refresh) shouldn't instantly kill the session - a refresh reconnects
                // and rejoins as host within seconds via sessionStorage. Give it a grace
                // period, and only actually end things if no host has shown back up.
                if (wasHost) {
                    clearPendingHostEnd(roomId);
                    pendingHostEnd[roomId] = setTimeout(() => {
                        delete pendingHostEnd[roomId];
                        const currentRoom = roomStore.getRoom(roomId);
                        if (currentRoom && !currentRoom.participants.some(p => p.isHost)) {
                            endSession(roomId, 'Host disconnected');
                        }
                    }, HOST_DISCONNECT_GRACE_MS);
                }
            }
        } catch (error) {
            console.error('Error on disconnect:', error);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

