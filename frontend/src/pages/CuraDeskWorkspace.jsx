import { useState } from "react";

import AIWorkspaceSidebar from "../components/aiWorkspace/AIWorkspaceSidebar";
import ConversationFeed from "../components/aiWorkspace/ConversationFeed";
import AIComposer from "../components/aiWorkspace/AIComposer";
import AIWelcomeScreen from "../components/aiWorkspace/AIWelcomeScreen";

const CuraDeskWorkspace = () => {

    const [messages, setMessages] = useState([]);

    const [input, setInput] = useState("");

    const sendMessage = () => {

        if (!input.trim()) return;

        const userMessage = {
            role: "user",
            text: input,
        };

        setMessages(prev => [
            ...prev,
            userMessage,
        ]);

        setInput("");
    };

    return (

        <div className="h-screen flex bg-slate-50">

            <AIWorkspaceSidebar />

            <div className="flex-1 flex flex-col">

                <div className="h-16 border-b bg-white flex items-center px-6">

                    <h2 className="font-semibold text-slate-700">
                        CuraDesk AI Workspace
                    </h2>

                </div>

                {
                    messages.length > 0
                        ? (
                            <ConversationFeed
                                messages={messages}
                            />
                        )
                        : (
                            <AIWelcomeScreen />
                        )
                }

                <AIComposer
                    input={input}
                    setInput={setInput}
                    sendMessage={sendMessage}
                />

            </div>

        </div>

    );
};

export default CuraDeskWorkspace;