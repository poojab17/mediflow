const cleanPdfText = (text) => {

  return text

    // =========================
    // REMOVE LINE BREAKS/TABS
    // =========================

    .replace(/[\r\n\t]+/g, " ")

    // =========================
    // NORMALIZE SPACES
    // =========================

    .replace(/\s+/g, " ")

    // =========================
    // FIX TRUE OCR LETTER SPACING
    // Example:
    // T e c h n o l o g y
    // → Technology
    // =========================

    .replace(

      /\b(?:[A-Za-z]\s){3,}[A-Za-z]\b/g,

      (match) => {
        return match.replace(/\s/g, "");
      }
    )

    // =========================
    // ADD SPACE BETWEEN
    // lowercaseUppercase
    // Example:
    // AdmitCard → Admit Card
    // =========================

    .replace(

      /([a-z])([A-Z])/g,

      "$1 $2"
    )

    // =========================
    // ADD SPACE BETWEEN
    // TEXT + NUMBER
    // Example:
    // EE302 → EE 302
    // =========================

    .replace(

      /([a-zA-Z])(\d)/g,

      "$1 $2"
    )

    .replace(

      /(\d)([a-zA-Z])/g,

      "$1 $2"
    )

    // =========================
    // FIX PUNCTUATION SPACING
    // =========================

    .replace(

      /\s([,.!?])/g,

      "$1"
    )

    // =========================
    // REMOVE DUPLICATE SENTENCES
    // =========================

    .split(". ")

    .filter((item, index, arr) => {

      return arr.indexOf(item)
        === index;
    })

    .join(". ")

    // =========================
    // FINAL SPACE CLEANUP
    // =========================

    .replace(/\s+/g, " ")

    .trim();
};

export default cleanPdfText;