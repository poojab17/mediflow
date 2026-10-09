export const checkPromptSafety =
  async (question) => {

    const q =
      question.toLowerCase();

    const suspiciousPatterns = [

      "ignore previous instructions",

      "reveal system prompt",

      "show system prompt",

      "developer instructions",

      "hidden prompt",

      "prompt injection",

      "override instructions",

      "disregard previous",

      "jailbreak",

      "ignore all prior",

      "show hidden context",

      "internal prompt"
    ];

    const matched =
      suspiciousPatterns.find(
        pattern =>
          q.includes(pattern)
      );

    if (matched) {

      return {

        allowed: false,

        riskLevel: "HIGH",

        reason:
          `Matched pattern: ${matched}`
      };
    }

    return {

      allowed: true,

      riskLevel: "LOW",

      reason: null
    };
  };