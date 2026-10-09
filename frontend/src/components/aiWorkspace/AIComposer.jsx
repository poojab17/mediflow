const AIComposer = ({
    input,
    setInput,
    sendMessage,
}) => {

    return (

        <div className="p-5 border-t bg-white">

            <div className="max-w-4xl mx-auto flex gap-3">

                <button
                    className="
                    w-12
                    h-12
                    rounded-2xl
                    bg-slate-100"
                >
                    📎
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={(e) =>
                        setInput(
                            e.target.value
                        )
                    }
                    onKeyDown={(e) => {

                        if (
                            e.key === "Enter"
                        ) {
                            sendMessage();
                        }

                    }}
                    placeholder="Ask CuraDesk AI..."
                    className="
                    flex-1
                    border
                    rounded-2xl
                    px-4"
                />

                <button
                    onClick={sendMessage}
                    className="
                    bg-cyan-500
                    text-white
                    px-6
                    rounded-2xl"
                >
                    Send
                </button>

            </div>

        </div>

    );
};

export default AIComposer;