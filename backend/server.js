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


io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

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
        const { roomId, userName } = data;
        try {
            let room = await Room.findOne({ roomId });
            if (!room) {
                socket.emit('error', 'Room not found.');
                return;
            }
            const newParticipant = { socketId: socket.id, name: userName, isHost: false };
            room.participants.push(newParticipant);
            await room.save();
            socket.join(roomId);
            io.to(roomId).emit('participant-joined', { room, newParticipant });
            socket.emit('room-joined', room);
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
            await Room.updateOne({ roomId }, { language });
            socket.to(roomId).emit('language-updated', language);
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

    // Disconnect
    socket.on('disconnect', async () => {
        console.log(`Socket disconnected: ${socket.id}`);
        try {
            const room = await Room.findOne({ "participants.socketId": socket.id });
            if (room) {
                const participant = room.participants.find(p => p.socketId === socket.id);
                room.participants = room.participants.filter(p => p.socketId !== socket.id);
                await room.save();
                io.to(room.roomId).emit('participant-left', { room, participantName: participant.name });
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

