const ConversationFeed = ({
    messages,
}) => {

    return (

        <div className="flex-1 overflow-y-auto">

            <div className="max-w-4xl mx-auto py-10">

                {messages.map(
                    (message, index) => (

                        <div
                            key={index}
                            className={
                                message.role === "user"
                                    ? "flex justify-end mb-4"
                                    : "flex justify-start mb-4"
                            }
                        >

                            <div
                                className={
                                    message.role === "user"
                                        ? "bg-cyan-500 text-white px-4 py-3 rounded-3xl"
                                        : "bg-white px-4 py-3 rounded-3xl shadow-sm"
                                }
                            >

                                {message.text}

                            </div>

                        </div>
                    )
                )}

            </div>

        </div>

    );
};

export default ConversationFeed;