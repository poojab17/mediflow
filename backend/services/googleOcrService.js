import vision
from "@google-cloud/vision";

// CREATE CLIENT

const client =
  new vision.ImageAnnotatorClient({

    keyFilename:
      "config/google-vision-key.json",
  });

// OCR FUNCTION

const extractTextWithGoogleOCR =
  async (imagePath) => {

    try {

      const [result] =
        await client.textDetection(
          imagePath
        );

      const detections =
        result.textAnnotations;

      return detections[0]
        ? detections[0].description
        : "";

    } catch (err) {

      console.log(
        "GOOGLE OCR ERROR:",
        err
      );

      return "";
    }
};

export default extractTextWithGoogleOCR;