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
      .replace(/^(학생|학부모|나|assistant)\s*[:：\-]\s*/i, "")
      .replace(/^\[학생\]\s*/i, "")
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
    const name = caseData.studentName || (isParent ? "학부모" : "학생");

    if (isParent) {
      return (
        "역할: 당신은 학교 상담에 온 학부모 '" +
        name +
        "'입니다. 교사가 아닙니다. 상담사가 아닙니다.\n" +
        "상황: " +
        caseData.situation +
        "\n" +
        caseConcreteHints(caseData) +
        "\n신뢰도: " +
        trustLevel +
        "/100\n" +
        trustBehaviorGuide(trustLevel, true) +
        "\n\n절대 금지: 상담 진행 방식 묻기, '말씀해 주세요', '도와드릴까요', 교사처럼 가르치기.\n" +
        "출력: 학부모 대사만 1~3문장."
      );
    }

    return (
      "역할 고정: 당신은 반드시 학생 '" +
      name +
      "'(" +
      (caseData.grade || "중고등") +
      ")입니다.\n" +
      "상대방은 '교사'입니다. 당신은 상담을 받는 학생이지, 상담을 진행하는 사람이 아닙니다.\n" +
      "상황: " +
      caseData.situation +
      "\n" +
      caseConcreteHints(caseData) +
      "\n교사에 대한 신뢰도: " +
      trustLevel +
      "/100\n" +
      trustBehaviorGuide(trustLevel, false) +
      "\n\n절대 하지 말 것(교사용 멘트):\n" +
      "- 상담 진행·방식·매뉴얼을 묻거나 제안하기\n" +
      "- 「어떤 방식으로 진행」「구체적으로 생각해 보셨나요」「말씀해 주세요」「필요하면 언제든」「도와드릴게요」\n" +
      "- 교사를 상담하듯 질문하기, 안내하기, 정리하기\n" +
      "\n반드시 할 것:\n" +
      "- 학생 처지에서만 말하기 (고민·방어·짜증·망설임·구체 사실)\n" +
      "- 교사 말에 반응하기 (욕/무시면 상처·닫힘, 공감이면 조금씩 열림)\n" +
      "- 1~3문장, 대사만 (따옴표·이름표·해설 금지)\n" +
      "- 먼저 상담을 끝내지 않기"
    );
  }

  function buildChatMessages(caseData, teacherMessage, history, trustLevel) {
    const name = caseData.studentName || "학생";
    const messages = [{ role: "system", content: buildSystemPrompt(caseData, trustLevel) }];

    // 역할 고정용 짧은 예시
    messages.push({
      role: "user",
      content: "[교사] 요즘 좀 힘들어 보이는데, 괜찮아?",
    });
    messages.push({
      role: "assistant",
      content: "…그냥요. 별거 아니에요.",
    });
    messages.push({
      role: "user",
      content: "[교사] 천천히 말해도 돼. 요즘 잠은 어때?",
    });
    messages.push({
      role: "assistant",
      content: "한 2주쯤부터 밤에 잠이 잘 안 와요…",
    });

    (history || []).slice(-10).forEach(function (t) {
      if (t.role === "teacher") {
        messages.push({ role: "user", content: "[교사] " + String(t.text || "") });
      } else if (t.role === "student") {
        messages.push({ role: "assistant", content: String(t.text || "") });
      }
    });

    messages.push({
      role: "user",
      content:
        "[교사] " +
        String(teacherMessage || "") +
        "\n\n→ 위 교사 말에 대한 '" +
        name +
        "'(학생/내담자)의 대답만 쓰세요. 상담사·교사처럼 말하면 안 됩니다.",
    });
    return messages;
  }

  function isCounselorSpeak(text) {
    const t = String(text || "");
    return /진행하|어떤\s*방식|구체적으로\s*생각|말씀해\s*주|말씀해\s*보|도와드릴|필요하면\s*언제든|궁금한\s*(점|게)|더\s*이야기해|편하게\s*말|들어드릴|상담을\s*어떻게|매뉴얼|정리해\s*보|생각해\s*보셨|원하시는\s*방향|제가\s*도와|이야기해\s*보실래요|질문\s*있으신가요/.test(
      t
    );
  }

  function isWeakReply(text) {
    const t = String(text || "").trim();
    if (t.length < 4) return true;
    if (/^(네|아니요|몰라요|그냥요|별로요|알겠어요)[\.…]*$/i.test(t)) return true;
    if (/들어가도|오늘은\s*그만|상담\s*끝|다음에\s*올게요/.test(t)) return true;
    if (isCounselorSpeak(t)) return true;
    return false;
  }

  /** 역할 붕괴 시 학생 톤 비상 답 (상담사 톤 금지) */
  function emergencyStudentReply(caseData, teacherMessage, trust, analysis) {
    const id = caseData.id;
    const msg = teacherMessage || "";
    if (analysis && (analysis.hasInsult || analysis.hasThreat || analysis.hasLecture || analysis.hasVictimBlame)) {
      return pick([
        "…왜 그렇게까지 말씀하세요.",
        "…말하기 싫어요.",
        "…그냥 나갈래요.",
        "…제가 뭘 잘못했는데요.",
      ], hash(msg + trust));
    }
    if (trust < 30) {
      const closed = {
        1: ["…별일 없어요.", "…그냥 피곤해서요.", "…모르겠어요."],
        2: ["…농구하다가요.", "…별거 아니에요.", "…왜요."],
        3: ["…뭐요.", "…그냥요.", "…폰 봐요."],
        4: ["…저…", "…말하기 좀…", "…무서워요."],
        5: ["우리 애가 그런 애가 아니에요.", "편견 아니에요?"],
        6: ["…이과 하기 싫어요.", "…엄마가 의대만 가래요.", "…수학 보면 답답해요."],
        7: ["…하고 싶은 게 없어요.", "…모르겠어요."],
        8: ["…저 수학 머리 없어요.", "…안 돼요."],
        9: ["…왜 배워야 해요?", "…복잡하잖아요."],
        10: ["…시험만 생각하면 떨려요.", "…머리가 하얘져요."],
        11: ["…아직 적응이 안 돼요.", "…점심 혼자 먹어요."],
      };
      return pick(closed[id] || closed[1], hash(msg));
    }
    const open = {
      1: ["요즘 잠이 잘 안 와요…", "수업 때 자꾸 엎드려요.", "급식도 잘 안 먹게 됐어요."],
      2: ["…집에서 가끔 무서울 때가 있어요.", "…이건 말할게요. 더는…"],
      3: ["게임할 땐 괜찮은데 학교는…", "발로란트요. 거기선 좀 살 것 같아요."],
      4: ["단톡방에서요…", "점심도 같이 안 먹게 해요."],
      5: ["그럼 우리 애는 어떻게 되는 거예요?", "직접 연락하면 안 되나요?"],
      6: ["국영은 괜찮은데 수학만…", "중2 때 함수부터 막혔어요."],
      7: ["앉아서 종일 컴퓨터는 못 할 것 같아요.", "사람 많은 데도 싫어요."],
      8: ["친구는 한 번에 푸는데 전…", "분수부터 다시요?"],
      9: ["어제 마트 갔는데… 그게 수학이에요?", "학교 건 너무 복잡해요."],
      10: ["지금은 한 8 정도…?", "호흡… 해볼게요."],
      11: ["그림은 좋아해요.", "동아리는… 용기가 안 나요."],
    };
    return pick(open[id] || open[1], hash(msg + "o"));
  }

  function pick(arr, seed) {
    if (!arr || !arr.length) return "…모르겠어요.";
    return arr[Math.abs(seed) % arr.length];
  }

  function hash(str) {
    let h = 0;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
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
          temperature: 0.7,
          max_tokens: 200,
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
        if (m.role === "system") return "[역할 설정 — 반드시 지킬 것]\n" + m.content;
        if (m.role === "user") return m.content;
        return "[학생] " + m.content;
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
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    flat +
                    "\n\n중요: 당신은 학생(또는 학부모 내담자)입니다. 상담사/교사 멘트 금지. 학생 대사만 출력:",
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
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

  function shouldCloseConversation() {
    return false;
  }

  async function callLiveAi(caseData, teacherMessage, history, trustLevel, analysis) {
    const used = getUsedStudentTexts(history);
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller
        ? setTimeout(function () {
            controller.abort();
          }, 45000)
        : null;
      const signal = controller ? controller.signal : undefined;

      try {
        let ai = await callGemini(caseData, teacherMessage, history, trustLevel, signal);
        if (!ai || ai.length < 2 || isWeakReply(ai)) {
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
      } finally {
        if (timer) clearTimeout(timer);
      }

      await sleep(1500 + attempt * 2500);
    }

    // 역할 붕괴·실패 시에도 학생 톤으로만 대체
    return emergencyStudentReply(caseData, teacherMessage, trustLevel, analysis || {});
  }

  async function generateReply(caseData, teacherMessage, history, phaseIndex, analysis) {
    const trust = calcTrust(history, analysis);
    const ai = await callLiveAi(caseData, teacherMessage, history, trust, analysis);

    return {
      message: ai || emergencyStudentReply(caseData, teacherMessage, trust, analysis || {}),
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
    shouldCloseConversation: shouldCloseConversation,
  };
})();
