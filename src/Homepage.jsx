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

    const handleSubmit = (e) => { e.preventDefault();

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

        const roomId = crypto.randomUUID();

        console.log({
            roomName,
            subject,
            roomId,
        });
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
                        {["home", "create-room", "join-room", "help"].map((tab) => (
                            <div
                            key={tab}
                            onClick={() => setActiveTab(tab)}
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
                        onClick = { () => setActiveTab('home') }
                        className = { `font-medium text-sm cursor-pointer ${ activeTab === 'home' ? 'text-[#0663cc]' : 'text-black' } `}>
                            Home
                        </div>

                        <div
                        onClick = { () => setActiveTab('create-room') }
                        className = { `font-medium text-sm cursor-pointer ${ activeTab === 'create-room' ? 'text-[#0663cc]' : 'text-black' } `}>
                            Create Room
                        </div>

                        <div
                        onClick = { () => setActiveTab('join-room') }
                        className = { `font-medium text-sm cursor-pointer ${ activeTab === 'join-room' ? 'text-[#0663cc]' : 'text-black' } `}>
                            Join Room
                        </div>

                        <div
                        onClick = { () => setActiveTab('help') }
                        className = { `font-medium text-sm cursor-pointer ${ activeTab === 'help' ? 'text-[#0663cc]' : 'text-black' } `}>
                            Help
                        </div>
                    </div>
                </nav>
            </div>

            <div className = "grow flex flex-col items-center w-full pt-16 md:pt-28">

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
                    <div className = "w-full flex justify-center items-center lg:-mt-20 -mt-3 md:mt-0 md:grow">
                        <div className="md:w-full lg:max-w-lg md:max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10">

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
                        </div>

                    </div>
                )}

            </div> 

            <footer className = "w-full pt-12 md:pt-20 pb-8 flex justify-center items-center bg-[#f7f9fc] text-sm gap-1 mt-12">
                <span className = 'text-lg'>&copy;</span>
                <span className = ''>CodexView 2026. All rights reserved.</span>
            </footer>

        </main>
        
    )
}

export default Homepage;