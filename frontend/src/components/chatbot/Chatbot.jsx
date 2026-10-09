import { useState } from "react";
import ChatWindow from "./ChatWindow";

const Chatbot = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-xl"
      >
        💬
      </button>

      {open && <ChatWindow onClose={() => setOpen(false)} />}
    </>
  );
};

export default Chatbot;