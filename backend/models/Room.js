import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
    socketId: { type: String, required: true },
    name: { type: String, required: true },
    isHost: { type: Boolean, default: false },
});

const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    roomName: { type: String, required: true },
    subject: { type: String, required: true },
    codeContent: { type: String, default: '// Welcome to CodexView\nconsole.log("Hello, World!");' },
    language: { type: String, default: 'javascript' },
    participants: [participantSchema],
    createdAt: { type: Date, default: Date.now, expires: '24h' }, // Rooms expire after 24 hours
});

const Room = mongoose.model('Room', roomSchema);

export default Room;
