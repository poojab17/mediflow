import axios from "axios";
import redisClient from "../config/redis.js";
import crypto from "crypto";

export const summarizeMedicalReport =
  async (
    reportText,
    userId
  ) => {

    try {

      const reportHash =
        crypto
          .createHash("sha256")
          .update(reportText)
          .digest("hex");

      const cacheKey =
        `summary:v2:${userId}:${reportHash}`;

      // CACHE CHECK
      const cached =
        await redisClient.get(
          cacheKey
        );

      if (cached) {

        console.log(
          "SUMMARY CACHE HIT"
        );

        return JSON.parse(
          cached
        );
      }

      console.log(
        "CALLING FASTAPI SUMMARY..."
      );

      const response =
        await axios.post(
          "http://localhost:8001/summarize",
          {
            text:
              reportText,
          }
        );

      const summary =
        response.data;

      // REDIS SAVE
      await redisClient.set(
        cacheKey,
        JSON.stringify(summary),
        "EX",
        86400
      );

      console.log(
        "FASTAPI SUMMARY SUCCESS"
      );

      return summary;

    } catch (err) {

      console.log(
        "FASTAPI SUMMARY ERROR:",
        err.response?.data ||
        err.message
      );

      return {

        short_summary:
          "AI quota exceeded.",

        important_findings:
          "Please retry in 1 minute.",

        possible_abnormalities:
          "Unavailable",

        patient_explanation:
          "Gemini API temporary rate limit reached."
      };
    }
  };

export const processReportAI =
  async (
    text
  ) => {

    const response =
      await fetch(

        "http://localhost:8001/process-report",

        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({

              text
            }),
        }
      );

    if (
      !response.ok
    ) {

      throw new Error(
        "FastAPI report processing failed"
      );
    }

    return await response.json();
  };

export const ocrReportAI =
  async (
    fileBuffer
  ) => {

    const formData =
      new FormData();

    const blob =
      new Blob(
        [fileBuffer],
        {
          type:
            "application/pdf",
        }
      );

    formData.append(
      "file",
      blob,
      "report.pdf"
    );

    const response =
      await fetch(

        "http://localhost:8001/ocr-report",

        {

          method:
            "POST",

          body:
            formData,
        }
      );

    if (
      !response.ok
    ) {

      throw new Error(
        "FastAPI OCR failed"
      );
    }

    return await response.json();
  };