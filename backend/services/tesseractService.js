import Tesseract
from "tesseract.js";

const extractTextWithTesseract =
  async (imagePath) => {

    try {

      const result =
        await Tesseract.recognize(

          imagePath,

          "eng"
        );

      return result.data.text;

    } catch (err) {

      console.log(
        "TESSERACT ERROR:",
        err
      );

      return "";
    }
};

export default
extractTextWithTesseract;