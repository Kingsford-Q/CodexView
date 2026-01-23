import React, { useState } from 'react';
import { useEffect, useRef } from "react";
import Editor from '@monaco-editor/react';

import easy from './assets/easy.svg';
import live from './assets/live.svg';
import team from './assets/team.svg';
import menu from './assets/menu.svg';
import quote from './assets/quot.svg';

import img1 from './assets/img1.jpg';
import img2 from './assets/img2.jpg';
import img3 from './assets/img3.jpg';
import { io } from "socket.io-client";

const Homepage = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [menuOpen, setMenuOpen] = useState(false);
    const [roomName, setRoomName] = useState("");
    const [subject, setSubject] = useState("");
    const [openIndex, setOpenIndex] = useState(null);
    const [errors, setErrors] = useState({
        roomName: "",
        subject: "",
    });
    const [roomCreated, setRoomCreated] = useState(false);
    const [roomId, setRoomId] = useState("");
    const [copied, setCopied] = useState(false);
    const [codeContent, setCodeContent] = useState('// Welcome to CodexView\nconsole.log("Hello World");');
    const [output, setOutput] = useState("");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const isRemoteChange = useRef(false);
    const [socket, setSocket] = useState(null);
    // Session state
    const [isInSession, setIsInSession] = useState(false);
    const [isHost, setIsHost] = useState(true);
    const [participants, setParticipants] = useState([
        { id: '1', name: 'You', isHost: true, isOnline: true, isMuted: false, isSpeaking: false }
    ]);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [sessionTimer, setSessionTimer] = useState('00:00:00');
    const [notifications, setNotifications] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isPushToTalk, setIsPushToTalk] = useState(false);
    const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
    
    // Join room state
    const [joinRoomKey, setJoinRoomKey] = useState("");
    const [joinRoomError, setJoinRoomError] = useState("");
    const [joinRoomName, setJoinRoomName] = useState("");
    const [userName, setUserName] = useState("Guest-" + Math.random().toString(36).substr(2, 9));

    // Safe sessionStorage helper functions
    const getSessionData = (key) => {
        try {
            return sessionStorage.getItem(key);
        } catch (e) {
            console.warn('SessionStorage access blocked:', e);
            return null;
        }
    };

    const setSessionData = (key, value) => {
        try {
            sessionStorage.setItem(key, value);
        } catch (e) {
            console.warn('SessionStorage write blocked:', e);
        }
    };

    const removeSessionData = (key) => {
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            console.warn('SessionStorage remove blocked:', e);
        }
    };

    useEffect(() => {
    // Replace with your backend URL
    const newSocket = io("https://codexview.onrender.com", {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        secure: true,
        rejectUnauthorized: false,
        forceNew: false
    }); 
    setSocket(newSocket);

    newSocket.on('connect', () => {
        console.log('Connected to backend');
        addNotification('Connected to server', 'success');
        
        // Auto-rejoin room if user was in a session
        try {
            const savedSession = getSessionData('currentSession');
            if (savedSession) {
                const { roomId, userName: savedUserName, isHost } = JSON.parse(savedSession);
                console.log('Auto-rejoining room:', roomId);
                
                // Both host and guest rejoin using join-room
                // The room already exists on the backend
                newSocket.emit('join-room', {
                    roomId,
                    userName: savedUserName
                });
            }
        } catch (e) {
            console.error('Error auto-rejoining room:', e);
        }
    });

    newSocket.on('room-created', (room) => {
        console.log('Room created:', room);
        addNotification('Room created successfully!', 'success');
    });

    newSocket.on('room-joined', (room) => {
        console.log('Joined room:', room);
        addNotification('Successfully joined the room!', 'success');
    });

    newSocket.on('participant-joined', ({ newParticipant }) => {
        console.log('New participant:', newParticipant);
        addNotification(`${newParticipant.name} joined the session`, 'info');
        setParticipants(prev => [...prev, { 
            id: newParticipant.socketId, 
            name: newParticipant.name, 
            isHost: newParticipant.isHost, 
            isOnline: true, 
            isMuted: false, 
            isSpeaking: false 
        }]);
    });

    newSocket.on('participant-left', ({ participantName }) => {
        console.log('Participant left:', participantName);
        addNotification(`${participantName} left the session`, 'info');
        setParticipants(prev => prev.filter(p => p.name !== participantName));
    });

    newSocket.on('code-mirrored', (content) => {
        if (isRemoteChange.current === false) {
            isRemoteChange.current = true;
            setCodeContent(content);
        }
    });

    newSocket.on('error', (message) => {
        console.error('Socket error:', message);
        const errorMsg = typeof message === 'object' ? (message.message || JSON.stringify(message)) : String(message);
        addNotification(errorMsg, 'error');
    });

    newSocket.on('disconnect', () => {
        console.log('Disconnected from backend');
        addNotification('Disconnected from server', 'error');
    });

    return () => newSocket.close();
}, []);

    // Mobile session UI state
    const [mobileSessionTab, setMobileSessionTab] = useState('editor'); // 'editor' | 'participants'

    const menuRef = useRef(null);
    const micStreamRef = useRef(null);
    const micTrackRef = useRef(null);
    const editorTextareaRef = useRef(null);
    const [language, setLanguage] = useState("javascript");
    const [editorTheme, setEditorTheme] = useState("vs-dark"); // "vs-dark" or "light"
    const [fontSize, setFontSize] = useState(14);
    const [snapshots, setSnapshots] = useState([]);
    const editorRef = useRef(null);
    const remoteCursorsRef = useRef({});

    // Example of syncing a peer's cursor


useEffect(() => {
    if (!socket) return;

    socket.on('cursor-mirrored', ({ participantId, participantName, position }) => {
        // ✅ The "Guard": If editor isn't ready yet, just exit and don't crash
        if (!editorRef.current) return;

        const { line, column } = position;
        const oldDecorations = remoteCursorsRef.current[participantId] || [];

        const newDecorations = editorRef.current.deltaDecorations(oldDecorations, [
            {
                range: new monaco.Range(line, column, line, column),
                options: {
                    className: `remote-cursor-${participantId} remote-cursor-line`,
                    hoverMessage: { value: participantName },
                    beforeContentClassName: `remote-cursor-label-${participantId} remote-cursor-label-style`,
                }
            }
        ]);

        remoteCursorsRef.current[participantId] = newDecorations;
    });

    return () => socket.off('cursor-mirrored');
}, [socket]);

