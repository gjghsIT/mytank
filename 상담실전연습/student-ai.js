/**
 * 학생·학부모 실시간 AI 대화 (로컬 대본 없음)
 * 교사 직전 멘트에 맞는 답만 사용. 실패 시 오류로 재전송 유도.
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
      .toLowerCase();
  }

  function isSimilar(a, b) {
    const na = normalize(a).slice(0, 48);
    const nb = normalize(b).slice(0, 48);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length >= 8 && nb.length >= 8) {
      if (na.indexOf(nb.slice(0, 10)) >= 0 || nb.indexOf(na.slice(0, 10)) >= 0) return true;
    }
    return false;
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
    let trust = 20;
    (history || []).forEach(function (t) {
      if (t.role !== "teacher") return;
      const f =
        typeof CounselingEvaluator !== "undefined"
          ? CounselingEvaluator.analyzeTeacherMessage(t.text)
          : {};
      if (f.hasEmpathy || f.hasSafeSpace) trust += 8;
      if (f.hasJoining || f.hasRespect || f.hasProtection) trust += 5;
      if (f.hasOpenQuestion) trust += 3;
      if (f.hasPressure || f.hasLecture || f.hasVictimBlame || f.hasInsult || f.hasThreat) trust -= 14;
      if (f.hasMinimize) trust -= 8;
    });
    if (analysis) {
      if (analysis.hasEmpathy || analysis.hasSafeSpace) trust += 4;
      if (analysis.hasPressure || analysis.hasLecture) trust -= 10;
    }
    trust += Math.min(15, teacherTurnCount(history) * 2);
    return Math.max(0, Math.min(100, trust));
  }

  function cleanAiText(text) {
    return String(text || "")
      .replace(/^["'「『]|["'」』]$/g, "")
      .replace(/^(학생|학부모|나|assistant|동현|시은)\s*[:：\-]\s*/i, "")
      .replace(/^\[(학생|학부모)\]\s*/i, "")
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 200);
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function caseBrief(caseData) {
    const map = {
      1: "무기력·수면·급식·수업 엎드림·친구와 멀어짐. 초반 경계.",
      2: "팔 멍, 농구 핑계, 집에서의 두려움. 쉽게 말하지 않음.",
      3: "게임(발로란트/롤)에는 살아 있음, 학교는 의미 없음.",
      4: "단톡·따돌림 피해, 신고 두려움.",
      5: "가해 혐의 학생의 학부모. 방어·충격·조사·절차 걱정. 학생이 아님.",
      6: "이과/의대 강요 vs 문과 성향, 수학 어려움.",
      7: "진로 공허, 싫은 것부터 찾기.",
      8: "수학 머리 없다 믿음, 결손·연습.",
      9: "왜 수학 배우냐, 실생활 연결.",
      10: "시험 불안, 손 떨림·머리 하얘짐.",
      11: "전학 후 적응, 점심 혼자, 그림·동아리.",
    };
    return map[caseData.id] || caseData.situation;
  }

  function buildSystemPrompt(caseData, trust, history) {
    const isParent = caseData.clientRole === "parent";
    const name = caseData.studentName || (isParent ? "학부모" : "학생");
    const used = getUsedStudentTexts(history)
      .slice(-6)
      .map(function (t) {
        return "· " + t;
      })
      .join("\n");

    if (isParent) {
      return (
        "당신은 학부모 '" +
        name +
        "'입니다. 자녀가 학교폭력 관련 조사를 받는 상황입니다.\n" +
        "상황: " +
        caseData.situation +
        "\n요지: " +
        caseBrief(caseData) +
        "\n신뢰도: " +
        trust +
        "\n\n규칙:\n" +
        "- 학부모로만 말하세요. 학생 일인칭(숙제·엎드림·수업) 금지.\n" +
        "- 교사의 바로 직전 말에만 자연스럽게 답하세요.\n" +
        "- 1~2문장. 이상하거나 앞뒤 안 맞는 말 금지.\n" +
        "- 상담사처럼 묻거나 안내하지 마세요.\n" +
        "- 이미 한 말과 비슷하게 반복하지 마세요.\n" +
        (used ? "이미 한 말:\n" + used + "\n" : "") +
        "출력: 학부모 대사만."
      );
    }

    return (
      "당신은 한국 " +
      (caseData.grade || "중고등") +
      " 학생 '" +
      name +
      "'입니다. 학교 상담을 받는 학생입니다.\n" +
      "상황: " +
      caseData.situation +
      "\n이 사례의 핵심만 사용: " +
      caseBrief(caseData) +
      "\n교사 신뢰도: " +
      trust +
      "/100\n" +
      "\n규칙:\n" +
      "1. 교사의 「바로 직전 한 마디」에 맞게 답하세요. 동문서답·쌩뚱맞은 비유·이상한 신체 묘사 금지.\n" +
      "2. 교사가 도움을 제안하면: 감사하거나 망설이거나 짧게 받아들이세요. 갑자기 새 이상한 사연을 만들지 마세요.\n" +
      "3. 교사가 구체 사실(잠·수업·친구 등)을 물으면 그 질문에 답하세요.\n" +
      "4. 1~2문장, 실제 학생 말투. 논리적으로 通じ는 말만.\n" +
      "5. 상담사 멘트 금지. 다른 사례 내용 섞지 마세요.\n" +
      "6. 이전 학생 대사와 같은 말 반복 금지.\n" +
      "7. 신뢰가 낮으면 조심스럽되, 「별일 없어요」만 Endless 반복하지 말고 조금씩 다르게 답하세요.\n" +
      (used ? "이미 한 말(반복 금지):\n" + used + "\n" : "") +
      "출력: 학생 대사만."
    );
  }

  function buildChatMessages(caseData, teacherMessage, history, trust) {
    const isParent = caseData.clientRole === "parent";
    const name = caseData.studentName || (isParent ? "학부모" : "학생");
    const messages = [{ role: "system", content: buildSystemPrompt(caseData, trust, history) }];

    (history || []).slice(-8).forEach(function (t) {
      if (t.role === "teacher") {
        messages.push({ role: "user", content: "교사: " + String(t.text || "") });
      } else if (t.role === "student") {
        messages.push({ role: "assistant", content: String(t.text || "") });
      }
    });

    messages.push({
      role: "user",
      content:
        "교사: " +
        String(teacherMessage || "") +
        "\n\n위 교사 말에 대한 " +
        name +
        "(" +
        (isParent ? "학부모" : "학생") +
        ")의 자연스러운 대답 1~2문장만 쓰세요. " +
        "앞뒤가 맞는 말만. 이상한 비유·다른 사례 금지.",
    });
    return messages;
  }

  function isNonsensical(text) {
    const t = String(text || "");
    // 앞뒤 안 맞는·과도한 기괴한 신체/사물 조합
    if (/가방.*손|손.*가방|들썩|소음.*손|숙제.*엎드.*괴롭/.test(t)) return true;
    if (/소음이.*심해서.*(손|가방|들썩)/.test(t)) return true;
    if (t.length > 120 && (t.match(/,/g) || []).length >= 3) return true;
    // 무의미한 긴 연결
    if (/그냥\s*.{0,10}집에서.{0,20}가방/.test(t)) return true;
    return false;
  }

  function isCounselorSpeak(text) {
    return /진행하|어떤\s*방식|말씀해\s*주|도와드릴|생각해\s*보셨|원하시는\s*방향|들어드릴|질문\s*있으신가요/.test(
      String(text || "")
    );
  }

  function isBadReply(text, history, teacherMessage, caseData) {
    const t = String(text || "").trim();
    if (t.length < 2) return true;
    if (t.length > 180) return true;
    if (isCounselorSpeak(t)) return true;
    if (isNonsensical(t)) return true;
    if (/들어가도\s*돼요|오늘은\s*그만|상담\s*끝/.test(t)) return true;

    const used = getUsedStudentTexts(history);
    if (
      used.some(function (u) {
        return isSimilar(u, t);
      })
    ) {
      return true;
    }

    const isParent = caseData && caseData.clientRole === "parent";
    if (isParent) {
      if (/숙제|엎드|급식|잠이\s*안|기운이\s*없어서|발로란트|단톡방/.test(t)) return true;
      if (/제가\s*.*(숙제|엎드)/.test(t)) return true;
    }

    // 도움 제안에 「별일 없어요」+ 이상한 사연 붙이기 거부
    if (/도와|이야기해|언제든지/.test(teacherMessage || "") && isNonsensical(t)) return true;

    return false;
  }

  async function callPollinations(messages, signal) {
    try {
      const res = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: signal,
        body: JSON.stringify({
          model: "openai",
          messages: messages,
          temperature: 0.55,
          max_tokens: 120,
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

  async function callGemini(messages, signal) {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const flat = messages
      .map(function (m) {
        if (m.role === "system") return "[역할]\n" + m.content;
        if (m.role === "user") return m.content;
        return "내담자: " + m.content;
      })
      .join("\n\n");

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
      encodeURIComponent(apiKey);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    flat +
                    "\n\n내담자(학생 또는 학부모)의 짧고 자연스러운 대사만 출력. 앞뒤가 맞게.",
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.55, maxOutputTokens: 120 },
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

  async function callLiveAi(caseData, teacherMessage, history, trust, analysis) {
    const messages = buildChatMessages(caseData, teacherMessage, history, trust);
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller
        ? setTimeout(function () {
            controller.abort();
          }, 45000)
        : null;
      const signal = controller ? controller.signal : undefined;

      try {
        let ai = await callGemini(messages, signal);
        if (!ai || isBadReply(ai, history, teacherMessage, caseData)) {
          ai = await callPollinations(messages, signal);
        }
        // 실패 시 온도만 다른 재요청처럼 한 번 더 pollinations
        if ((!ai || isBadReply(ai, history, teacherMessage, caseData)) && attempt > 0) {
          await sleep(800);
          ai = await callPollinations(messages, signal);
        }
        if (ai && !isBadReply(ai, history, teacherMessage, caseData)) {
          return ai;
        }
      } finally {
        if (timer) clearTimeout(timer);
      }

      await sleep(1500 + attempt * 2000);
    }

    return null;
  }

  async function generateReply(caseData, teacherMessage, history, phaseIndex, analysis) {
    const trust = calcTrust(history, analysis);
    const ai = await callLiveAi(caseData, teacherMessage, history, trust, analysis);

    if (!ai) {
      const err = new Error("AI_UNAVAILABLE");
      err.code = "AI_UNAVAILABLE";
      throw err;
    }

    return {
      message: ai,
      trust: trust,
      shouldClose: false,
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
    shouldCloseConversation: function () {
      return false;
    },
  };
})();
