/**
 * 학생·학부모 역할 AI — 교사 멘트에 맞춘 실시간 답변
 * - 역할: 학생/학부모만 (상담사 톤 금지)
 * - 같은 회피 멘트 반복 금지, 교사 구체 언급에 반응
 */
const StudentAI = (function () {
  "use strict";

  const API_KEY_STORAGE = "counseling_gemini_api_key";

  const CLOSED_PHRASES = /별일\s*없|별거\s*없|그냥요|그냥\s*그래|모르겠어요|괜찮아요\s*\.?$|뭐요\.?$/;

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

  function hash(str) {
    let h = 0;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function pick(arr, seed) {
    if (!arr || !arr.length) return "";
    return arr[Math.abs(seed) % arr.length];
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
    if (na.length >= 6 && nb.length >= 6) {
      if (na.indexOf(nb.slice(0, Math.min(8, nb.length))) >= 0) return true;
      if (nb.indexOf(na.slice(0, Math.min(8, na.length))) >= 0) return true;
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

  function alreadyUsedClosedPhrase(history) {
    return getUsedStudentTexts(history).some(function (t) {
      return CLOSED_PHRASES.test(t);
    });
  }

  function calcTrust(history, analysis) {
    let trust = 18;
    let empathyStreak = 0;
    (history || []).forEach(function (t) {
      if (t.role !== "teacher") return;
      const f =
        typeof CounselingEvaluator !== "undefined"
          ? CounselingEvaluator.analyzeTeacherMessage(t.text)
          : {};
      if (f.hasEmpathy || f.hasSafeSpace) {
        empathyStreak += 1;
        trust += empathyStreak >= 2 ? 9 : 6;
      } else {
        empathyStreak = 0;
      }
      if (f.hasJoining || f.hasRespect || f.hasProtection) trust += 6;
      if (f.hasOpenQuestion) trust += 3;
      // 구체 관찰(수업·잠 등)을 말하면 신뢰 소폭 상승
      if (/엎드|잠|급식|단톡|멍|게임|수학|시험|엄마|친구/.test(t.text || "")) trust += 3;
      if (f.hasPressure || f.hasLecture || f.hasVictimBlame || f.hasInsult || f.hasThreat) {
        trust -= 14;
        empathyStreak = 0;
      }
      if (f.hasMinimize || f.hasParentThreat) trust -= 8;
    });
    if (analysis) {
      if (analysis.hasEmpathy || analysis.hasSafeSpace) trust += 4;
      if (analysis.hasPressure || analysis.hasLecture || analysis.hasVictimBlame) trust -= 10;
    }
    // 턴이 쌓이면 조금씩 열리게
    trust += Math.min(20, teacherTurnCount(history) * 3);
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

  /** 사례별 공개 단계 대사 (반복 없이 순서 진행) */
  const DISCLOSURE = {
    1: [
      "…네. 부르셨어요?",
      "…그냥 좀 피곤해서요.",
      "요즘 밤에 잠이 잘 안 와요…",
      "수업 때 엎드리는 것도… 기운이 없어서예요.",
      "급식도 잘 안 먹게 됐어요.",
      "친구들이랑도 요즘 잘 안 어울려요.",
      "혼자 끙끙 앓고 있었어요…",
    ],
    2: [
      "…농구하다가요.",
      "…진짜예요. 별거 아니에요.",
      "…왜 계속 물어보세요?",
      "…그 말… 무슨 뜻이에요?",
      "…집에서 가끔 무서울 때가 있어요.",
      "…술 드시고 소리 지르실 때…",
    ],
    3: [
      "…뭐요.",
      "발로란트요. 아세요?",
      "거기선 팀장이에요. 작전 짜요.",
      "학교에선 안 보이는 모습이죠.",
      "학교는 솔직히 의미가 없어요.",
    ],
    4: [
      "선생님… 저 좀 들어주실래요?",
      "반 애들이… 단톡방에서요.",
      "일주일 넘게 욕도 들었어요.",
      "점심도 같이 안 먹게 해요.",
      "신고하면 더 괴롭힐까 봐…",
    ],
    5: [
      "우리 애가 그런 애가 아니에요!",
      "그럼 우리 애는 어떻게 되는 거예요?",
      "직접 연락해서 말씀드리면 안 될까요?",
      "절차표요? …읽어볼게요.",
      "직접 연락은 안 할게요.",
    ],
    6: [
      "저 진짜 이과 안 하고 싶어요.",
      "엄마는 무조건 의대 가래요.",
      "수학 보기만 해도 답답해요.",
      "국영은 괜찮은데 수학만 4등급이에요.",
      "중2 때 함수 나오고부터 막혔어요.",
      "문과 쪽이 더 맞는 것 같아요.",
    ],
    7: [
      "하고 싶은 게 없어요.",
      "뭘 좋아하는지도 모르겠어요.",
      "앉아서 종일 컴퓨터는 못 할 것 같아요.",
      "사람 많은 데도 싫어요.",
    ],
    8: [
      "저 수학 머리 없어요.",
      "친구는 한 번에 푸는데 전…",
      "그럼 저는 아직 낯선 거예요?",
      "분수부터 다시요? …해볼게요.",
    ],
    9: [
      "왜 배워야 해요? 복잡하잖아요.",
      "어제 마트 갔어요.",
      "아, 그게 수학이에요?",
      "함수가 더 나은 선택을 찾는 거라고요?",
    ],
    10: [
      "시험만 생각하면 손이 떨려요.",
      "머리가 하얘져요.",
      "지금은 한 8 정도…?",
      "호흡… 해볼게요.",
    ],
    11: [
      "아직 적응이 안 돼요.",
      "점심 혼자 먹어요.",
      "그림 그리는 건 좋아해요.",
      "동아리는… 용기가 안 나요.",
    ],
  };

  function extractTeacherCues(msg) {
    const m = msg || "";
    const cues = [];
    if (/엎드|기운|수업/.test(m)) cues.push("class");
    if (/잠|수면|밤|피곤/.test(m)) cues.push("sleep");
    if (/급식|점심|먹/.test(m)) cues.push("meal");
    if (/친구|어울/.test(m)) cues.push("friend");
    if (/도와|괜찮|힘들|천천히|말\s*안\s*해도/.test(m)) cues.push("care");
    if (/멍|팔|다치|농구/.test(m)) cues.push("bruise");
    if (/집|가족|무섭/.test(m)) cues.push("home");
    if (/게임|발로|롤/.test(m)) cues.push("game");
    if (/단톡|괴롭|욕|따돌/.test(m)) cues.push("bully");
    if (/엄마|의대|이과|문과|적성|수학|성적/.test(m)) cues.push("career");
    if (/시험|불안|떨/.test(m)) cues.push("exam");
    if (/그래\.?$|그렇구나|알겠어/.test(m.trim())) cues.push("ack");
    return cues;
  }

  function caseConcreteHints(caseData) {
    const hints = {
      1: "핵심 사실: 2주째 잠 설치기, 급식 거름, 수업 중 엎드림, 친구와 멀어짐.",
      2: "핵심 사실: 팔 멍, 농구 핑계 뒤 집·술·소리에 대한 두려움.",
      3: "핵심 사실: 발로란트/롤 팀장, 학교 무의미감.",
      4: "핵심 사실: 단톡 욕설, 점심 따돌림, 사물함 낙서, 신고 두려움.",
      5: "학부모: 방어·화 → 전학/연락 걱정 → 절차 안내 후 누그러짐.",
      6: "핵심 사실: 수학 4등급, 국영 괜찮음, 엄마 의대 강요, 이과 거부, 중2 함수부터.",
      7: "핵심 사실: 하고 싶은 것 없음, 컴퓨터 종일·사람 많은 곳 싫음.",
      8: "핵심 사실: 수학 머리 없다 생각, 분수 결손, 노출·연습 부족.",
      9: "핵심 사실: 왜 배우냐, 마트 계산이 수학임을 발견.",
      10: "핵심 사실: 손 떨림, 머리 하얘짐, 불안 척도.",
      11: "핵심 사실: 전학 후 점심 혼자, 그림·동아리.",
    };
    return hints[caseData.id] || "";
  }

  function disclosureStage(history, trust) {
    const turns = teacherTurnCount(history);
    if (trust < 25 && turns < 2) return 0;
    if (trust < 40) return Math.min(2, Math.max(1, turns));
    if (trust < 55) return Math.min(4, Math.max(2, turns));
    if (trust < 70) return Math.min(5, Math.max(3, turns + 1));
    return Math.min(6, Math.max(4, turns + 1));
  }

  function buildSystemPrompt(caseData, trustLevel, history, teacherMessage) {
    const isParent = caseData.clientRole === "parent";
    const name = caseData.studentName || (isParent ? "학부모" : "학생");
    const used = getUsedStudentTexts(history);
    const turns = teacherTurnCount(history);
    const closedUsed = alreadyUsedClosedPhrase(history);
    const cues = extractTeacherCues(teacherMessage).join(", ") || "없음";
    const usedBrief = used
      .slice(-5)
      .map(function (t) {
        return "- " + t;
      })
      .join("\n");

    const role = isParent
      ? "당신은 학부모 '" + name + "'입니다. 상담사·교사가 아닙니다."
      : "당신은 학생 '" + name + "'(" + (caseData.grade || "") + ")입니다. 상담을 받는 학생이지 상담사가 아닙니다.";

    return (
      role +
      "\n상황: " +
      caseData.situation +
      "\n" +
      caseConcreteHints(caseData) +
      "\n신뢰도: " +
      trustLevel +
      "/100 · 교사 발언 횟수: " +
      turns +
      "\n교사가 이번 말에 언급한 단서: " +
      cues +
      "\n\n이미 학생이 한 말(절대 비슷하게 반복 금지):\n" +
      (usedBrief || "- (없음)") +
      "\n\n이번 답변 규칙:\n" +
      "1. 교사의 직전 말에 직접 반응하세요. 교사가 수업·엎드림·잠·친구 등을 말했으면 그 내용을 인정하거나 짧게 해명하세요.\n" +
      "2. 「별일 없어요」「그냥요」「별거 없어요」「모르겠어요」는 " +
      (closedUsed ? "이미 썼으므로 이번엔 금지. 새 구체 사실 한 가지를 말하세요." : "최대 한 번만. 가능하면 구체 이유를 덧붙이세요.") +
      "\n" +
      "3. 1~3문장, 학생 말투. 상담사 멘트(진행할까요/말씀해 주세요) 금지.\n" +
      "4. 신뢰가 낮아도 같은 회피만 반복하지 말고, 조금씩 다른 사실(잠/급식/친구/엄마 등)을 드러내세요.\n" +
      "5. 교사가 짧게 「그래」만 해도, 이전 맥락을 이어 구체 한 조각을 더 말하세요. 「다행이네요」처럼 어색한 맞장구 금지.\n" +
      "6. 욕·훈계에는 상처·닫힘. 공감에는 조금 열림.\n" +
      "출력: 학생 대사만."
    );
  }

  function buildChatMessages(caseData, teacherMessage, history, trustLevel) {
    const name = caseData.studentName || "학생";
    const messages = [
      {
        role: "system",
        content: buildSystemPrompt(caseData, trustLevel, history, teacherMessage),
      },
    ];

    // 좋은 진행 예시 (회피 반복 아님)
    messages.push({
      role: "user",
      content: "[교사] 요즘 수업 때 엎드려 있는 것 같아서 걱정됐어. 괜찮아?",
    });
    messages.push({
      role: "assistant",
      content: "…수업이요. 요즘 기운이 없어서 그랬어요.",
    });
    messages.push({
      role: "user",
      content: "[교사] 힘들었겠다. 잠은 어때?",
    });
    messages.push({
      role: "assistant",
      content: "한 2주쯤부터 밤에 생각이 많아서 잠이 안 와요…",
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
        "\n\n→ '" +
        name +
        "'의 새 대답만. 이전과 다른 내용. 교사가 말한 구체 관찰에 반응. 상담사처럼 말하지 말 것.",
    });
    return messages;
  }

  function isCounselorSpeak(text) {
    return /진행하|어떤\s*방식|말씀해\s*주|도와드릴|필요하면\s*언제든|생각해\s*보셨|원하시는\s*방향|질문\s*있으신가요|들어드릴/.test(
      String(text || "")
    );
  }

  function isBadReply(text, history, teacherMessage) {
    const t = String(text || "").trim();
    if (t.length < 4) return true;
    if (isCounselorSpeak(t)) return true;
    if (/들어가도|오늘은\s*그만|상담\s*끝/.test(t)) return true;
    if (/다행이네요|다행이다니/.test(t) && !/다행/.test(teacherMessage || "")) return true;

    const used = getUsedStudentTexts(history);
    if (used.some(function (u) {
      return isSimilar(u, t);
    })) {
      return true;
    }

    // 회피 멘트 재사용 금지
    if (CLOSED_PHRASES.test(t) && alreadyUsedClosedPhrase(history)) return true;
    // 두 번째 턴부터 순수 회피만은 거부
    if (teacherTurnCount(history) >= 1 && /^(…)?(별일\s*없어요|그냥요|별거\s*없어요|모르겠어요)[\.…!]*$/i.test(t)) {
      return true;
    }
    // 교사가 구체 관찰했는데 무시하고 회피만
    const cues = extractTeacherCues(teacherMessage);
    if (
      cues.some(function (c) {
        return c === "class" || c === "sleep" || c === "meal" || c === "friend" || c === "career" || c === "bully";
      }) &&
      CLOSED_PHRASES.test(t) &&
      !/(엎드|피곤|잠|급식|친구|수업|기운|엄마|수학|단톡)/.test(t)
    ) {
      return true;
    }
    return false;
  }

  function contextualFallback(caseData, teacherMessage, history, trust, analysis) {
    const used = getUsedStudentTexts(history);
    const id = caseData.id;
    const msg = teacherMessage || "";
    const cues = extractTeacherCues(msg);
    const seed = hash(msg + "|" + used.length + "|" + trust);

    if (analysis && (analysis.hasInsult || analysis.hasThreat || analysis.hasLecture || analysis.hasVictimBlame)) {
      return pick(
        ["…왜 그렇게 말씀하세요.", "…말하기 싫어요.", "…제가 뭘 그렇게 잘못했는데요."],
        seed
      );
    }

    // 교사 단서 우선 매칭
    if (id === 1) {
      if (cues.indexOf("class") >= 0) {
        return pickUnused(["수업 때요… 요즘 기운이 없어서 엎드렸어요.", "집중이 안 돼서 그냥 엎드렸어요."], used, seed);
      }
      if (cues.indexOf("sleep") >= 0) {
        return pickUnused(["한 2주쯤부터 잠이 안 와요.", "밤에 생각이 많아서요…"], used, seed);
      }
      if (cues.indexOf("meal") >= 0) {
        return pickUnused(["급식도 요즘 잘 안 먹어요.", "입맛이 없어요."], used, seed);
      }
      if (cues.indexOf("friend") >= 0) {
        return pickUnused(["친구들이랑도 멀어진 것 같아요.", "요즘 혼자 있을 때가 많아요."], used, seed);
      }
      if (cues.indexOf("care") >= 0 || cues.indexOf("ack") >= 0) {
        return pickUnused(
          ["…사실 잠도 잘 안 와요.", "혼자 앓고 있었어요…", "말하기 싫었는데… 조금만요."],
          used,
          seed
        );
      }
    }

    if (id === 6 && (cues.indexOf("career") >= 0 || /적성|문과|이과|엄마|성적/.test(msg))) {
      return pickUnused(
        ["문과 쪽이 더 맞는 것 같아요.", "엄마는 의대만 가래요.", "수학은 4등급이에요…"],
        used,
        seed
      );
    }

    // 공개 단계에서 아직 안 쓴 대사
    const lines = DISCLOSURE[id] || DISCLOSURE[1];
    const stage = disclosureStage(history, trust);
    for (let i = 0; i <= Math.min(stage, lines.length - 1); i++) {
      if (
        !used.some(function (u) {
          return isSimilar(u, lines[i]);
        })
      ) {
        return lines[i];
      }
    }
    for (let j = 0; j < lines.length; j++) {
      if (
        !used.some(function (u) {
          return isSimilar(u, lines[j]);
        })
      ) {
        return lines[j];
      }
    }
    return "…음, 그건… 조금 더 말해볼게요.";
  }

  function pickUnused(candidates, used, seed) {
    const fresh = (candidates || []).filter(function (c) {
      return c && !used.some(function (u) {
        return isSimilar(c, u);
      });
    });
    return pick(fresh.length ? fresh : candidates, seed);
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
          temperature: 0.8,
          max_tokens: 180,
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
                    "\n\n학생(내담자) 대사만 출력. 이전과 다른 내용. 교사 관찰에 반응. 상담사 톤 금지:",
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.8, maxOutputTokens: 180 },
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

  async function callLiveAi(caseData, teacherMessage, history, trustLevel, analysis) {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller
        ? setTimeout(function () {
            controller.abort();
          }, 40000)
        : null;
      const signal = controller ? controller.signal : undefined;

      try {
        let ai = await callGemini(caseData, teacherMessage, history, trustLevel, signal);
        if (!ai || isBadReply(ai, history, teacherMessage)) {
          ai = await callPollinations(caseData, teacherMessage, history, trustLevel, signal);
        }
        if (ai && !isBadReply(ai, history, teacherMessage)) {
          return ai;
        }
      } finally {
        if (timer) clearTimeout(timer);
      }

      await sleep(1200 + attempt * 2000);
    }

    return contextualFallback(caseData, teacherMessage, history, trustLevel, analysis || {});
  }

  async function generateReply(caseData, teacherMessage, history, phaseIndex, analysis) {
    const trust = calcTrust(history, analysis);
    const ai = await callLiveAi(caseData, teacherMessage, history, trust, analysis);
    const message =
      ai && !isBadReply(ai, history, teacherMessage)
        ? ai
        : contextualFallback(caseData, teacherMessage, history, trust, analysis || {});

    return {
      message: message,
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
