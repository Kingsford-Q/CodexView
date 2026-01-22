import React, { useState } from 'react';
import { useEffect, useRef } from "react";

import easy from './assets/easy.svg';
import live from './assets/live.svg';
import team from './assets/team.svg';
import menu from './assets/menu.svg';
import quote from './assets/quot.svg';

import img1 from './assets/img1.jpg';
import img2 from './assets/img2.jpg';
import img3 from './assets/img3.jpg';

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
    
    // Session state
    const [isInSession, setIsInSession] = useState(false);
    const [isHost, setIsHost] = useState(true);
    const [participants, setParticipants] = useState([
        { id: '1', name: 'You', isHost: true, isOnline: true, isMuted: false, isSpeaking: false }
    ]);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [sessionTimer, setSessionTimer] = useState('00:00:00');
    const [codeContent, setCodeContent] = useState('// Welcome to CodexView Live Session\n// Start coding here...\n');
    const [notifications, setNotifications] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isPushToTalk, setIsPushToTalk] = useState(false);
    const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
    
    // Join room state
    const [joinRoomKey, setJoinRoomKey] = useState("");
    const [joinRoomError, setJoinRoomError] = useState("");
    const [joinRoomName, setJoinRoomName] = useState("");

    // Mobile session UI state
    const [mobileSessionTab, setMobileSessionTab] = useState('editor'); // 'editor' | 'participants'


    const menuRef = useRef(null); 

    useEffect(() => {
        const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setMenuOpen(false);
        }
        };

        document.addEventListener("click", handleClickOutside);
        return () => {
        document.removeEventListener("click", handleClickOutside);
        };
    }, []);

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

        const newRoomId = crypto.randomUUID();
        setRoomId(newRoomId);
        setRoomCreated(true);
    };

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStartSession = () => {
        setIsInSession(true);
        setActiveTab('session');
        setSessionStartTime(Date.now());
        setIsHost(true);
        // Add initial notification
        addNotification('Session started successfully!', 'success');
    };

    const handleEndSession = () => {
        setIsInSession(false);
        setActiveTab('home');
        setSessionStartTime(null);
        setSessionTimer('00:00:00');
        setCodeContent('// Welcome to CodexView Live Session\n// Start coding here...\n');
        setParticipants([{ id: '1', name: 'You', isHost: true, isOnline: true, isMuted: false, isSpeaking: false }]);
        setNotifications([]);
        setIsMuted(false);
        setIsPushToTalk(false);
        
        // Reset create room form
        setRoomName("");
        setSubject("");
        setRoomCreated(false);
        setRoomId("");
        setCopied(false);
        setErrors({ roomName: "", subject: "" });
    };

    const handleLeaveSession = () => {
        setIsInSession(false);
        setActiveTab('home');
        setSessionStartTime(null);
        setSessionTimer('00:00:00');
        setNotifications([]);
    };

    const addNotification = (message, type = 'info') => {
        const notification = { id: Date.now(), message, type };
        setNotifications(prev => [...prev, notification]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 3000);
    };

    const handleCopyInviteLink = () => {
        const inviteLink = `${window.location.origin}?room=${roomId}`;
        navigator.clipboard.writeText(inviteLink);
        setInviteLinkCopied(true);
        setTimeout(() => setInviteLinkCopied(false), 2000);
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

        // Check if room key is valid (in a real app, this would check with a backend)
        // For now, we'll simulate joining a room
        // In production, you'd validate the room key and fetch room details
        
        // Simulate successful join
        setIsInSession(true);
        setIsHost(false);
        setRoomId(joinRoomKey);
        setRoomName(joinRoomName || "Joined Room");
        setSubject("Live Coding Session");
        setActiveTab('session');
        setSessionStartTime(Date.now());
        
        // Add user as participant (non-host)
        setParticipants([
            { id: 'host-1', name: 'Host', isHost: true, isOnline: true, isMuted: false, isSpeaking: false },
            { id: '2', name: 'You', isHost: false, isOnline: true, isMuted: false, isSpeaking: false }
        ]);
        
        addNotification('Successfully joined the room!', 'success');
        setJoinRoomKey("");
        setJoinRoomName("");
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


    return(
        <main className = "w-full min-h-screen flex flex-col">
            <div className = "sticky top-0 flex items-center lg:px-10 md:px-6 px-4 md:py-9 py-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] w-full bg-white">
                <nav className = 'flex justify-between items-center w-full'>
                    <div className = "flex justify-center items-center space-x-2">
                        <div className = "text-black font-bold md:text-3xl text-xl">{logo}</div>
                        <div className = "text-black font-medium md:text-2xl lg:text-2xl">CodexView</div>
                    </div>

                    <div className = "flex md:hidden" ref={menuRef}>
                        <div className = "w-10 h-10 flex justify-center items-center">
                            <img src = {menu} className = "w-full object-cover " 
                            onClick = { () => (setMenuOpen(!menuOpen)) }
                            />
                        </div>
                    </div>

                    {menuOpen && (
                        <div className="absolute top-20.5 left-0 flex flex-col justify-center items-center bg-white p-4 shadow-md rounded w-full">
                        {["home", "create-room", "join-room", "help", ...(isInSession ? ["session"] : [])].map((tab) => (
                            <div
                            key={tab}
                            onClick={() => handleNavClick(tab)}
                            className={`flex justify-center items-center font-semibold text-md cursor-pointer w-full py-3 ${
                                activeTab === tab ? "text-[#0663cc]" : "text-black"
                            }`}
                            >
                            {tab.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </div>
                            ))}
                        </div>
                    )}
    

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
                        <div className="md:w-full lg:max-w-lg md:max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10">

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
                        <button
                            onClick={handleCancel}
                            className="text-sm text-gray-500 hover:text-gray-700 mt-4 transition-colors"
                        >
                            Cancel
                        </button>
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

                                {/* Mobile switcher */}
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

                                {/* Live Editor */}
                                <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-0">
                                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm font-semibold text-gray-700">Live Editor</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-gray-600 font-mono">{sessionTimer}</span>
                                            <button
                                                onClick={handleDownloadSession}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded transition-all"
                                            >
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={codeContent}
                                        onChange={(e) => setCodeContent(e.target.value)}
                                        className="flex-1 w-full p-4 font-mono text-sm border-none outline-none resize-none bg-gray-50"
                                        placeholder="Start coding here... All participants will see changes in real-time."
                                    />
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