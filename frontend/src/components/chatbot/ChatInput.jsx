import { useState } from "react";

const ChatInput = ({ sendMessage }) => {
  const [text, setText] = useState("");

  return (
    <div className="flex items-center gap-2 p-2 border-t border-white/20 backdrop-blur-md">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type symptoms..."
        className="flex-1 px-3 py-2 rounded-full text-sm outline-none bg-white/40 backdrop-blur"
      />

      <button
        onClick={() => {
          if (!text) return;
          sendMessage(text);
          setText("");
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm shadow"
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput;