import { summarizeMedicalReport } from "./reportAIService.js";
import Doctor from "../models/doctor.js";
import { analyzeSymptoms } from "./aiService.js";
import { GoogleGenAI } from "@google/genai";
import { askReportWithLangChain } from "./langchainReportService.js";

export const ragNode =
    async (state) => {

        console.log(
            "RAG NODE"
        );

        const answer =
            await askReportWithLangChain(
                state.history,
                state.relevantChunks,
                state.question,
                state.userId
            );

        return {

            node:
                "rag",

            partialAnswers: [

                ...(state.partialAnswers || []),

                `REPORT:\n${answer}`
            ],
        };
    };

export const summaryNode =
    async (state) => {

        console.log(
            "SUMMARY NODE"
        );

        const answer =
            await summarizeMedicalReport(

                state.relevantChunks,
                state.userId
            );

        const formattedSummary = `

🩺 Short Summary:
${answer.short_summary}

📌 Important Findings:
${answer.important_findings}

⚠ Possible Abnormalities:
${answer.possible_abnormalities}

💡 Patient Explanation:
${answer.patient_explanation}
`;
        return {

            node:
                "summary",

            partialAnswers: [

                ...(state.partialAnswers || []),

                `SUMMARY:\n${formattedSummary}`
            ],
        };
    };

// SYMPTOPM ANALYSIS + DOCTOR RECOMMENDATION NODE

export const symptomNode =
    async (state) => {

        console.log(
            "SYMPTOM NODE"
        );

        const aiResponse =
            await analyzeSymptoms(
                state.question
            );

        console.log(
            "AI RESPONSE:",
            aiResponse
        );

        const specialization =
            aiResponse.specialization;

        const today =
            new Date()
                .toISOString()
                .split("T")[0];

        const doctors =
            await Doctor.find({

                specialization,

                availability:
                    "Available",

            }).lean();

        const availableDoctors =
            doctors
                .map((doc) => {

                    const slots =
                        doc.schedule?.[today] || [];

                    return {

                        _id:
                            doc._id,

                        name:
                            doc.name,

                        specialization:
                            doc.specialization,

                        fee:
                            doc.fee,

                        imageUrl:
                            doc.imageUrl,

                        rating:
                            doc.rating,

                        availableSlots:
                            slots,
                    };
                });

        return {

            node:
                "symptom",

            doctors:
                availableDoctors,

            partialAnswers: [

                ...(state.partialAnswers || []),

                `🏥 Specialist: ${specialization}

⚠ Severity: ${aiResponse.severity}

💡 Advice:
${aiResponse.advice}`
            ],
        };
    };

// ======================
// MEMORY + RAG AGENT
// ======================

export const memoryNode =
    async (state) => {

        console.log(
            "MEMORY + RAG AGENT"
        );

        const history =
            state.history || "";

        const question =
            state.question || "";

        try {

            // ------------------
            // Find last user topic
            // ------------------

            const userMessages =
                history.match(
                    /User:\s(.+)/g
                ) || [];

            const previousQuestion =

                userMessages
                    .slice(-1)[0]
                    ?.replace(
                        "User:",
                        ""
                    )
                    ?.trim() ||

                "";

            console.log(
                "MEMORY TOPIC:",
                previousQuestion
            );

            // ------------------
            // Run RAG again
            // ------------------

            const answer =
                await askReportWithLangChain(

                    history,

                    state.relevantChunks,

                    `${previousQuestion}
${question}`,

                    state.userId
                );

            return {

                node:
                    "memory",

                partialAnswers: [

                    ...(state.partialAnswers || []),

                    `MEMORY:\n${answer}`
                ],
            };
        }

        catch (err) {

            console.log(
                "MEMORY RAG ERROR:",
                err.message
            );

            return {

                node:
                    "memory",

                partialAnswers: [

                    ...(state.partialAnswers || []),

                    "MEMORY:\nI could not recall previous context."
                ],
            };
        }
    };

// ======================
// MERGE NODE
// ======================

export const mergeNode =
    async (state) => {

        console.log(
            "MERGE NODE"
        );

        const merged =

            state.partialAnswers
                ?.join(
                    "\n\n"
                ) ||

            "No response generated.";

        return {

            ...state,

            answer:
                merged,

            doctors:
                state.doctors || [],

            node:
                "merge",
        };
    };