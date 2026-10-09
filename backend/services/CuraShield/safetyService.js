import axios from "axios";

export const classifySafety =
  async (
    question,
    answer
  ) => {

    try {

      const response =
        await axios.post(

          "http://localhost:8001/safety-classification",

          {
            question,
            answer,
          }
        );

      return response.data;

    } catch {

      return {

        riskLevel: "UNKNOWN",

        severityScore: 0,

        requiresUrgentCare: false,

        recommendedAction: null,

        reason: null,
      };
    }
  };