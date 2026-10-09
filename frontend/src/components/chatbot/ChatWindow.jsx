import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  useUser,
  useAuth
} from "@clerk/clerk-react";

import { UploadCloud } from "lucide-react";

import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

const ChatWindow = ({ onClose }) => {

  const { user } = useUser();

  const { getToken } =
    useAuth();

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text:
        "Hi 👋 Tell me your symptoms or upload a medical report.",
    },
  ]);

  const [loading, setLoading] =
    useState(false);

  // REPORT STATES
  const [file, setFile] =
    useState(null);

  const [

    restoredFileName,

    setRestoredFileName

  ] = useState(

    localStorage.getItem(
      "reportFileName"
    ) || ""
  );

  const [uploading, setUploading] =
    useState(false);

  const [

    reportUploaded,

    setReportUploaded

  ] = useState(

    !!localStorage.getItem(

      "reportHash"

    )
  );

  const [

    currentReportHash,

    setCurrentReportHash

  ] = useState(

    localStorage.getItem(

      "reportHash"

    ) || null
  );

  const historyLoaded =

    useRef(false);

  // AUTO SCROLL
  const bottomRef = useRef(null);

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

  }, [messages]);

  useEffect(() => {

    if (

      !user ||

      historyLoaded.current

    ) return;

    const loadHistory =

      async () => {

        try {

          const token =
            await getToken();

          const res =
            await axios.get(

              "http://localhost:4000/api/rag/history",

              {

                params: {

                  reportHash:
                    currentReportHash || null,
                },

                headers: {

                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const clearedAt =

            Number(

              localStorage.getItem(

                "chatClearedAt"

              )

            ) || 0;

          const oneHourAgo =

            Date.now()

            -

            60 * 60 * 1000;

          const effectiveClearTime =

            Math.max(

              clearedAt,

              oneHourAgo
            );

          const formatted =
            res.data
              .filter(
                (msg) =>
                  new Date(
                    msg.createdAt
                  ).getTime()
                  >
                  effectiveClearTime
              )
              .map((msg) => ({

                sender:
                  msg.role === "assistant"
                    ? "bot"
                    : "user",

                text:
                  msg.text,

                doctors:
                  msg.doctors || [],

                safety:
                  msg.safety || null,

                type:
                  msg.type || null,
              }));

          if (formatted.length > 0) {

            setMessages(formatted);

          } else {

            setMessages([
              {
                sender: "bot",
                text:
                  "Hi 👋 Tell me your symptoms or upload a medical report.",
              },
            ]);
          }
        }
        catch (err) {

          console.log(
            "History load failed",
            err
          );
        }
        finally {
          historyLoaded.current =
            true;
        }
      };

    loadHistory();

  }, [

    reportUploaded,

    currentReportHash
  ]);

  // UPLOAD REPORT
  const uploadReport = async () => {

    if (!user) {

      alert(
        "Please login first"
      );

      return;
    }

    if (!file) return;

    try {

      setUploading(true);

      const token =
        await getToken();

      const formData = new FormData();

      formData.append(
        "report",
        file
      );

      const res =
        await axios.post(

          "http://localhost:4000/api/reports/upload",

          formData,

          {
            headers: {

              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      setReportUploaded(true);

      setCurrentReportHash(
        res.data.reportHash
      );

      setRestoredFileName(
        file.name
      );

      localStorage.setItem(
        "reportHash",
        res.data.reportHash
      );

      localStorage.setItem(
        "reportFileName",
        file.name
      );

      setMessages([
        {
          sender: "bot",
          text:
            "✅ Report uploaded successfully.\nYou can now ask questions about your report.",
        },
      ]);

    } catch (err) {

      console.log(
        "FULL ERROR:",
        err
      );

      console.log(
        "ERROR RESPONSE:",
        err.response
      );

      console.log(
        "ERROR DATA:",
        err.response?.data
      );

      alert("Upload failed ❌");
    } finally {

      setUploading(false);
    }
  };

  // SEND MESSAGE
  const sendMessage = async (text) => {

    const userMsg = {
      sender: "user",
      text,
    };

    setMessages((prev) => [
      ...prev,
      userMsg,
    ]);

    setLoading(true);

    try {

      let res;

      // RAG MODE
      if (reportUploaded) {

        const token =
          await getToken();

        res = await axios.post(

          "http://localhost:4000/api/rag/ask",

          {

            question: text,

            reportHash:
              currentReportHash,
          },

          {

            headers: {

              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        const botMsg = {

          sender: "bot",

          text:
            res.data.answer,

          context:
            res.data.context || "",

          doctors:
            res.data.doctors || [],

          safety:
            res.data.safety || null,

          selectedAgents:
            res.data.selectedAgents || [],

          type:
            res.data.type || null,
        };

        setMessages((prev) => [

          ...prev,

          botMsg,
        ]);
      }

      // NORMAL CHATBOT
      else {

        res = await axios.post(

          "http://localhost:4000/api/chatbot",

          {
            message: text,
          }

        );

        const botMsg = {

          sender: "bot",

          text:
            res.data.reply,

          doctors:
            res.data.doctors,

          safety:
            res.data.safety || null,

          type:
            res.data.type,
        };

        setMessages((prev) => [

          ...prev,

          botMsg,
        ]);
      }

    } catch (err) {

      console.error(
        "CHAT ERROR:",
        err
      );

      setMessages((prev) => [

        ...prev,

        {

          sender: "bot",

          text:
            "❌ Something went wrong.",
        },
      ]);

    } finally {

      setLoading(false);
    }
  };

  return (

    <div
      className="
      fixed bottom-20 right-6
      w-[380px]
      h-[650px]
      backdrop-blur-2xl
      bg-white/30
      border border-white/30
      rounded-3xl
      shadow-2xl
      flex flex-col
      overflow-hidden
      z-50"
    >

      {/* HEADER */}
      <div
        className="
        flex justify-between items-center
        px-5 py-1
        border-b border-white/20
        bg-white/20 backdrop-blur-xl"
      >

        <div>

          <p className="font-bold text-lg text-gray-800">
            CuraDesk AI
          </p>

          <p className="text-xs text-gray-500">
            Smart Health Assistant
          </p>

        </div>

        <button

          onClick={() => {

            setMessages([
              {
                sender: "bot",
                text:
                  "Hi 👋 Tell me your symptoms or upload a medical report.",
              },
            ]);

            setFile(null);

            setReportUploaded(false);

            setCurrentReportHash(null);

            historyLoaded.current =
              false;

            localStorage.removeItem(
              "reportHash"
            );

            setRestoredFileName("");

            localStorage.removeItem(
              "reportFileName"
            );

            localStorage.setItem(
              "chatClearedAt",
              Date.now()
            );
          }}

          className="
  text-xs
  bg-red-100
  text-red-600
  px-3 py-1
  rounded-lg
  mr-2
  hover:bg-red-200
  transition-all"
        >

          Clear Chat

        </button>

        <button
          onClick={onClose}
          className="
          text-red-500 text-xl
          hover:scale-110
          transition-all"
        >
          ✖
        </button>
      </div>

      {/* REPORT UPLOAD */}
      <div
        className="
        px-3 py-0
        border-b border-white/20
        bg-white/10"
      >



        {/* MODERN UPLOAD BOX */}
        <label
          className="
          flex flex-col items-center justify-center
          w-full p-1
          border-2 border-dashed border-blue-300
          rounded-2xl cursor-pointer
          bg-blue-50/40 hover:bg-blue-100/40
          transition-all duration-300
          text-center"
        >

          <UploadCloud
            className="text-blue-600 mb-2"
            size={38}
          />

          <p className="text-sm font-semibold text-gray-700">
            Click to Upload Medical Report
          </p>

          <p className="text-xs text-gray-500 mt-1">
            PDF files only
          </p>

          {
            (file || restoredFileName) && (
              <p className="text-xs text-green-600 mt-2 break-all">
                Selected:

                {

                  file
                    ? file.name
                    : restoredFileName

                }
              </p>
            )
          }

          <input
            type="file"
            accept=".pdf"
            onChange={(e) =>
              setFile(
                e.target.files[0]
              )
            }
            className="hidden"
          />
        </label>

        {/* UPLOAD BUTTON */}
        <button
          onClick={uploadReport}
          disabled={!file || uploading}
          className="
          mt-1 w-full
          bg-blue-600 hover:bg-blue-700
          disabled:bg-gray-300
          text-white py-2.5 rounded-xl
          text-sm font-medium
          transition-all"
        >
          {
            uploading
              ? "Uploading..."
              : "Upload Report"
          }
        </button>

        {/* SUCCESS */}
        {
          reportUploaded &&
          currentReportHash && (

            <div
              className="
      mt-3 text-xs text-green-700
      bg-green-100 border border-green-200
      rounded-xl p-3"
            >
              ✅ Report uploaded successfully.
              <br />
              Ask questions about your report now.
            </div>
          )
        }
      </div>

      {/* MESSAGES */}
      <div
        className="
        flex-1 p-4
        overflow-y-auto
        space-y-3"
      >

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
          />
        ))}

        {/* LOADING */}
        {loading && (

          <div className="text-sm text-gray-500">
            AI is thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <ChatInput
        sendMessage={sendMessage}
        reportUploaded={reportUploaded}
      />

    </div>
  );
};

export default ChatWindow;