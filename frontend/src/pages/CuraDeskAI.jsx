import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";

const CuraDeskAI = () => {
    const { getToken } = useAuth();

    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentReportHash, setCurrentReportHash] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [restoredFileName, setRestoredFileName] = useState(localStorage.getItem("reportFileName") || "");
    const [uploadPreview, setUploadPreview] = useState(null);

    const bottomRef = useRef(null);

    const loadHistory = async (session) => {
        try {
            const token = await getToken();

            const res = await axios.get(
                "http://localhost:4000/api/rag/history",
                {
                    params: {
                        reportHash: session.reportHash,
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setMessages(res.data);
            setActiveSession(session);
            setCurrentReportHash(session.reportHash);

            localStorage.setItem(
                "activeSession",
                JSON.stringify(session)
            );

            if (session.fileName) {
                setRestoredFileName(session.fileName);
                localStorage.setItem(
                    "reportFileName",
                    session.fileName
                );
            }

        } catch (err) {
            console.log("History failed", err);
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        try {
            setLoading(true);

            const token = await getToken();

            const userMsg = {
                role: "user",
                text: input,
            };

            setMessages((prev) => [...prev, userMsg]);

            const res = await axios.post(
                "http://localhost:4000/api/rag/ask",
                {
                    question: input,
                    reportHash: currentReportHash,
                    fileName:
                        restoredFileName,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const botMsg = {
                role: "assistant",
                text: res.data.answer,
            };

            setMessages((prev) => [...prev, botMsg]);

            await loadSessions();

            const updatedSessions =
                await axios.get(
                    "http://localhost:4000/api/rag/sessions",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

            setSessions(updatedSessions.data);

            if (updatedSessions.data.length > 0) {

                const newest =
                    updatedSessions.data[0];

                setActiveSession(newest);

                localStorage.setItem(
                    "activeSession",
                    JSON.stringify(newest)
                );
            }

            setInput("");

        } catch (err) {
            console.log(
                "CHAT ERROR:",
                err.response?.data || err.message || err
            );
        } finally {
            setLoading(false);
        }
    };

    const uploadReport = async (e) => {
        const selected =
            e.target.files[0];

        setUploadPreview(
            selected
        );
        if (!selected) return;

        try {
            setUploading(true);

            const token = await getToken();

            const formData = new FormData();
            formData.append("report", selected);

            const res = await axios.post(
                "http://localhost:4000/api/rag/upload",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setCurrentReportHash(res.data.reportHash);

            setUploadPreview(selected);

            await loadSessions();

            setRestoredFileName(selected.name);

            localStorage.setItem(
                "reportHash",
                res.data.reportHash
            );

            localStorage.setItem(
                "reportFileName",
                selected.name
            );



        } catch (err) {
            console.log(err);
        } finally {
            setUploading(false);
        }
    };
    const loadSessions = async () => {
        try {
            const token = await getToken();

            const res = await axios.get(
                "http://localhost:4000/api/rag/sessions",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setSessions(res.data);

        } catch (err) {
            console.log("Session load failed", err);
        }
    };

    useEffect(() => {
        loadSessions();
        const saved =
            localStorage.getItem("activeSession");
        if (saved) {
            loadHistory(JSON.parse(saved));
        }
        const savedFile =
            localStorage.getItem(
                "reportFileName"
            );
        if (savedFile) {
            setRestoredFileName(
                savedFile
            );
            setUploadPreview({
                name: savedFile,
                size: 0,
            });
        }
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    return (
        <div className="h-screen flex bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50">

            {/* Sidebar */}
            <div className="w-72 bg-slate-950 text-white flex flex-col border-r border-slate-800">

                <div className="p-5 border-b border-slate-800">
                    <h2 className="text-2xl font-bold text-cyan-400">
                        CuraDesk AI
                    </h2>

                    <p className="text-sm text-slate-400 mt-1">
                        Smart Medical Assistant
                    </p>

                    <button
                        className="mt-5 w-full bg-cyan-500 hover:bg-cyan-600 transition py-3 rounded-2xl font-medium"
                        onClick={() => {
                            setMessages([]);
                            setActiveSession(null);
                            setCurrentReportHash(null);
                            setInput("");
                            setRestoredFileName("");
                            setUploadPreview(null);

                            localStorage.removeItem("activeSession");
                            localStorage.removeItem("reportHash");
                            localStorage.removeItem("reportFileName");
                        }} >
                        + New Chat
                    </button>
                </div>

                {/* Sessions */}
                <div className="flex-1 overflow-y-auto p-4">

                    <p className="text-xs text-slate-500 mb-4">
                        RECENT CHATS
                    </p>

                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <div
                                key={session._id}
                                onClick={() => loadHistory(session)}
                                className={`p-4 rounded-2xl cursor-pointer transition ${activeSession?._id === session._id
                                    ? "bg-cyan-600 text-white"
                                    : "bg-slate-900 hover:bg-slate-800 text-slate-200"}`}>
                                {session.reportHash
                                    ? `📄 ${session.fileName || "Report Chat"}`
                                    : "💬 Symptoms Chat"}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col">

                {/* Header */}
                <div className="px-8 py-5 flex justify-between items-center">

                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">
                            CuraDesk AI
                        </h1>

                        <p className="text-slate-500">
                            Medical Report + Symptom Intelligence
                        </p>
                    </div>

                    <div className="flex gap-3">

                        <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm">
                            Memory ON
                        </span>

                        <span className="bg-cyan-100 text-cyan-700 px-4 py-2 rounded-full text-sm">
                            AI Ready
                        </span>

                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 overflow-y-auto px-8">

                    <div className="max-w-4xl mx-auto pt-10">

                        {activeSession && (
                            <div className="mb-8 bg-white rounded-3xl shadow-sm p-5">
                                <p className="font-medium">
                                    Active Session
                                </p>

                                <p className="text-slate-500 text-sm mt-1">
                                    {activeSession.reportHash
                                        ? "Report Chat"
                                        : "Symptoms Chat"}
                                </p>
                            </div>
                        )}

                        {messages.length > 0 ? (

                            <div className="space-y-5 pb-10">

                                {messages.map((msg, index) => (

                                    <div
                                        key={index}
                                        className={
                                            msg.role === "user"
                                                ? "flex justify-end"
                                                : "flex justify-start"
                                        }
                                    >

                                        <div
                                            className={
                                                msg.role === "user"
                                                    ? "bg-cyan-500 text-white px-5 py-4 rounded-3xl max-w-2xl"
                                                    : "bg-white shadow-sm px-5 py-4 rounded-3xl max-w-2xl"
                                            }
                                        >
                                            {msg.text}
                                        </div>

                                    </div>

                                ))}

                                <div ref={bottomRef} />

                            </div>

                        ) : (

                            <div className="text-center mt-20">

                                <h2 className="text-5xl font-bold text-slate-800">
                                    🧠 CuraDesk AI
                                </h2>

                                <p className="text-slate-500 mt-4 text-lg">
                                    Upload reports, ask symptoms, and receive AI medical guidance.
                                </p>

                                <div className="grid grid-cols-3 gap-5 mt-12">

                                    <div className="bg-white shadow-sm rounded-3xl p-6">
                                        📄 Report Analysis
                                    </div>

                                    <div className="bg-white shadow-sm rounded-3xl p-6">
                                        🩺 Symptom Intelligence
                                    </div>

                                    <div className="bg-white shadow-sm rounded-3xl p-6">
                                        👨‍⚕️ Doctor Guidance
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input */}

                <div className="p-6">
                    {
                        uploadPreview && (
                            <div
                                className="max-w-4xl mx-auto mb-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between" >

                                <div className="flex items-center gap-3">
                                    <div className=" w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                                        📄
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-700">
                                            {
                                                uploadPreview.name
                                            }
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {
                                                Math.round(
                                                    uploadPreview.size /
                                                    1024
                                                )
                                            }
                                            KB
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {
                                        uploading ? (
                                            <p className="text-sm text-cyan-500">
                                                Uploading...
                                            </p>
                                        ) : (
                                            <p className="text-sm text-green-600">
                                                ✓ Ready
                                            </p>
                                        )
                                    }
                                    <button onClick={() => {
                                        setUploadPreview(null);
                                        setRestoredFileName(
                                            ""
                                        );
                                        setCurrentReportHash(
                                            null
                                        );
                                        localStorage.removeItem(
                                            "reportHash"
                                        );
                                        localStorage.removeItem(
                                            "reportFileName");
                                    }} className=" text-red-400 hover:text-red-600 text-lg">
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )
                    }
                    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-lg p-3 flex items-center gap-3">

                        <label className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer">
                            {uploading ? "..." : "📎"}

                            <input
                                type="file"
                                hidden
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={uploadReport}
                            />
                        </label>

                        <input
                            type="text"
                            placeholder="Ask CuraDesk AI..."
                            value={input}
                            onChange={(e) =>
                                setInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    sendMessage();
                                }
                            }}
                            className="flex-1 outline-none text-lg"
                        />

                        <button
                            onClick={sendMessage}
                            disabled={loading}
                            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl transition"
                        >
                            {loading ? "..." : "Send"}
                        </button>

                    </div>

                    {restoredFileName && (
                        <div className="mt-3 text-center">

                            <p className="text-sm text-green-600">
                                📄 {restoredFileName}
                            </p>

                            <div className="mt-2 text-sm text-green-700 bg-green-100 border border-green-200 rounded-2xl px-4 py-3">
                                ✅ Report uploaded and ready for AI questions
                            </div>

                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CuraDeskAI;
