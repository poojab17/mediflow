import axios from "axios";
import redisClient from "../config/redis.js";

export const askReportWithLangChain =
  async (
    history,
    context,
    question,
    userId
  ) => {

    try {

      const cacheKey =
        `rag:${userId}:${question}`;

      const cached =
        await redisClient.get(
          cacheKey
        );

      if (cached) {

        console.log(
          "RAG CACHE HIT"
        );

        return JSON.parse(
          cached
        );
      }

      console.log(
        "CALLING FASTAPI RAG..."
      );

      const response =
        await axios.post(
          "http://localhost:8001/rag-answer",
          {
            history,
            context,
            question,
          }
        );

      console.log(
        "FASTAPI RAW:",
        response.data
      );

      const answer =
        response.data.answer;

      // FIXED REDIS
      await redisClient.set(
        cacheKey,
        JSON.stringify(answer),
        "EX",
        86400
      );

      console.log(
        "FASTAPI RAG SUCCESS"
      );

      return answer;

    } catch (err) {

      console.log(
        "FASTAPI RAG ERROR:",
        err.response?.data ||
        err.message
      );

      return "AI quota exceeded. Please retry in 1 minute.";
    }
  };

export const streamReportAnswer =
  async (
    history,
    context,
    question
  ) => {

    const response =
      await axios.post(

        "http://localhost:8001/rag-stream",

        {
          history,
          context,
          question,
        },

        {
          responseType:
            "stream",
        }
      );

    return response.data;
  };