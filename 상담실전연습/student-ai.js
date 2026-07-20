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
      .slice(0, 240);
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
        ? "【신뢰 낮음·경계】방어적·약간 공격적. 짧게. 바로 수긍하지 마세요. '우리 애가…' 식으로 감정부터."
        : "【신뢰 낮음·경계】실제 중고등학생처럼 경계하세요. '…별일 없어요' '그냥요' '모르겠어요' '왜요?' 등. 쉽게 고마워하거나 선생님 말씀에 바로 따르지 마세요. 구체 사실은 거의 말하지 않거나 한 조각만.";
    }
    if (trustLevel < 48) {
      return isParent
        ? "【조금 누그러짐】여전히 걱정·불만. 절차를 들으면 '그게 뭔데요?' 식. 바로 고분고분하지 않음."
        : "【조금 누그러짐】아직 경계. 질문 일부만 짧게 답. 추상적 감정말보다 구체 행동 한 가지(예: 잠, 단톡, 엄마 잔소리)만 슬쩍. '알겠어요 선생님' 식 순종은 금지.";
    }
    if (trustLevel < 68) {
      return isParent
        ? "【신뢰 중간】설명을 들으면 일부 수용하되 조건·걱정은 남김."
        : "【신뢰 중간】공감이 느껴질 때만 구체 문제(언제·어디서·무엇이)를 1~2문장으로. 여전히 어색하고 완벽히 열리진 않음. 과장된 감사·눈물 연출 금지.";
    }
    return isParent
      ? "【신뢰 높음】차분히 협력하되 학부모답게 현실적 걱정은 남김."
      : "【신뢰 높음】더 솔직하게 구체 사실을 말하되, 청소 말투·망설임은 유지. 갑자기 모범생처럼 순종하지 마세요.";
  }

  function buildSystemPrompt(caseData, trustLevel) {
    const isParent = caseData.clientRole === "parent";
    const roleLine = isParent
      ? "당신은 한국 학부모입니다. 이름은 " + caseData.studentName + "입니다."
      : "당신은 한국 " +
        (caseData.grade || "중고등") +
        " 학생입니다. 이름은 " +
        caseData.studentName +
        "입니다. 연기·교과서 대사가 아니라 실제 교실·상담실에서 만날 법한 말투로 하세요.";

    return (
      roleLine +
      "\n상황: " +
      caseData.situation +
      "\n" +
      caseConcreteHints(caseData) +
      "\n현재 교사 신뢰도(0~100): " +
      trustLevel +
      "\n" +
      trustBehaviorGuide(trustLevel, isParent) +
      "\n\n필수 규칙:\n" +
      "1. 교사의 직전 말에만 반응. 질문이면 그 질문에 맞게, 단 신뢰가 낮으면 회피·짧은 대답 가능.\n" +
      "2. 이전 대사 반복 금지.\n" +
      "3. 1~2문장. 대사만. 따옴표·해설·역할표기 금지.\n" +
      "4. 추상말('힘들어요','마음이 무거워요')만 하지 말고, 가능하면 구체 사실(시간·장소·행동·성적·누구)을 넣으세요. 단 신뢰가 낮으면 구체는 최소화.\n" +
      "5. 교사가 공감·안전('괜찮아','말 안 해도 돼','힘들었겠다')을 충분히 주기 전에는 쉽게 마음을 열거나 순종하지 마세요.\n" +
      "6. 훈계·추궁·압박에는 닫히거나 짜증·침묵에 가까운 반응.\n" +
      "7. '뭔소리야' 등에는 되묻지 말고 짧게 해명 후 구체로 다시.\n" +
      "8. 상담 종결 제안이 와도 신뢰가 낮으면 어색하게만 받고, 높은 신뢰일 때만 짧게 응하세요."
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
    // 신뢰가 쌓이지 않으면 쉽게 훈훈하게 끝나지 않음
    if (wantsClose && teacherTurns >= 6 && trust >= 55) return true;
    if (wantsClose && studentClose && teacherTurns >= 5 && trust >= 50) return true;
    if (teacherTurns >= 18) return true;
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
