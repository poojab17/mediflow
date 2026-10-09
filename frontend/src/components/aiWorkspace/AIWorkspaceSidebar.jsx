const AIWorkspaceSidebar = () => {
    return (
        <div className="w-72 bg-slate-950 text-white flex flex-col">

            <div className="p-5 border-b border-slate-800">

                <h1 className="text-2xl font-bold text-cyan-400">
                    CuraDesk AI
                </h1>

                <p className="text-sm text-slate-400 mt-1">
                    Medical Intelligence
                </p>

                <button
                    className="
                    w-full
                    mt-5
                    bg-cyan-500
                    hover:bg-cyan-600
                    py-3
                    rounded-2xl"
                >
                    + New Chat
                </button>

            </div>

            <div className="flex-1 p-4">

                <p className="text-xs text-slate-500 mb-4">
                    RECENT CHATS
                </p>

                <div className="space-y-2">

                    <div className="bg-slate-900 p-3 rounded-xl">
                        Sample Chat 1
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl">
                        Sample Chat 2
                    </div>

                </div>

            </div>

        </div>
    );
};

export default AIWorkspaceSidebar;