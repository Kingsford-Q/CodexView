import React from 'react';

const JoinMirroredRoom = ({
    joinRoomKey,
    setJoinRoomKey,
    joinRoomName,
    setJoinRoomName,
    joinRoomError,
    setJoinRoomError,
    handleJoinRoom,
    handleNavClick,
}) => {

    const handleSubmit = (e) => {
        e.preventDefault();
        handleJoinRoom(e);
    };

    return (
        <div className="w-full flex flex-col justify-center items-center lg:-mt-20 -mt-3 md:mt-0 md:grow">
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

                <form className="space-y-6" onSubmit={handleSubmit}>
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
                    handleNavClick('home');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 mt-4 transition-colors"
            >
                Cancel
            </button>
        </div>
    );
};

export default JoinMirroredRoom;
