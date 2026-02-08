import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import Room from './models/Room.js';

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

connectDB();

const PORT = process.env.PORT || 5000;

// Health check route for Render / browser
app.get("/", (req, res) => {
    res.send("CodexView API running");
});

app.get("/api/ping", (req, res) => {
    res.json({ status: "OK", message: "MongoDB connected" });
});

app.use((req, res) => {
    console.log("Unhandled route:", req.path);
    res.status(404).send("Route not found");
});


// Store muted participants
const mutedParticipants = {};

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Connection quality tracking
    socket.on('ping', (data) => {
        socket.emit('pong', data);
    });

    // Mute participant endpoint
    socket.on('mute-participant', async (data) => {
        const { roomId, socketId } = data;
        try {
            if (!mutedParticipants[roomId]) {
                mutedParticipants[roomId] = {};
            }
            mutedParticipants[roomId][socketId] = true;
            // Notify the muted participant
            io.to(socketId).emit('you-were-muted', { reason: 'Host muted you' });
            // Broadcast to all participants in room that this person was muted
            io.to(roomId).emit('participant-muted', { socketId });
        } catch (error) {
            console.error('Error muting participant:', error);
        }
    });

    // Unmute participant endpoint
    socket.on('unmute-participant', async (data) => {
        const { roomId, socketId } = data;
        try {
            if (mutedParticipants[roomId]) {
                delete mutedParticipants[roomId][socketId];
            }
            // Notify the unmuted participant
            io.to(socketId).emit('you-were-unmuted', { reason: 'Host unmuted you' });
            // Broadcast to all participants in room that this person was unmuted
            io.to(roomId).emit('participant-unmuted', { socketId });
        } catch (error) {
            console.error('Error unmuting participant:', error);
        }
    });

    // Self-mute status (when participant mutes themselves)
    socket.on('participant-self-muted', async (data) => {
        const { roomId, isMuted } = data;
        try {
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
    socket.on('create-room', async (data) => {
        const { roomId, roomName, subject, hostName } = data;
        try {
            let room = await Room.findOne({ roomId });
            if (room) {
                socket.emit('error', 'Room already exists.');
                return;
            }
            room = new Room({
                roomId,
                roomName,
                subject,
                participants: [{ socketId: socket.id, name: hostName, isHost: true }],
            });
            await room.save();
            socket.join(roomId);
            socket.emit('room-created', room);
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', 'Could not create room.');
        }
    });

    // Joining a room
    socket.on('join-room', async (data) => {
        const { roomId, userName, wasHost } = data;
        try {
            let room = await Room.findOne({ roomId });
            if (!room) {
                socket.emit('error', 'Room not found.');
                return;
            }
            
            // Check if user already exists in the room (by name) to prevent duplicates on reconnect
            const existingParticipant = room.participants.find(p => p.name === userName);
            if (existingParticipant) {
                // Update existing participant's socket ID
                existingParticipant.socketId = socket.id;
                await room.save();
                socket.join(roomId);
                socket.emit('room-joined', room);
                // Sync all participants to ensure everyone has correct list
                io.to(roomId).emit('sync-participants', { participants: room.participants });
                return;
            }
            
            // Check if user is rejoining as a host
            const isHost = wasHost === true;
            const newParticipant = { socketId: socket.id, name: userName, isHost };
            room.participants.push(newParticipant);
            await room.save();
            socket.join(roomId);
            io.to(roomId).emit('participant-joined', { room, newParticipant });
            socket.emit('room-joined', room);
            // Sync all participants to ensure everyone has correct list
            io.to(roomId).emit('sync-participants', { participants: room.participants });
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', 'Could not join room.');
        }
    });

    // Code updates
    socket.on('code-update', async (data) => {
        const { roomId, content } = data;
        try {
            await Room.updateOne({ roomId }, { codeContent: content });
            socket.to(roomId).emit('code-mirrored', content);
        } catch (error) {
            console.error('Error updating code:', error);
        }
    });

    // Language changes
    socket.on('language-change', async (data) => {
        const { roomId, language } = data;
        try {
            // Update language in DB
            await Room.updateOne({ roomId }, { language });

            // Determine default snippets for languages
            const defaultSnippets = {
                javascript: `// JavaScript example\nfunction greet(name) {\n  console.log('Hello, ' + name + '!');\n}\n\ngreet('World');\n`,
                python: `# Python example\ndef greet(name):\n    print(f"Hello, {name}!")\n\nif __name__ == '__main__':\n    greet('World')\n`,
                html: `<!doctype html>\n<html>\n  <head><meta charset=\"utf-8\"><title>Example</title></head>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>\n`,
                css: `/* CSS example */\nbody {\n  font-family: system-ui, sans-serif;\n  background: #fff;\n  color: #111;\n}\n`,
                cpp: `#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!\n";\n  return 0;\n}\n`
            };

            // Notify participants that language changed
            socket.to(roomId).emit('language-updated', language);

            // Fetch current room and code content
            const room = await Room.findOne({ roomId });
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

                // Save default snippet to DB so new participants also receive it
                if (snippetToSend) {
                    try {
                        await Room.updateOne({ roomId }, { codeContent: snippetToSend });
                    } catch (e) {
                        console.error('Error saving default snippet:', e);
                    }
                }
            }

            // Emit a language-changed event with language and the snippet (may be empty)
            socket.to(roomId).emit('language-changed', { language, snippet: snippetToSend });

            // Also ensure clients get the mirrored code content (for compatibility)
            if (snippetToSend) {
                socket.to(roomId).emit('code-mirrored', snippetToSend);
            }
        } catch (error) {
            console.error('Error changing language:', error);
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
    socket.on('remove-participant', async (data) => {
        const { roomId, socketId } = data;
        try {
            let room = await Room.findOne({ roomId });
            if (room) {
                const participant = room.participants.find(p => p.socketId === socketId);
                room.participants = room.participants.filter(p => p.socketId !== socketId);
                await room.save();
                
                // Notify the removed user
                io.to(socketId).emit('you-were-removed', { reason: 'Removed by host' });
                
                // Notify all users in room about removal
                io.to(roomId).emit('participant-left', { room, participantName: participant?.name, participantId: socketId });
                
                // Sync full participant list to all remaining users
                io.to(roomId).emit('sync-participants', { participants: room.participants });
            }
        } catch (error) {
            console.error('Error removing participant:', error);
        }
    });

    // User leaving room
    socket.on('leave-room', async (data) => {
        const { roomId } = data;
        try {
            let room = await Room.findOne({ roomId });
            if (room) {
                const participant = room.participants.find(p => p.socketId === socket.id);
                const participantName = participant?.name || 'Unknown';
                const isHost = participant?.isHost;
                
                room.participants = room.participants.filter(p => p.socketId !== socket.id);
                
                // If host is leaving, end the entire session by deleting the room
                if (isHost) {
                    // Notify all room members (including host) that session has ended BEFORE leaving
                    io.in(roomId).emit('session-ended', { reason: 'Host ended the session' });
                    await Room.deleteOne({ roomId });
                } else {
                    // Regular participant leaving
                    room.participants = room.participants.filter(p => p.socketId !== socket.id);
                    await room.save();
                    io.to(roomId).emit('participant-left', { room, participantName, participantId: socket.id });
                    
                    // Sync full participant list to all remaining users
                    io.to(roomId).emit('sync-participants', { participants: room.participants });
                }
                
                // Remove socket from room
                socket.leave(roomId);
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    });

    // Disconnect
    socket.on('disconnect', async () => {
        console.log(`Socket disconnected: ${socket.id}`);
        try {
            const room = await Room.findOne({ "participants.socketId": socket.id });
            if (room) {
                const participant = room.participants.find(p => p.socketId === socket.id);
                room.participants = room.participants.filter(p => p.socketId !== socket.id);
                await room.save();
                io.to(room.roomId).emit('participant-left', { room, participantName: participant?.name, participantId: socket.id });
                
                // Sync full participant list to all remaining users
                io.to(room.roomId).emit('sync-participants', { participants: room.participants });
                
                // Clean up muted participants data for this socket
                for (const roomId in mutedParticipants) {
                    delete mutedParticipants[roomId][socket.id];
                }
            }
        } catch (error) {
            console.error('Error on disconnect:', error);
        }
    });
});

const startServer = async () => {
    try {
        await connectDB(); // wait for MongoDB to connect first
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