// 1. Format Code Logic
    const formatCode = () => {
    try {
        if (!window.prettier) {
            alert("Prettier is still loading...");
            return;
        }

        const formatted = window.prettier.format(codeContent, {
            // Pick the right parser based on your language state
            parser: language === 'html' ? "html" : "babel",
            plugins: window.prettierPlugins,
            semi: true,
            singleQuote: true,
            tabWidth: 2,
        });

        setCodeContent(formatted);
    } catch (err) {
        // If there is a syntax error, Prettier will tell you exactly where
        console.error("Format Error:", err.message);
        // Optional: show this error in your output console
        setOutput(`Format Error: ${err.message}`);
    }
};

const handleCodeChange = (value) => {
    if (isRemoteChange.current) {
        isRemoteChange.current = false; // Reset and ignore emitting
        return;
    }
    const newContent = value || "";
    
    // 1. Update local state immediately for zero-latency typing
    setCodeContent(newContent);

    // 2. Broadcast the change to all other mirrors in the room
    if (socket && roomId) {
        socket.emit('code-update', {
            roomId,
            content: newContent
        });
    }
};

const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (socket && roomId && isInSession) {
        socket.emit('language-change', {
            roomId,
            language: newLanguage
        });
    }
};

useEffect(() => {
    if (!socket) return;

    // Listen for the mirror event from the server
    socket.on('language-updated', (newLang) => {
        setLanguage(newLang);
        
        // Optional: Show a small notification that language was changed by host
        addNotification({
            id: Date.now(),
            message: `Language switched to ${newLang}`,
            type: 'info'
        });
    });

    return () => socket.off('language-updated');
}, [socket]);


    // 2. Snapshot Logic
    const takeSnapshot = () => {
        const timestamp = new Date().toLocaleTimeString();
        setSnapshots([{ id: Date.now(), time: timestamp, content: codeContent }, ...snapshots]);
    };

    useEffect(() => {
        const handlePointerDownOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        // Use pointerdown (capture) so mobile taps are handled reliably.
        document.addEventListener("pointerdown", handlePointerDownOutside, true);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDownOutside, true);
        };
    }, []);

    const fallbackCopyTextToClipboard = (text) => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.setAttribute('readonly', '');
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textArea);
            return ok;
        } catch {
            return false;
        }
    };

    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {
            // fall back below
        }
        return fallbackCopyTextToClipboard(text);
    };

    const stopMic = () => {
        try {
            micTrackRef.current?.stop?.();
            micStreamRef.current?.getTracks?.().forEach((t) => t.stop());
        } catch {
            // ignore
        } finally {
            micTrackRef.current = null;
            micStreamRef.current = null;
        }
    };

    const ensureMic = async () => {
        if (micTrackRef.current) return true;
        try {
            const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
            if (!stream) return false;
            const track = stream.getAudioTracks?.()[0];
            if (!track) return false;
            micStreamRef.current = stream;
            micTrackRef.current = track;
            return true;
        } catch {
            return false;
        }
    };

    // Session timer effect
    useEffect(() => {
        if (!isInSession || !sessionStartTime) return;

        const interval = setInterval(() => {
            const elapsed = Date.now() - sessionStartTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            setSessionTimer(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [isInSession, sessionStartTime]);

    const toggleIndex = (index) => {
    setOpenIndex(openIndex === index ? null : index);
    };

    const faqs = [
        {
            question: "How do I create a room?",
            answer: "Simply click 'Create Room' on the homepage and follow the steps to set up your live coding session."
        },
        {
            question: "Can I join a room without signing up?",
            answer: "Yes, you don’t need an account to join a room. You’ll just need a key from the room’s creator."
        },
        {
            question: "Is CodexView free to use?",
            answer: "Yes, all features are free. Some advanced tools may require a subscription."
        },
        {
            question: "Can I share my screen in a room?",
            answer: "Currently, you can share your code in real time, but screen sharing for full desktop is coming soon."
        },
        {
            question: "How do I report an issue?",
            answer: "Use the 'Help' tab in the navigation to submit feedback or report any bugs."
        },
    ];

    const [files, setFiles] = useState({
        "index.js": {
            name: "index.js",
            language: "javascript",
            value: "// Welcome to CodexView\nconsole.log('Hello World');"
        },
        "styles.css": {
            name: "styles.css",
            language: "css",
            value: "body { background: #f0f0f0; }"
        }
    });
    const [activeFile, setActiveFile] = useState("index.js");


    const logo = "</>";

    const handleSubmit = (e) => { 
        e.preventDefault();

        const newErrors = {
            roomName: "",
            subject: "",
        };

        if (!roomName.trim()) {
            newErrors.roomName = "Room name is required";
        }

        if (!subject.trim()) {
            newErrors.subject = "Subject is required";
        }

        setErrors(newErrors);

        if (newErrors.roomName || newErrors.subject) return;

        try {
            const newRoomId = generateRoomId();
            setRoomId(newRoomId);
            
            if (socket) {
                socket.emit('create-room', {
                    roomId: newRoomId,
                    roomName,
                    subject,
                    hostName: userName
                });
            }
            
            setRoomCreated(true);
        } catch {
            addNotification('Failed to create room. Please try again.', 'error');
        }
    };

    const handleCopyRoomId = () => {
        copyToClipboard(roomId).then((ok) => {
            if (ok) {
                setCopied(true);
                addNotification('Room ID copied to clipboard', 'success');
                setTimeout(() => setCopied(false), 2000);
            } else {
                addNotification('Unable to copy room ID on this device', 'error');
            }
        });
    };

    const handleStartSession = () => {
        setIsInSession(true);
        setActiveTab('session');
        setSessionStartTime(Date.now());
        setIsHost(true);
        setMobileSessionTab('editor');
        
        // Save session to sessionStorage for auto-rejoin on refresh
        setSessionData('currentSession', JSON.stringify({
            roomId,
            userName,
            isHost: true
        }));
        setSessionData('roomName', roomName);
        setSessionData('subject', subject);
        
        // Add initial notification
        addNotification('Session started successfully!', 'success');
        ensureMic().then((ok) => {
            if (!ok) addNotification('Microphone permission not granted (voice controls will be limited)', 'info');
        });
    };

    const handleEndSession = () => {
        stopMic();
        setIsInSession(false);
        setActiveTab('home');
        setOutput("");
        setSessionStartTime(null);
        setSessionTimer('00:00:00');
        setCodeContent('// Welcome to CodexView Live Session\n// Start coding here...\n');
        setParticipants([{ id: '1', name: 'You', isHost: true, isOnline: true, isMuted: false, isSpeaking: false }]);
        setNotifications([]);
        setIsMuted(false);
        setIsPushToTalk(false);
        
        // Clear session from sessionStorage
        removeSessionData('currentSession');
        removeSessionData('roomName');
        removeSessionData('subject');
        
        // Reset create room form
        setRoomName("");
        setSubject("");
        setRoomCreated(false);
        setRoomId("");
        setCopied(false);
        setErrors({ roomName: "", subject: "" });
    };

    const handleLeaveSession = () => {
        stopMic();
        setIsInSession(false);
        setActiveTab('home');
        setSessionStartTime(null);
        setSessionTimer('00:00:00');
        setNotifications([]);
        setOutput("");
        
        // Clear session from sessionStorage
        removeSessionData('currentSession');
        removeSessionData('roomName');
        removeSessionData('subject');
    };

    const addNotification = (message, type = 'info') => {
        const notification = { id: Date.now(), message, type };
        setNotifications(prev => [...prev, notification]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 3000);
    };

    const generateRoomId = () => {
        // Mobile Safari (and some older browsers) may not support crypto.randomUUID()
        if (crypto?.randomUUID) return crypto.randomUUID();

        // RFC4122-ish v4 using getRandomValues
        if (crypto?.getRandomValues) {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
            bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
            const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }

        // Last resort: time + random
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    };

    const handleCopyInviteLink = () => {
        const inviteLink = `${window.location.origin}?room=${roomId}`;
        copyToClipboard(inviteLink).then((ok) => {
            if (ok) {
                setInviteLinkCopied(true);
                addNotification('Invite link copied to clipboard', 'success');
                setTimeout(() => setInviteLinkCopied(false), 2000);
            } else {
                addNotification('Unable to copy invite link on this device', 'error');
            }
        });
    };

    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
    };

    const handleMuteParticipant = (participantId) => {
        setParticipants(prev => prev.map(p => 
            p.id === participantId ? { ...p, isMuted: !p.isMuted } : p
        ));
    };

    const handleRemoveParticipant = (participantId) => {
        const participant = participants.find(p => p.id === participantId);
        if (participant) {
            addNotification(`${participant.name} has been removed from the session`, 'info');
        }
        setParticipants(prev => prev.filter(p => p.id !== participantId));
    };

    const handleDownloadSession = () => {
        const sessionData = {
            roomName,
            roomId,
            subject,
            codeContent,
            participants: participants.map(p => ({ name: p.name, isHost: p.isHost })),
            duration: sessionTimer,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${roomId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        setJoinRoomError("");

        if (!joinRoomKey.trim()) {
            setJoinRoomError("Room key is required");
            return;
        }

        if (socket) {
            socket.emit('join-room', {
                roomId: joinRoomKey,
                userName: joinRoomName || userName
            });
            
            setIsInSession(true);
            setIsHost(false);
            setRoomId(joinRoomKey);
            setRoomName(joinRoomName || "Joined Room");
            setSubject("Live Coding Session");
            setActiveTab('session');
            setSessionStartTime(Date.now());
            setMobileSessionTab('editor');
            
            // Save session to sessionStorage for auto-rejoin on refresh
            setSessionData('currentSession', JSON.stringify({
                roomId: joinRoomKey,
                userName: joinRoomName || userName,
                isHost: false
            }));
            setSessionData('roomName', joinRoomName || "Joined Room");
            setSessionData('subject', "Live Coding Session");
            
            addNotification('Successfully joined the room!', 'success');
            ensureMic().then((ok) => {
                if (!ok) addNotification('Microphone permission not granted', 'info');
            });
            setJoinRoomKey("");
            setJoinRoomName("");
        } else {
            setJoinRoomError("Not connected to server");
            addNotification('Not connected to server', 'error');
        }
    };

    const handleCancel = () => {
        setRoomName("");
        setSubject("");
        setErrors({ roomName: "", subject: "" });
        setRoomCreated(false);
        setRoomId("");
        setCopied(false);
    };

    const handleNavClick = (tab) => {
        // Prevent switching to create/join while a session is active
        if (isInSession && (tab === 'create-room' || tab === 'join-room')) {
            addNotification('Please end the current session first.', 'info');
            setActiveTab('session');
            setMenuOpen(false);
            return;
        }

        setActiveTab(tab);
        setMenuOpen(false);
    };

    useEffect(() => {
        const track = micTrackRef.current;
        if (!track) return;
        // If muted, disable mic unless push-to-talk is currently pressed.
        track.enabled = Boolean((!isMuted) || isPushToTalk);
    }, [isMuted, isPushToTalk]);

    // Cleanup mic on unmount just in case
    useEffect(() => {
        return () => stopMic();
    }, []);

    // Auto-resize textarea on mobile
    const adjustTextareaHeight = () => {
        const textarea = editorTextareaRef.current;
        if (!textarea) return;
        
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // On mobile, auto-grow but cap at max height (60vh)
        const isMobile = window.innerWidth < 1024; // lg breakpoint
        if (isMobile) {
            const maxHeight = window.innerHeight * 0.6; // 60vh
            const scrollHeight = textarea.scrollHeight;
            const newHeight = Math.min(scrollHeight, maxHeight);
            textarea.style.height = `${newHeight}px`;
            textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
        } else {
            // Desktop: keep flex-1 behavior
            textarea.style.height = 'auto';
            textarea.style.overflowY = 'auto';
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [codeContent, mobileSessionTab]);

    useEffect(() => {
        // Adjust on window resize
        const handleResize = () => {
            adjustTextareaHeight();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const runCode = async () => {
    setOutput("Running...\n");
    const logs = [];
    const customLogger = (...args) => {
        logs.push(args.map(arg => String(arg)).join(' '));
        setOutput(logs.join('\n'));
    };

    if (language === 'javascript') {
        try {
            const execute = new Function('console', codeContent);
            execute({ log: customLogger });
        } catch (err) {
            setOutput(`JS Error: ${err.message}`);
        }
    } 
    
    else if (language === 'python') {
        try {
            // Load Pyodide if it's not already loaded
            if (!window.loadPyodide) {
                setOutput("Error: Pyodide script not found in index.html");
                return;
            }
            const pyodide = await window.loadPyodide();
            
            // Redirect Python's print() to our console
            pyodide.setStdout({ batched: (str) => customLogger(str) });
            
            await pyodide.runPythonAsync(codeContent);
        } catch (err) {
            setOutput(`Python Error: ${err.message}`);
        }
    }
};


    return(
        <main className = "w-full min-h-screen flex flex-col">
            <div className = "sticky top-0 flex items-center lg:px-10 md:px-6 px-4 md:py-9 py-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] w-full bg-white">
                <nav className = 'flex justify-between items-center w-full'>
                    <div className = "flex justify-center items-center space-x-2">
                        <div className = "text-black font-bold md:text-3xl text-xl">{logo}</div>
                        <div className = "text-black font-medium md:text-2xl lg:text-2xl">CodexView</div>
                    </div>

                    <div className="flex md:hidden" ref={menuRef}>
                        <button
                            type="button"
                            className="w-20 h-20 flex justify-center items-center"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-label="Open menu"
                        >
                            <img src={menu} className="w-full object-cover" />
                        </button>

                        {menuOpen && (
                            <div
                                className="absolute top-20.5 left-0 flex flex-col justify-center items-center bg-white p-4 shadow-md rounded w-full"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {[
                                    "home",
                                    "create-room",
                                    "join-room",
                                    ...(isInSession ? ["session"] : []),
                                    "help",
                                ].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => handleNavClick(tab)}
                                        onTouchStart={() => handleNavClick(tab)}
                                        className={`flex justify-center items-center font-semibold text-md w-full py-3 ${
                                            activeTab === tab ? "text-[#0663cc]" : "text-black"
                                        }`}
                                    >
                                        {tab.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
    

                    <div className = "md:flex justify-center items-center md:space-x-8 lg:space-x-12 hidden">
                        <div
                        onClick = { () => handleNavClick('home') }
                        className = { `font-medium text-sm cursor-pointer ${ activeTab === 'home' ? 'text-[#0663cc]' : 'text-black' } `}>
                            Home
                        </div>

                        <div
                        onClick = { () => handleNavClick('create-room') }
                        className = { `font-medium text-sm ${isInSession ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${ activeTab === 'create-room' ? 'text-[#0663cc]' : 'text-black' } `}>
                            Create Room
                        </div>

                        <div
                        onClick = { () => handleNavClick('join-room') }
                        className = { `font-medium text-sm ${isInSession ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${ activeTab === 'join-room' ? 'text-[#0663cc]' : 'text-black' } `}>
                            Join Room
                        </div>

                        {isInSession && (
                            <div
                            onClick = { () => handleNavClick('session') }
                            className = { `font-medium text-sm cursor-pointer ${ activeTab === 'session' ? 'text-[#0663cc]' : 'text-black' } `}>
                                Session
                            </div>
                        )}

                        <div
                        onClick = { () => handleNavClick('help') }
                        className = { `font-medium text-sm cursor-pointer ${ activeTab === 'help' ? 'text-[#0663cc]' : 'text-black' } `}>
                            Help
                        </div>
                    </div>
                </nav>
            </div>

            <div className = {`grow flex flex-col ${isInSession && activeTab === 'session' ? 'items-stretch' : 'items-center'} w-full ${isInSession && activeTab === 'session' ? 'pt-4' : 'pt-16 md:pt-28'}`}>

                {activeTab === 'home' && (
                    <>
                        <div className = "flex flex-col justify-center items-center space-y-10 w-full">
                            <div className = "flex flex-col justify-center items-center space-y-1">
                                <div className = "font-bold md:text-2xl text-lg">Welcome to CodexView</div>
                                <div className = "text-center px-4 md:px-0">A live coding space where creators teach and learners follow in real time.</div>
                                <button className = "text-white hover:bg-[#0552a8] bg-[#0663cc] rounded-full text-md px-4 py-2 mt-5 font-semibold shadow-[0_6px_16px_-8px_rgba(0,0,0,0.25)] hovershadow-[0_10px_24px_-10px_rgba(0,0,0,0.3)] transition-shadow duration-300"
                                onClick = { () => setActiveTab('create-room') }
                                > Create Room</button>
                            </div>

                            <div className = "w-full py-12 bg-[#f7f9fc] md:mt-28 mt-12">
                                <div className = "flex flex-col md:flex-row gap-14 md:gap-0 justify-between items-center px-4 md:px-12 md:space-x-7">
                                    <div className = "text-center flex flex-col justify-center items-center space-y-1">
                                        <div className = "w-12 h-12 flex justify-center items-center">
                                            <img src = {easy} className = "w-full object-cover " />
                                        </div>
                                        <div className = "font-semibold text-center">Easy to use.</div>
                                        <div className = "text-center text-sm">Create a room and begin teaching with live code instantly.</div>
                                    </div>

                                    <div className = "text-center flex flex-col justify-center items-center space-y-1">
                                        <div className = "w-12 h-12 flex justify-center items-center">
                                            <img src = {team} className = "w-full object-cover " />
                                        </div>
                                        <div className = "font-semibold text-center">Collaborative Tool</div>
                                        <div className = "text-center text-sm">Code together with others in real time</div>
                                    </div>

                                    <div className = "text-center flex flex-col justify-center items-center space-y-1">
                                        <div className = "w-12 h-12 flex justify-center items-center">
                                            <img src = {live} className = "w-full object-cover " />
                                        </div>
                                        <div className = "font-semibold text-center">Live Mirror</div>
                                        <div className = "text-center text-sm ">See changes instantly as they happen in the editor.</div>
                                    </div>
                                </div>
                            </div>

                        </div>


                        <div className="max-w-3xl mx-auto px-4 md:px-0 py-28">
                            <div className="text-center mb-10">
                                <h2 className="font-semibold md:text-3xl text-lg">
                                Recently Asked Questions
                                </h2>
                                <p className="text-gray-600 mt-2">
                                Quick answers to help you get started with CodexView.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {faqs.map((faq, index) => (
                                <div
                                    key={index}
                                    className={`border rounded-lg shadow-sm overflow-hidden transition-all ${
                                    openIndex === index ? "border-blue-500" : "border-gray-200"
                                    }`}
                                >
                                    <button
                                    onClick={() => toggleIndex(index)}
                                    className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
                                    >
                                    <span className="text-gray-900 font-medium">{faq.question}</span>
                                    <span className="text-gray-500">
                                        {openIndex === index ? "−" : "+"}
                                    </span>
                                    </button>
                                    {openIndex === index && (
                                    <div className="p-4 border-t border-gray-200 text-gray-700 text-sm">
                                        {faq.answer}
                                    </div>
                                    )}
                                </div>
                                ))}
                            </div>
                        </div>


                        <div className = "w-full py-12 bg-[#cedff2]">

                                <div className = "flex justify-center items-center w-full font-semibold text-lg">What Our Users Are Saying</div>

                                <div className = "flex flex-col md:flex-row gap-8 md:gap-0 justify-between items-stretch px-4 md:px-12 md:space-x-7 mt-8">
                                    <div className = "text-center flex-1 flex flex-col justify-between items-start space-y-5 bg-[#d3d3d3] p-7 rounded-xl">
                                        <div className = "w-6 h-6 flex justify-center items-center">
                                            <img src = {quote} className = "w-full object-cover " />
                                        </div>

                                        <div className = "text-left text-sm">CodexView makes live coding so easy! I can follow along with creators and actually understand the code in real time.</div>

                                        <div className = "flex items-center space-x-2">

                                            <div className = "w-8 h-8 flex justify-center items-center ">
                                                <img src = {img1} className = "w-full object-cover rounded-full h-full" />
                                            </div>
                                            <div className = "text-left text-sm font-semibold">Micheal K. oduro</div>
                                        </div>
                                    </div>

                                    <div className = "text-center flex-1 flex flex-col justify-between items-start space-y-5 bg-[#d3d3d3] p-7 rounded-xl">
                                        <div className = "w-6 h-6 flex justify-center items-center">
                                            <img src = {quote} className = "w-full object-cover " />
                                        </div>

                                        <div className = "text-left text-sm">Collaborating with others has never been this seamless. CodexView is perfect for learning and teaching together.</div>

                                        <div className = "flex items-center space-x-2">

                                            <div className = "w-8 h-8 flex justify-center items-center ">
                                                <img src = {img3} className = "w-full object-cover rounded-full h-full" />
                                            </div>
                                            <div className = "text-left text-sm font-semibold">Fortunate Appiah</div>
                                        </div>
                                    </div>
                                    
                                    <div className = "text-center flex-1 flex flex-col justify-between items-start space-y-5 bg-[#d3d3d3] p-7 rounded-xl">
                                        <div className = "w-6 h-6 flex justify-center items-center">
                                            <img src = {quote} className = "w-full object-cover " />
                                        </div>

                                        <div className = "text-left text-sm">The live mirror editor is a game-changer! I can see changes instantly, which really helps me grasp concepts faster.</div>

                                        <div className = "flex items-center space-x-2">

                                            <div className = "w-8 h-8 flex justify-center items-center ">
                                                <img src = {img2} className = "w-full object-cover rounded-full h-full" />
                                            </div>
                                            <div className = "text-left text-sm font-semibold">Felix Atubiga</div>
                                        </div>
                                    </div>
                                    
                                </div>
                        </div>

                    </>
                    
                )}

                {activeTab === 'create-room' && (
                    <div className = "w-full flex flex-col justify-center items-center lg:-mt-20 -mt-3 md:mt-0 md:grow">
                        <div
                            className={`bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10 ${
                                roomCreated
                                    ? 'w-[calc(100%-2rem)] max-w-md mx-4'
                                    : 'md:w-full lg:max-w-lg md:max-w-md'
                            }`}
                        >

                            {!roomCreated ? (
                                <>
                                    {/* Header */}
                                    <div className="text-center md:mb-8 mb-6">
                                        <h2 className="text-md md:text-xl font-semibold">
                                        Create CodexView Room
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-1">
                                        Start a live coding session in seconds
                                        </p>
                                    </div>

                                    <form className="space-y-6" onSubmit={handleSubmit}>

                                        {/* Room Name */}
                                        <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 ml-1">
                                            Room Name
                                        </label>

                                        <input
                                            type="text"
                                            value={roomName}
                                            onChange={(e) => {
                                            setRoomName(e.target.value);
                                            setErrors((prev) => ({ ...prev, roomName: "" }));
                                            }}
                                            placeholder="Enter room name..."
                                            className={`w-full px-5 py-3 border rounded-full text-sm transition-all
                                            ${errors.roomName
                                                ? "border-red-400 focus:ring-2 focus:ring-red-400"
                                                : "border-gray-200 focus:ring-2 focus:ring-[#0663cc]"
                                            }
                                            focus:outline-none placeholder-gray-400`}
                                        />

                                        {errors.roomName && (
                                            <p className="text-xs text-red-500 ml-2">
                                            {errors.roomName}
                                            </p>
                                        )}
                                        </div>

                                        {/* Subject */}
                                        <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 ml-1">
                                            Subject
                                        </label>

                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => {
                                            setSubject(e.target.value);
                                            setErrors((prev) => ({ ...prev, subject: "" }));
                                            }}
                                            placeholder="e.g. JavaScript, Python, Algorithms"
                                            className={`w-full px-5 py-3 border rounded-full text-sm transition-all
                                            ${errors.subject
                                                ? "border-red-400 focus:ring-2 focus:ring-red-400"
                                                : "border-gray-200 focus:ring-2 focus:ring-[#0663cc]"
                                            }
                                            focus:outline-none placeholder-gray-400`}
                                        />

                                        {errors.subject && (
                                            <p className="text-xs text-red-500 ml-2">
                                            {errors.subject}
                                            </p>
                                        )}
                                        </div>

                                        {/* Submit */}
                                        <button
                                        type="submit"
                                        className="w-full bg-[#0663cc] hover:bg-[#0552a8]
                                                    text-white font-semibold py-3.5 rounded-full
                                                    shadow-[0_6px_16px_-8px_rgba(0,0,0,0.25)]
                                                    transition-all"
                                        >
                                        Create Room
                                        </button>

                                    </form>
                                </>
                            ) : (
                                <>
                                    {/* Success Header */}
                                    <div className="text-center md:mb-8 mb-6">
                                        <h2 className="text-md md:text-xl font-semibold">
                                        Room Created Successfully!
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-1">
                                        Share this room ID with others to join your session
                                        </p>
                                    </div>

                                    {/* Room ID Display with Copy */}
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700 ml-1">
                                                Room ID
                                            </label>
                                            
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={roomId}
                                                    readOnly
                                                    className="w-full px-5 py-3 pr-24 border border-gray-200 rounded-full text-sm bg-gray-50 font-mono font-semibold focus:outline-none"
                                                />
                                                <button
                                                    onClick={handleCopyRoomId}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#0663cc] hover:bg-[#0552a8] text-white text-xs font-semibold rounded-full transition-all"
                                                >
                                                    {copied ? "Copied!" : "Copy"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Start Session Button */}
                                        <button
                                            onClick={handleStartSession}
                                            className="w-full bg-[#0663cc] hover:bg-[#0552a8]
                                                        text-white font-semibold py-3.5 rounded-full
                                                        shadow-[0_6px_16px_-8px_rgba(0,0,0,0.25)]
                                                        transition-all"
                                        >
                                            Start Session
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        {roomCreated && (
                            <button
                                onClick={handleCancel}
                                className="text-sm text-gray-500 hover:text-gray-700 mt-4 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'join-room' && (
                    <div className = "w-full flex flex-col justify-center items-center lg:-mt-20 -mt-3 md:mt-0 md:grow">
                        <div className="md:w-full lg:max-w-lg md:max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10">
                            {/* Header */}
                            <div className="text-center md:mb-8 mb-6">
                                <h2 className="text-md md:text-xl font-semibold">
                                    Join CodexView Room
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Enter the room key provided by the host
                                </p>
                            </div>

                            <form className="space-y-6" onSubmit={handleJoinRoom}>
                                {/* Room Key */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 ml-1">
                                        Room Key
                                    </label>

                                    <input
                                        type="text"
                                        value={joinRoomKey}
                                        onChange={(e) => {
                                            setJoinRoomKey(e.target.value);
                                            setJoinRoomError("");
                                        }}
                                        placeholder="Enter room key..."
                                        className={`w-full px-5 py-3 border rounded-full text-sm transition-all
                                        ${joinRoomError
                                            ? "border-red-400 focus:ring-2 focus:ring-red-400"
                                            : "border-gray-200 focus:ring-2 focus:ring-[#0663cc]"
                                        }
                                        focus:outline-none placeholder-gray-400 font-mono`}
                                    />

                                    {joinRoomError && (
                                        <p className="text-xs text-red-500 ml-2">
                                            {joinRoomError}
                                        </p>
                                    )}
                                </div>

                                {/* Optional: Your Name */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 ml-1">
                                        Your Name (Optional)
                                    </label>

                                    <input
                                        type="text"
                                        value={joinRoomName}
                                        onChange={(e) => setJoinRoomName(e.target.value)}
                                        placeholder="Enter your name..."
                                        className="w-full px-5 py-3 border border-gray-200 rounded-full text-sm transition-all
                                        focus:ring-2 focus:ring-[#0663cc]
                                        focus:outline-none placeholder-gray-400"
                                    />
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    className="w-full bg-[#0663cc] hover:bg-[#0552a8]
                                                text-white font-semibold py-3.5 rounded-full
                                                shadow-[0_6px_16px_-8px_rgba(0,0,0,0.25)]
                                                transition-all"
                                >
                                    Join Room
                                </button>
                            </form>
                        </div>
                        <button
                            onClick={() => {
                                setJoinRoomKey("");
                                setJoinRoomName("");
                                setJoinRoomError("");
                                setActiveTab('home');
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700 mt-4 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {activeTab === 'help' && (
                    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                                Help & Support
                            </h1>
                            <p className="text-gray-600">
                                Get in touch with us or find answers to common questions
                            </p>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Contact Information</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-[#0663cc] rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">📧</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                                        <a href="mailto:support@codexview.com" className="text-[#0663cc] hover:underline">
                                            support@codexview.com
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-[#0663cc] rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">💬</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Discord</h3>
                                        <a href="https://discord.gg/codexview" target="_blank" rel="noopener noreferrer" className="text-[#0663cc] hover:underline">
                                            Join our Discord server
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-[#0663cc] rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">🐙</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">GitHub</h3>
                                        <a href="https://github.com/codexview" target="_blank" rel="noopener noreferrer" className="text-[#0663cc] hover:underline">
                                            github.com/codexview
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-[#0663cc] rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">🐦</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Twitter</h3>
                                        <a href="https://twitter.com/codexview" target="_blank" rel="noopener noreferrer" className="text-[#0663cc] hover:underline">
                                            @codexview
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quick Links</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <a href="#" className="p-4 border border-gray-200 rounded-lg hover:border-[#0663cc] hover:bg-blue-50 transition-all">
                                    <h3 className="font-semibold text-gray-900 mb-1">Documentation</h3>
                                    <p className="text-sm text-gray-600">Learn how to use CodexView features</p>
                                </a>
                                <a href="#" className="p-4 border border-gray-200 rounded-lg hover:border-[#0663cc] hover:bg-blue-50 transition-all">
                                    <h3 className="font-semibold text-gray-900 mb-1">Video Tutorials</h3>
                                    <p className="text-sm text-gray-600">Watch step-by-step guides</p>
                                </a>
                                <a href="#" className="p-4 border border-gray-200 rounded-lg hover:border-[#0663cc] hover:bg-blue-50 transition-all">
                                    <h3 className="font-semibold text-gray-900 mb-1">Report a Bug</h3>
                                    <p className="text-sm text-gray-600">Found an issue? Let us know</p>
                                </a>
                                <a href="#" className="p-4 border border-gray-200 rounded-lg hover:border-[#0663cc] hover:bg-blue-50 transition-all">
                                    <h3 className="font-semibold text-gray-900 mb-1">Feature Request</h3>
                                    <p className="text-sm text-gray-600">Suggest new features</p>
                                </a>
                            </div>
                        </div>

                        {/* FAQ Section */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
                            <div className="space-y-4">
                                {faqs.map((faq, index) => (
                                    <div
                                        key={index}
                                        className={`border rounded-lg shadow-sm overflow-hidden transition-all ${
                                            openIndex === index ? "border-blue-500" : "border-gray-200"
                                        }`}
                                    >
                                        <button
                                            onClick={() => toggleIndex(index)}
                                            className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
                                        >
                                            <span className="text-gray-900 font-medium">{faq.question}</span>
                                            <span className="text-gray-500">
                                                {openIndex === index ? "−" : "+"}
                                            </span>
                                        </button>
                                        {openIndex === index && (
                                            <div className="p-4 border-t border-gray-200 text-gray-700 text-sm">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Support Hours */}
                        <div className="bg-gradient-to-r from-[#0663cc] to-[#0552a8] rounded-2xl shadow-sm p-6 md:p-8 text-white">
                            <h2 className="text-2xl font-semibold mb-4">Support Hours</h2>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-semibold">Monday - Friday:</span> 9:00 AM - 6:00 PM EST</p>
                                <p><span className="font-semibold">Saturday:</span> 10:00 AM - 4:00 PM EST</p>
                                <p><span className="font-semibold">Sunday:</span> Closed</p>
                            </div>
                            <p className="mt-4 text-sm opacity-90">
                                We typically respond within 24 hours during support hours.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'session' && isInSession && (
                    <div className="w-full flex-1 flex flex-col min-h-0">
                        {/* Notifications */}
                        <div className="fixed top-20 right-4 left-4 md:left-auto z-50 space-y-2">
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`px-4 py-2 rounded-lg shadow-lg text-sm text-white animate-slide-in ${
                                        notification.type === 'success' ? 'bg-green-500' :
                                        notification.type === 'error' ? 'bg-red-500' :
                                        'bg-blue-500'
                                    }`}
                                >
                                    {notification.message}
                                </div>
                            ))}
                        </div>

                        {/* Main Session Layout */}
                        <div className="flex flex-col lg:flex-row flex-1 w-full gap-4 p-2 md:p-4 min-h-0">
                            {/* Mobile switcher (must be visible on both panes) */}
                            <div className="lg:hidden bg-white border border-gray-200 rounded-lg shadow-sm p-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setMobileSessionTab('editor')}
                                        className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                                            mobileSessionTab === 'editor'
                                                ? 'bg-[#0663cc] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Editor
                                    </button>
                                    <button
                                        onClick={() => setMobileSessionTab('participants')}
                                        className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                                            mobileSessionTab === 'participants'
                                                ? 'bg-[#0663cc] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Participants
                                    </button>
                                </div>
                            </div>

                            {/* Left Side - Room Details & Editor */}
                            <div className={`flex flex-col flex-1 gap-4 min-w-0 ${mobileSessionTab !== 'editor' ? 'hidden lg:flex' : ''}`}>
                                {/* Room Details Panel */}
                                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{roomName}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{subject}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Room ID:</span>
                                                    <span className="font-mono font-semibold">{roomId}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Host:</span>
                                                    <span className="font-semibold">You</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Participants:</span>
                                                    <span className="font-semibold">{participants.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <button
                                                onClick={handleCopyInviteLink}
                                                className="px-4 py-2 bg-[#0663cc] hover:bg-[#0552a8] text-white text-sm font-semibold rounded-lg transition-all"
                                            >
                                                {inviteLinkCopied ? 'Copied!' : 'Copy Invite Link'}
                                            </button>
                                            {isHost && (
                                                <button
                                                    onClick={handleEndSession}
                                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-all"
                                                >
                                                    End Session
                                                </button>
                                            )}
                                            {!isHost && (
                                                <button
                                                    onClick={handleLeaveSession}
                                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-all"
                                                >
                                                    Leave Session
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Editor */}
                                {/* Live Editor Container - Added margin 'm-2' to give a safe area to scroll the whole page on mobile */}
<div className="lg:flex-1 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-[60vh] lg:h-[600px] overflow-hidden relative m-2 md:m-0">
    
    {/* Header */}
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-700">Live Editor</span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xs md:text-sm text-gray-600 font-mono mr-1">{sessionTimer}</span>
            
            <button
                onClick={runCode}
                disabled={!['javascript', 'python', 'html'].includes(language)}
                className={`px-3 py-1.5 text-white text-[10px] md:text-xs font-bold rounded flex items-center gap-1 shadow-sm transition-all ${
                    ['javascript', 'python', 'html'].includes(language) 
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-100' 
                    : 'bg-gray-300 cursor-not-allowed opacity-50'
                }`}
            >
                <span>{language === 'html' ? '👁️' : '▶'}</span> Run
            </button>

            {/* Settings Toggle Button */}
            <div className="relative">
                <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`p-1.5 rounded border transition-all ${settingsOpen ? 'bg-blue-50 border-blue-300 text-blue-600 shadow-inner' : 'bg-white border-gray-300 text-gray-600'}`}
                >
                    <span className="text-xs">⚙️</span>
                </button>

                {settingsOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Language Selection */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                                Coding Language
                            </label>
                            <select 
                                value={language}
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold text-gray-700"
                            >
                                <option value="javascript">JavaScript (Native)</option>
                                <option value="python">Python (Pyodide)</option>
                                <option value="html">HTML (Static)</option>
                                <option value="css">CSS (Styles)</option>
                                <option value="cpp">C++ (Highlight Only)</option>
                            </select>
                        </div>

                        {/* Appearance Controls */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Appearance</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setEditorTheme('vs-dark')} className={`text-[10px] py-2 rounded-lg font-bold border ${editorTheme === 'vs-dark' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}>Dark</button>
                                <button onClick={() => setEditorTheme('light')} className={`text-[10px] py-2 rounded-lg font-bold border ${editorTheme === 'light' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}>Light</button>
                            </div>
                        </div>

                        {/* Text Zoom */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Text Zoom</label>
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 font-bold border-r border-gray-200 text-gray-600">−</button>
                                <span className="flex-1 text-center text-[10px] font-bold text-gray-700">{fontSize}px</span>
                                <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 font-bold text-gray-600">+</button>
                            </div>
                        </div>

                        {/* Tools Section */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Tools</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={formatCode} className="text-[10px] py-2 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100 hover:bg-blue-100">✨ Format</button>
                                    <button onClick={takeSnapshot} className="text-[10px] py-2 bg-purple-50 text-purple-700 rounded-lg font-bold border border-purple-100 hover:bg-purple-100">📸 Snapshot</button>
                                </div>
                            </div>

                            {/* History List */}
                            {snapshots.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">History</label>
                                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                        {snapshots.map((s) => (
                                            <button key={s.id} onClick={() => setCodeContent(s.content)} className="w-full text-left text-[9px] p-1.5 bg-gray-50 hover:bg-gray-100 rounded border border-gray-100 flex justify-between">
                                                <span>Version</span> <span className="text-gray-400">{s.time}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>

    {/* Monaco Editor - Fixed for better page scrolling */}
    <div className="flex-1 w-full relative min-h-0" onClick={() => setSettingsOpen(false)}> 
    <Editor

        onMount={(editor) => {
    editorRef.current = editor;

    // Monitor Selection (this includes cursor position + highlighted text)
    editor.onDidChangeCursorSelection((e) => {
        if (socket && roomId) {
            socket.emit('cursor-move', {
                roomId,
                selection: e.selection, // Sends the full range
                label: userName // Optional: Send name for the tooltip
            });
        }
    });
}}
        
        height="100%" 
        language={language}
        value={codeContent || ""} 
        theme={editorTheme === 'vs-dark' ? 'vs-dark' : 'vs-light'}
        /* Using our Mirror handler */
        onChange={handleCodeChange}
        options={{
            minimap: { enabled: false },
            fontSize: fontSize,
            automaticLayout: true,
            wordWrap: "on",
            lineNumbers: "on",
            cursorBlinking: "smooth",
            scrollBeyondLastLine: false,
            scrollbar: {
                alwaysConsumeMouseWheel: false,
                verticalScrollbarSize: 8,
            },
            fixedOverflowWidgets: true,
            fontFamily: "'Fira Code', monospace",
        }}
    />
</div>

    {/* Console Output */}
    {output && language !== 'html' && (
        <div className="h-32 md:h-40 bg-[#0d0d0d] text-green-400 p-3 font-mono text-[11px] overflow-y-auto border-t border-gray-800 shadow-inner">
            <div className="flex justify-between items-center text-gray-500 mb-2 border-b border-gray-800/50 pb-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Console Terminal</span>
                <button onClick={() => setOutput("")} className="hover:text-red-500 text-[10px] font-bold bg-gray-900 px-2 py-0.5 rounded border border-gray-800 transition-colors">CLEAR</button>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">{output}</div>
        </div>
    )}
</div>

                            </div>

                            {/* Right Side - Participants Panel */}
                            <div className={`w-full lg:w-80 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-0 ${mobileSessionTab !== 'participants' ? 'hidden lg:flex' : ''}`}>
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
                                    <p className="text-sm text-gray-600 mt-1">{participants.length} online</p>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {participants.map(participant => (
                                        <div
                                            key={participant.id}
                                            className={`p-3 rounded-lg border transition-all ${
                                                participant.isSpeaking 
                                                    ? 'border-[#0663cc] bg-blue-50' 
                                                    : 'border-gray-200 bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="relative">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs ${
                                                            participant.isHost ? 'bg-[#0663cc]' : 'bg-gray-400'
                                                        }`}>
                                                            {participant.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                                            participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                                        }`}></div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm text-gray-900 truncate">
                                                                {participant.name}
                                                            </span>
                                                            {participant.isHost && (
                                                                <span className="text-xs bg-[#0663cc] text-white px-2 py-0.5 rounded">Host</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {participant.isMuted ? (
                                                                <span className="text-xs text-red-500">🔇 Muted</span>
                                                            ) : (
                                                                <span className="text-xs text-green-500">🎤 Active</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isHost && !participant.isHost && (
                                                    <div className="flex items-center gap-1 ml-2">
                                                        <button
                                                            onClick={() => handleMuteParticipant(participant.id)}
                                                            className="p-1.5 hover:bg-gray-200 rounded transition-all"
                                                            title={participant.isMuted ? "Unmute" : "Mute"}
                                                        >
                                                            {participant.isMuted ? '🔊' : '🔇'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveParticipant(participant.id)}
                                                            className="p-1.5 hover:bg-red-100 rounded transition-all text-red-500"
                                                            title="Remove"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Voice Controls */}
                                <div className="p-4 border-t border-gray-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Voice Controls</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleMuteToggle}
                                            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                                isMuted 
                                                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                            }`}
                                        >
                                            {isMuted ? '🔇 Unmute' : '🎤 Mute'}
                                        </button>
                                        <button
                                            onMouseDown={() => setIsPushToTalk(true)}
                                            onMouseUp={() => setIsPushToTalk(false)}
                                            onMouseLeave={() => setIsPushToTalk(false)}
                                            onTouchStart={() => setIsPushToTalk(true)}
                                            onTouchEnd={() => setIsPushToTalk(false)}
                                            onTouchCancel={() => setIsPushToTalk(false)}
                                            onPointerDown={() => setIsPushToTalk(true)}
                                            onPointerUp={() => setIsPushToTalk(false)}
                                            onPointerCancel={() => setIsPushToTalk(false)}
                                            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                                isPushToTalk 
                                                    ? 'bg-[#0663cc] hover:bg-[#0552a8] text-white' 
                                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                            }`}
                                        >
                                            Push to Talk
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div> 

            {!isInSession && (
                <footer className = "w-full pt-12 md:pt-20 pb-8 flex justify-center items-center bg-[#f7f9fc] text-sm gap-1 mt-12">
                    <span className = 'text-lg'>&copy;</span>
                    <span className = ''>CodexView 2026. All rights reserved.</span>
                </footer>
            )}

        </main>
        
    )
}

export default Homepage;