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
    // 처음엔 경계심이 높음 — 공감·안전이 쌓여야 천천히 열림
    let trust = 12;
    let empathyStreak = 0;
    (history || []).forEach(function (t) {
      if (t.role !== "teacher") return;
      const f =
        typeof CounselingEvaluator !== "undefined"
          ? CounselingEvaluator.analyzeTeacherMessage(t.text)
          : {};
      if (f.hasEmpathy || f.hasSafeSpace) {
        empathyStreak += 1;
        trust += empathyStreak >= 2 ? 7 : 4;
      } else {
        empathyStreak = 0;
      }
      if (f.hasJoining || f.hasRespect || f.hasProtection) trust += 5;
      if (f.hasOpenQuestion) trust += 2;
      if (f.hasPressure || f.hasLecture || f.hasVictimBlame || f.hasInsult || f.hasThreat) {
        trust -= 16;
        empathyStreak = 0;
      }
      if (f.hasMinimize || f.hasParentThreat) trust -= 10;
    });
    if (analysis) {
      if (analysis.hasEmpathy || analysis.hasSafeSpace) trust += 3;
      if (analysis.hasPressure || analysis.hasLecture || analysis.hasVictimBlame) trust -= 12;
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
      .slice(0, 280);
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function caseConcreteHints(caseData) {
    const hints = {
      1: "구체 소재: 2주째 잠 설치기, 급식 거름, 수업 중 엎드림, 친구와 멀어짐. 초반엔 '별일 없어요'로 막기.",
      2: "구체 소재: 팔 멍, 농구 핑계, 집·술·소리. 초반엔 부인·긴장. 유도 질문엔 더 닫힘.",
      3: "구체 소재: 발로란트/롤 팀장, 학교 의미 없음, 휴대폰. 초반엔 반말·짧은 대답·귀찮은 티.",
      4: "구체 소재: 단톡 욕설, 점심 따돌림, 사물함 낙서, 신고 두려움. 초반엔 망설이며 조금씩.",
      5: "학부모: 화·방어('우리 애가 그런 애 아냐'), 전학·연락 걱정. 절차 안내 전에는 쉽게 안 누그러짐.",
      6: "구체 소재: 수학 4등급, 국영 2등급, 엄마 의대 강요, 이과 거부, 중2 함수부터 막힘. 초반엔 답답함·투정.",
      7: "구체 소재: 하고 싶은 거 없음, 컴퓨터 종일·사람 많은 곳 싫음. 초반엔 한숨·짧은 말.",
      8: "구체 소재: 수학 머리 없다, 친구는 한 번에 품, 분수부터. 초반엔 포기한 말투.",
      9: "구체 소재: 왜 배우냐, 마트 가격 비교, 학교 수학 복잡. 초반엔 반박·시큰둥.",
      10: "구체 소재: 손 떨림, 머리 하얘짐, 잠 못 잠, 불안 8/10. 초반엔 긴장·말 짧음.",
      11: "구체 소재: 전학 후 점심 혼자, 그림 좋아함, 동아리 용기 없음. 초반엔 낯섦·어색함.",
    };
    return hints[caseData.id] || "상황에 맞는 구체적 사실·행동을 말하세요.";
  }

  function trustBehaviorGuide(trustLevel, isParent) {
    if (trustLevel < 28) {
      return isParent
        ? "【신뢰 낮음】방어·걱정이 앞섬. 바로 수긍하지 않음."
        : "【신뢰 낮음】경계하되 대화는 이어감. '그냥요' '모르겠어요' 가능. 다만 한 단어만 던지고 끝내지 말고, 교사가 물으면 짧은 반응이라도 하세요. 상담을 먼저 끝내지 마세요.";
    }
    if (trustLevel < 48) {
      return isParent
        ? "【조금 누그러짐】걱정·질문은 남기되 대화 유지."
        : "【조금 누그러짐】아직 조심스러움. 구체 사실 한 가지를 섞어 답함(예: 잠, 단톡, 엄마 잔소리). 순종 금지. 대화를 끝내는 말(들어가도 돼요/오늘은 그만) 금지.";
    }
    if (trustLevel < 68) {
      return isParent
        ? "【신뢰 중간】일부 수용하되 현실 걱정은 남김."
        : "【신뢰 중간】공감이 있으면 구체 문제(언제·무엇)를 자연스럽게 말함. 과장된 감사·눈물 금지. 상담 종결 멘트 금지.";
    }
    return isParent
      ? "【신뢰 높음】협력하되 학부모답게 현실적."
      : "【신뢰 높음】더 솔직·구체. 청소 말투 유지. 갑자기 모범생 순종 금지. 교사가 끝내지 않으면 대화 계속.";
  }

  function buildSystemPrompt(caseData, trustLevel) {
    const isParent = caseData.clientRole === "parent";
    const roleLine = isParent
      ? "당신은 한국 학부모입니다. 이름은 " + caseData.studentName + "입니다."
      : "당신은 한국 " +
        (caseData.grade || "중고등") +
        " 학생 " +
        caseData.studentName +
        "입니다. 실제 학교 상담실에서 말하는 학생처럼 자연스럽게 하세요.";

    return (
      roleLine +
      "\n상황: " +
      caseData.situation +
      "\n" +
      caseConcreteHints(caseData) +
      "\n교사 신뢰도: " +
      trustLevel +
      "/100\n" +
      trustBehaviorGuide(trustLevel, isParent) +
      "\n\n대화 규칙:\n" +
      "1. 교사의 직전 말에 맞춰 자연스럽게 대답하세요. 동문서답 금지.\n" +
      "2. 1~3문장. 대사만 출력(따옴표·해설·이름표 금지).\n" +
      "3. 추상적 감정말만 하지 말고 구체 사실(시간·장소·사람·성적·행동)을 넣으세요. 신뢰가 낮아도 '모르겠어요. 요즘 잠만…'처럼 한 조각은 가능.\n" +
      "4. 공감·안전이 쌓이기 전에는 쉽게 마음을 다 열거나 순종하지 마세요. 그래도 대화는 이어가세요.\n" +
      "5. 절대 먼저 상담을 끝내지 마세요. 「들어가도 돼요」「오늘은 그만」「다음에 올게요」「고마워요 선생님(종결)」 금지. 교사가 분명히 마칠 때만 짧게 응하세요.\n" +
      "6. 훈계·추궁에는 짧고 닫힌 반응. 이전 대사 반복 금지.\n" +
      "7. 한국 중고등학생/학부모 말투. 번역투·상담 교과서 말투 금지."
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
          temperature: 0.75,
          max_tokens: 220,
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
          generationConfig: { temperature: 0.75, maxOutputTokens: 220 },
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

  function shouldCloseConversation(caseData, history, trust, teacherMsg, studentMsg) {
    // 평가기에서 명시적 종결만 사용. AI 쪽 자동 종결은 끔.
    return false;
  }

  function isWeakReply(text) {
    const t = String(text || "").trim();
    if (t.length < 4) return true;
    if (/^(네|아니요|몰라요|그냥요|별로요)[\.…]*$/i.test(t)) return true;
    if (/들어가도|오늘은\s*그만|상담\s*끝|다음에\s*올게요/.test(t)) return true;
    return false;
  }

  async function callLiveAi(caseData, teacherMessage, history, trustLevel) {
    const used = getUsedStudentTexts(history);
    const maxAttempts = 5;

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
        if (
          ai &&
          ai.length >= 2 &&
          !isWeakReply(ai) &&
          !used.some(function (u) {
            return isSimilar(u, ai);
          })
        ) {
          return ai;
        }
        // 약한/종결형 답이면 한 번 더 재시도
        if (ai && !isWeakReply(ai) && attempt >= 2) return ai;
      } finally {
        if (timer) clearTimeout(timer);
      }

      await sleep(2000 + attempt * 3000);
    }
    return null;
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
