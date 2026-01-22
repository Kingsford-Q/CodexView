import React from 'react';

const CreateMirroredRoom = ({
    roomName,
    setRoomName,
    subject,
    setSubject,
    errors,
    setErrors,
    handleSubmit,
    roomCreated,
    roomId,
    copied,
    handleCopyRoomId,
    handleStartSession,
    handleCancel
}) => {
    return (
        <div className="w-full flex flex-col justify-center items-center lg:-mt-20 -mt-3 md:mt-0 md:grow">
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
    )
}

export default CreateMirroredRoom;
