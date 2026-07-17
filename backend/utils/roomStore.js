// In-memory room storage. Rooms are ephemeral live-coding sessions, so they
// don't need to survive a server restart - a plain Map avoids the external
// MongoDB dependency entirely.

const rooms = new Map();

const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24h, mirrors the old Mongo TTL

const createRoom = ({ roomId, roomName, subject, hostSocketId, hostName }) => {
    const room = {
        roomId,
        roomName,
        subject,
        codeContent: '// Welcome to CodexView\nconsole.log("Hello, World!");',
        language: 'javascript',
        participants: [{ socketId: hostSocketId, name: hostName, isHost: true }],
        createdAt: Date.now(),
    };
    rooms.set(roomId, room);
    return room;
};

const getRoom = (roomId) => rooms.get(roomId) || null;

const getRoomByParticipantSocketId = (socketId) => {
    for (const room of rooms.values()) {
        if (room.participants.some((p) => p.socketId === socketId)) return room;
    }
    return null;
};

const deleteRoom = (roomId) => {
    rooms.delete(roomId);
};

// Lazily sweep expired rooms so a long-running process doesn't leak memory
// from abandoned rooms nobody explicitly closed.
setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms) {
        if (now - room.createdAt > ROOM_TTL_MS) rooms.delete(roomId);
    }
}, 60 * 60 * 1000).unref();

export default {
    createRoom,
    getRoom,
    getRoomByParticipantSocketId,
    deleteRoom,
};
