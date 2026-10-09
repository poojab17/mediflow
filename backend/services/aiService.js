import axios from "axios";

export const analyzeSymptoms =
  async (symptomText) => {

    try {

      console.log(
        "CALLING FASTAPI SYMPTOM..."
      );

      const response =
        await axios.post(

          "http://localhost:8001/symptom-analysis",

          {
            symptom:
              symptomText,
          }
        );

      console.log(
        "FASTAPI SYMPTOM SUCCESS"
      );

      return response.data;

    } catch (err) {

      console.log(
        "FASTAPI SYMPTOM ERROR:",
        err.message
      );

      return {

        department:
          "General Physician",

        severity:
          "medium",

        advice:
          "Please consult a doctor.",
      };
    }
  };