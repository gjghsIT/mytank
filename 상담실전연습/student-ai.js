/**
 * 학생·학부모 역할 — 실시간 AI만 사용 (로컬 스크립트 폴백 없음)
 * API 키 없이 무료 온라인 AI로 대화. Gemini 키가 있으면 우선 사용.
 */
const StudentAI = (function () {
  "use strict";

  const API_KEY_STORAGE = "counseling_gemini_api_key";

  function getApiKey() {
    try {
      return (localStorage.getItem(API_KEY_STORAGE) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setApiKey(key) {
    try {
      if (key) localStorage.setItem(API_KEY_STORAGE, key.trim());
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch (e) {}
  }

  function normalize(text) {
    return String(text || "")
      .replace(/\s+/g, "")
      .replace(/[.…!?~？]/g, "")
      .slice(0, 40);
  }

  function isSimilar(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length < 12 || nb.length < 12) return false;
    const short = na.length <= nb.length ? na : nb;
    const long = na.length <= nb.length ? nb : na;
    return long.indexOf(short.slice(0, Math.min(14, short.length))) >= 0;
  }

  function getUsedStudentTexts(history) {
    return (history || [])
      .filter(function (t) {
        return t.role === "student";
      })
      .map(function (t) {
        return t.text;
      });
  }

  function teacherTurnCount(history) {
    return (history || []).filter(function (t) {
      return t.role === "teacher";
    }).length;
  }

  function calcTrust(history, analysis) {
    let trust = 25;
    (history || []).forEach(function (t) {
      if (t.role !== "teacher") return;
      const f =
        typeof CounselingEvaluator !== "undefined"
          ? CounselingEvaluator.analyzeTeacherMessage(t.text)
          : {};
      if (f.hasEmpathy || f.hasSafeSpace) trust += 10;
      if (f.hasJoining || f.hasRespect || f.hasProtection) trust += 8;
      if (f.hasOpenQuestion) trust += 4;
      if (f.hasPressure || f.hasLecture || f.hasVictimBlame || f.hasInsult || f.hasThreat) trust -= 14;
      if (f.hasMinimize) trust -= 8;
    });
    if (analysis) {
      if (analysis.hasEmpathy || analysis.hasSafeSpace) trust += 6;
      if (analysis.hasPressure || analysis.hasLecture) trust -= 10;
    }
    return Math.max(0, Math.min(100, trust));
  }

  function cleanAiText(text) {
    return String(text || "")
      .replace(/^["'「『]|["'」』]$/g, "")
      .replace(/^(학생|학부모|나)\s*[:：]\s*/i, "")
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 220);
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function buildSystemPrompt(caseData, trustLevel) {
    const isParent = caseData.clientRole === "parent";
    const roleLine = isParent
      ? "당신은 한국 학부모입니다. 이름은 " + caseData.studentName + "입니다."
      : "당신은 한국 " +
        (caseData.grade || "중고등") +
        " 학생입니다. 이름은 " +
        caseData.studentName +
        "입니다.";

    return (
      roleLine +
      "\n상황: " +
      caseData.situation +
      "\n현재 교사에 대한 신뢰감(0~100): " +
      trustLevel +
      "\n\n규칙:\n" +
      "1. 교사의 바로 직전 말에만 직접 대답하세요. 질문이면 그 질문에 답하세요.\n" +
      "2. 이전에 한 말을 그대로 반복하지 마세요.\n" +
      "3. 1~2문장, 실제 말투. 설명·해설·따옴표·역할 표기 없이 대사만 출력.\n" +
      "4. 신뢰가 낮으면 조심스럽고 짧게, 높으면 조금 더 솔직하게.\n" +
      "5. 교사가 '뭔소리야'처럼 헷갈려 하면, 교사에게 되묻지 말고 해명한 뒤 네 생각·사실을 다시 말하세요.\n" +
      "6. 상담을 끝낼 때(다음에 오라는 등)만 짧게 감사·종결 멘트를 하세요.\n" +
      "7. 교사가 검사·면담을 제안하면 그 제안에만 반응하세요."
    );
  }

  function buildChatMessages(caseData, teacherMessage, history, trustLevel) {
    const messages = [{ role: "system", content: buildSystemPrompt(caseData, trustLevel) }];
    (history || []).slice(-12).forEach(function (t) {
      if (t.role === "teacher") {
        messages.push({ role: "user", content: String(t.text || "") });
      } else if (t.role === "student") {
        messages.push({ role: "assistant", content: String(t.text || "") });
      }
    });
    messages.push({ role: "user", content: String(teacherMessage || "") });
    return messages;
  }

  async function callPollinations(caseData, teacherMessage, history, trustLevel, signal) {
    const messages = buildChatMessages(caseData, teacherMessage, history, trustLevel);
    try {
      const res = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: signal,
        body: JSON.stringify({
          model: "openai",
          messages: messages,
          temperature: 0.85,
          max_tokens: 140,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text =
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;
      return cleanAiText(text);
    } catch (e) {
      return null;
    }
  }

  async function callGemini(caseData, teacherMessage, history, trustLevel, signal) {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const messages = buildChatMessages(caseData, teacherMessage, history, trustLevel);
    const flat = messages
      .map(function (m) {
        if (m.role === "system") return "[설정]\n" + m.content;
        if (m.role === "user") return "교사: " + m.content;
        return "학생: " + m.content;
      })
      .join("\n");

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
      encodeURIComponent(apiKey);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: flat + "\n\n학생 대사만 출력:" }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 160 },
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text =
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text;
      return cleanAiText(text);
    } catch (e) {
      return null;
    }
  }

  /** 실시간 AI만 — 실패 시 재시도, 로컬 스크립트 사용 안 함 */
  async function callLiveAi(caseData, teacherMessage, history, trustLevel) {
    const used = getUsedStudentTexts(history);
    const maxAttempts = 6;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller
        ? setTimeout(function () {
            controller.abort();
          }, 50000)
        : null;
      const signal = controller ? controller.signal : undefined;

      try {
        let ai = await callGemini(caseData, teacherMessage, history, trustLevel, signal);
        if (!ai || ai.length < 2) {
          ai = await callPollinations(caseData, teacherMessage, history, trustLevel, signal);
        }
        if (ai && ai.length >= 2 && !used.some(function (u) {
          return isSimilar(u, ai);
        })) {
          return ai;
        }
      } finally {
        if (timer) clearTimeout(timer);
      }

      // 속도 제한이면 기다렸다가 다시 요청 (로컬로 대체하지 않음)
      await sleep(3000 + attempt * 4000);
    }
    return null;
  }

  function shouldCloseConversation(caseData, history, trust, teacherMsg, studentMsg) {
    const teacherTurns = teacherTurnCount(history) + 1;
    const wantsClose = /다음\s*(에|번|시간|주)|또\s*와|여기까지|언제든\s*와/.test(teacherMsg || "");
    const studentClose = /여기까지|다음에|고마|감사/.test(studentMsg || "");
    if (wantsClose && teacherTurns >= 5 && trust >= 35) return true;
    if (wantsClose && studentClose && teacherTurns >= 4) return true;
    if (teacherTurns >= 16) return true;
    return false;
  }

  async function generateReply(caseData, teacherMessage, history, phaseIndex, analysis) {
    const trust = calcTrust(history, analysis);
    const ai = await callLiveAi(caseData, teacherMessage, history, trust);

    if (!ai) {
      const err = new Error("AI_UNAVAILABLE");
      err.code = "AI_UNAVAILABLE";
      throw err;
    }

    return {
      message: ai,
      trust: trust,
      shouldClose: shouldCloseConversation(caseData, history, trust, teacherMessage, ai),
      source: "ai",
    };
  }

  async function generate(caseData, teacherMessage, history, phaseIndex, analysis) {
    const result = await generateReply(caseData, teacherMessage, history, phaseIndex, analysis);
    return result.message;
  }

  return {
    generate: generate,
    generateReply: generateReply,
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    calcTrust: calcTrust,
    shouldCloseConversation: shouldCloseConversation,
  };
})();
