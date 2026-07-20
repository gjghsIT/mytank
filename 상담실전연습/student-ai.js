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

  function getPersona(caseData, phaseIndex) {
    const phase =
      caseData && caseData.phases && caseData.phases[phaseIndex] ? caseData.phases[phaseIndex] : null;
    const phaseId = phase ? phase.id : "";
    const late = /understanding|reframing|calming|honest|emotional|discovering|exploring|opening_up|curious|trusting|partial|interested/.test(
      phaseId
    );
    const closing = phase && phase.isClosure;

    const personas = {
      1: {
        problem:
          "최근 무기력하다. 수업 중 엎드리고, 급식을 거르고, 친구와도 멀어졌다. 초반에는 경계하고 말을 아낀다.",
        voice: "짧고 조심스러운 말투. 밝게 미래·대학 다짐하지 않는다.",
        forbid:
          "수학의 유용성 설교, 열심히 공부해 좋은 대학 가겠다는 모범생 톤, 다른 사례(따돌림·멍·게임) 섞기.",
      },
      2: {
        problem: "팔에 멍이 있다. 농구 등으로 둘러대려 하고, 집 이야기를 쉽게 하지 않는다.",
        voice: "방어적·망설임. 바로 학대 사실을 상세히 털어놓지 않는다.",
        forbid: "밝게 대학 다짐, 수학 유용성 강의, 다른 사례 내용.",
      },
      3: {
        problem: "학교·공부는 의미 없고, 게임(발로란트/롤)에는 관심이 살아 있다.",
        voice: "시큰둥하거나 게임 이야기에만 살아난다. 갑자기 모범생이 되지 않는다.",
        forbid: "수학이 꼭 필요하다고 설득하는 교사형 답변, 대학 진학 다짐.",
      },
      4: {
        problem: "단톡/따돌림 피해로 힘들고, 신고·보복이 두렵다.",
        voice: "불안·눈물이 섞인 톤. 공식 처리 요청은 망설이거나 두려워한다.",
        forbid: "수학 설교, 밝게 대학 다짐, 가해자처럼 행동하기.",
      },
      5: {
        problem: "자녀가 가해 의심을 받아 방어적이고 충격을 받은 학부모다.",
        voice: "학부모 말투. 자녀를 변호하거나 절차·편견을 걱정한다.",
        forbid: "학생처럼 숙제·수업·엎드림 이야기.",
      },
      6: {
        problem: "엄마는 이과·의대를 강요하고, 본인은 수학이 답답하며 문과 성향이다.",
        voice: "갈등·답답함. 수학을 갑자기 좋아하지 않는다.",
        forbid: "수학이 꼭 필요하다고 스스로 설득하기, 의대 가겠다고 바로 굴복하기(신뢰 낮을 때).",
      },
      7: {
        problem: "꿈·진로가 없다고 느낀다. 공허하다.",
        voice: "막막함. 갑자기 구체적 꿈을 꾸며내지 않는다.",
        forbid: "수학 유용성 강의, 대학 진학 다짐만으로 끝내기.",
      },
      8: {
        problem: "'나는 수학 머리가 없다'고 굳게 믿는다. 점수가 낮아 포기감이 있다.",
        voice: late || closing
          ? "조금씩 흔들리거나 희망을 보이되, 바로 완벽한 모범생이 되지 않는다."
          : "포기·고정관념 톤. '수학 머리 없어요' 입장을 쉽게 버리지 않는다.",
        forbid: "수학이 실생활에 꼭 필요하다고 교사처럼 설명하기. 갑자기 '열심히 해서 좋은 대학' 다짐.",
      },
      9: {
        problem:
          "학교 수학이 쓸데없다고 느낀다. '덧셈·뺄셈만 하면 되지 왜 배우냐'는 회의적 학생이다. 교사가 설득할 문제이지, 학생이 수학의 가치를 강의하는 역할이 아니다.",
        voice: closing
          ? "교사의 설명에 살짝 납득하거나 다시 생각해보겠다는 정도."
          : late
            ? "아직 반신반의. '그건 복잡하잖아요' '시험 때문이잖아요' 같은 의심이 남는다. 수학을 옹호하는 긴 설명은 하지 않는다."
            : "회의·직설. '왜 배워요?' '쓸데없어요?' 입장을 유지한다. 교사가 실생활 예를 들면 갸웃하거나 반박한다.",
        forbid:
          "학생이 먼저 '수학은 쇼핑·여행·재료비에 꼭 필요해요'처럼 유용성을 설교하기. '열심히 공부해서 좋은 대학' 다짐. 교사 역할을 가로채기.",
      },
      10: {
        problem: "시험만 보면 손이 떨리고 머리가 하얘진다. 공부는 하는데 불안하다.",
        voice: "불안·긴장. 갑자기 자신만만해지지 않는다.",
        forbid: "수학 유용성 설교, 밝게 대학 다짐.",
      },
      11: {
        problem: "전학 후 적응이 안 되고 점심을 혼자 먹는다. 그림·동아리에 관심이 있을 수 있다.",
        voice: "외로움·망설임.",
        forbid: "수학 설교, 다른 사례(따돌림·멍) 내용 섞기.",
      },
    };

    return personas[caseData.id] || {
      problem: caseData.situation || "",
      voice: "사례 상황에 맞는 학생(또는 학부모)으로만 말한다.",
      forbid: "다른 사례·교사형 설교.",
    };
  }

  function toneExamples(caseData, phaseIndex) {
    const phase =
      caseData && caseData.phases && caseData.phases[phaseIndex] ? caseData.phases[phaseIndex] : null;
    if (!phase || !phase.studentMessages || !phase.studentMessages.length) {
      return caseData.openingMessage ? "· " + caseData.openingMessage : "";
    }
    return phase.studentMessages
      .slice(0, 3)
      .map(function (t) {
        return "· " + t;
      })
      .join("\n");
  }

  function buildSystemPrompt(caseData, trust, history, phaseIndex) {
    const isParent = caseData.clientRole === "parent";
    const name = caseData.studentName || (isParent ? "학부모" : "학생");
    const persona = getPersona(caseData, phaseIndex || 0);
    const examples = toneExamples(caseData, phaseIndex || 0);
    const used = getUsedStudentTexts(history)
      .slice(-6)
      .map(function (t) {
        return "· " + t;
      })
      .join("\n");

    const shared =
      "\n절대 규칙:\n" +
      "1. 당신은 상담을 받는 " +
      (isParent ? "학부모" : "학생") +
      "이다. 교사가 아니다. 설득·강의·상담 안내 금지.\n" +
      "2. 사례에 설정된 「문제 성향」을 끝까지 유지하라. 갑자기 모범생·모범 학부모로 돌변하지 마라.\n" +
      "3. 교사의 「바로 직전 한 마디」내용·질문·지적에 직접 반응하라. 동문서답 금지.\n" +
      "4. 반드시 존댓말(해요체/합니다체). 반말 절대 금지. (~어/~아/~지/~야/~냐/~할게 등 금지, ~요/~습니다/~세요 사용)\n" +
      "5. 1~2문장. 다른 사례 내용 금지. 이전 대사 반복 금지.\n" +
      "6. 신뢰도가 낮으면 더 방어적/회의적. 신뢰가 높아도 「문제」가 한순간에 사라지지 않는다.\n" +
      "7. 교사가 반말을 해도, " +
      (isParent ? "학부모" : "학생") +
      "은 존댓말로만 답한다.\n";

    if (isParent) {
      return (
        "역할: 학부모 '" +
        name +
        "'\n" +
        "상황: " +
        caseData.situation +
        "\n문제 성향: " +
        persona.problem +
        "\n말투: " +
        persona.voice +
        " (존댓말)\n하지 말 것: " +
        persona.forbid +
        "\n신뢰도: " +
        trust +
        "/100\n" +
        shared +
        (examples ? "말투 참고(비슷한 톤·존댓말로, 그대로 복사 금지):\n" + examples + "\n" : "") +
        (used ? "이미 한 말(반복 금지):\n" + used + "\n" : "") +
        "출력: 학부모 존댓말 대사만."
      );
    }

    return (
      "역할: 한국 " +
      (caseData.grade || "중고등") +
      " 학생 '" +
      name +
      "' (상담 받는 학생)\n" +
      "상황: " +
      caseData.situation +
      "\n문제 성향(필수 유지): " +
      persona.problem +
      "\n말투: " +
      persona.voice +
      " (반드시 존댓말)\n하지 말 것: " +
      persona.forbid +
      "\n교사 신뢰도: " +
      trust +
      "/100\n" +
      shared +
      (examples ? "이 단계 말투 참고(존댓말로 바꿔서, 문장 복사 금지):\n" + examples + "\n" : "") +
      (used ? "이미 한 말(반복 금지):\n" + used + "\n" : "") +
      "출력: 학생 존댓말 대사만."
    );
  }

  function buildChatMessages(caseData, teacherMessage, history, trust, phaseIndex) {
    const isParent = caseData.clientRole === "parent";
    const name = caseData.studentName || (isParent ? "학부모" : "학생");
    const messages = [
      { role: "system", content: buildSystemPrompt(caseData, trust, history, phaseIndex) },
    ];

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
        ")의 대답 1~2문장만.\n" +
        "필수: 1) 교사 말의 내용·질문에 맞게 답할 것 2) 존댓말만 (~요/~습니다) 3) 반말 금지 " +
        "4) 사례 문제 성향 유지 5) 교사처럼 설득·설명하지 말 것.",
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

  /** 교사에게 쓰는 반말 감지 — 존댓말 필수 */
  function isBanmal(text) {
    const raw = String(text || "").trim();
    if (!raw) return false;

    // 괄호 속 행동 묘사 제외하고 검사
    const t = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return false;

    // 분명한 존댓말 종결이면 통과
    if (/(요|습니다|세요|시죠|죠|까요|데요|거예요|거에요|이에요|예요)[.!?…~ㅎ]*$/.test(t)) {
      return false;
    }

    const hasPolite = /요|습니다|세요|시죠/.test(t);

    // 망설이는 짧은 호칭·인사 (존댓말 대화의 일부로 허용)
    if (
      !hasPolite &&
      /선생님|죄송|감사|^네[,.\s]|^예[,.\s]/.test(t) &&
      !/(몰라|싫어|그래|맞아|뭐야|아니야|할게|할래|거든|잖아)$/.test(t.replace(/[.!?…~]+$/g, ""))
    ) {
      if (!/[가-힣](야|어|아|지|냐|니)$/.test(t.replace(/[.!?…~]+$/g, ""))) {
        return false;
      }
    }

    // 문장에 요/습니다가 전혀 없고 반말 종결이면 거부
    if (!hasPolite) {
      if (
        /(야|어|아|지|냐|니|자|게|래|네|거든|잖아|거야|할게|할래|마|봐|줘)[.!?…~]*$/.test(t)
      ) {
        return true;
      }
      if (
        /(몰라|싫어|그래|맞아|있어|없어|했어|뭐야|왜야|아니야|당연하지|모르겠어|하기\s*싫어|쓸모없어|쓸데없어)[.!?…~]*$/.test(
          t
        )
      ) {
        return true;
      }
      // 존댓말 표지 없이 서술형으로 끝나면 반말로 간주
      if (/[가-힣](다|군|구나)[.!?…~]*$/.test(t)) return true;
    }

    // 존댓말과 반말이 섞여도 반말 종결 문장이 있으면 거부
    const chunks = t.split(/[.!?…]+/).map(function (s) {
      return s.trim();
    }).filter(Boolean);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (/요|습니다|세요|죠|까요|데요|거예요|이에요|예요|선생님/.test(c)) continue;
      if (
        /(몰라|싫어|그래|맞아|있어|없어|했어|뭐야|아니야|할게|할래|거든|잖아|거야)$/.test(c) ||
        /[가-힣](야|어|아|지|냐|니)$/.test(c)
      ) {
        return true;
      }
    }

    return false;
  }

  /** 교사 멘트와 완전히 동떨어진 짧은 동문서답 완화 감지 */
  function ignoresTeacher(text, teacherMessage) {
    const teacher = String(teacherMessage || "").trim();
    const reply = String(text || "").trim();
    if (!teacher || teacher.length < 4 || !reply) return false;

    // 교사가 질문(?/까/니/냐)했는데 학생이 완전히 다른 주제만 — 휴리스틱
    const asksWhyMath = /왜\s*(배우|공부|필요)|필요\s*없|쓸\s*데|덧셈|뺄셈|수학/.test(teacher);
    if (asksWhyMath && !/수학|배우|공부|필요|덧셈|뺄셈|시험|복잡|쓸|계산/.test(reply)) {
      return true;
    }

    const asksFact = /(잠|밥|급식|친구|멍|게임|엄마|아빠|진로|꿈|시험|전학)/.test(teacher);
    if (asksFact) {
      const topic = teacher.match(/(잠|밥|급식|친구|멍|게임|엄마|아빠|진로|꿈|시험|전학|수학)/);
      if (topic && topic[1] && reply.indexOf(topic[1]) < 0 && reply.length < 25) {
        // 너무 짧고 주제 단어가 없으면 의
        return true;
      }
    }

    return false;
  }

  /** 학생이 교사처럼 설득하거나, 사례 문제와 반대로 돌변하는 답 차단 */
  function breaksCharacter(text, caseData, phaseIndex) {
    const t = String(text || "");
    const phase =
      caseData && caseData.phases && caseData.phases[phaseIndex] ? caseData.phases[phaseIndex] : null;
    const phaseId = phase ? phase.id : "";
    const early =
      !phase ||
      phase.isClosure !== true &&
        /resistant|fixed|conflict|empty|anxious|isolated|hesitant|denial|closed|fearful|angry/.test(
          phaseId || "resistant"
        );

    // 공통: 학생이 수학 유용성을 교사처럼 강의
    const mathLecture =
      /수학(은|이|을).{0,12}(꼭\s*)?필요|실생활.{0,8}(꼭\s*)?필요|쇼핑할\s*때|가격을\s*비교|재료비|여행\s*경비|돈을\s*나눠|논리적으로\s*생각하는\s*힘/.test(
        t
      ) && /필요|중요|쓰여|쓰이|배워야/.test(t);

    // 공통: 갑자기 모범생 다짐
    const modelStudent = /열심히\s*공부해서\s*좋은\s*대학|좋은\s*대학에\s*가도록|모범적으로/.test(t);

    if (caseData && caseData.id === 9) {
      if (mathLecture) return true;
      if (modelStudent) return true;
      if (early && /알겠어요|신기한데요|처음\s*알았|연결돼/.test(t) && !/근데|그치만|아직은|잘\s*모르|복잡/.test(t)) {
        return true;
      }
      // 회의 없이 수학을 옹호
      if (early && /수학.{0,10}(정말|진짜)\s*(중요|필요)/.test(t)) return true;
    }

    if (caseData && caseData.id === 8) {
      if (mathLecture) return true;
      if (modelStudent) return true;
      if (early && /수학\s*머리\s*(있|생겼)|이제\s*할\s*수\s*있/.test(t)) return true;
    }

    if (caseData && caseData.id === 3) {
      if (modelStudent) return true;
      if (early && /열심히\s*공부|학교\s*생활.*(열심|잘)/.test(t)) return true;
    }

    if (caseData && caseData.id === 1) {
      if (modelStudent) return true;
      if (mathLecture) return true;
      if (early && /기운이\s*나요|이제\s*괜찮|밥도\s*잘\s*먹/.test(t)) return true;
    }

    if (caseData && caseData.id === 6) {
      if (early && /엄마\s*말대로\s*이과|의대\s*갈게|수학\s*더\s*열심/.test(t)) return true;
      if (mathLecture && early) return true;
    }

    if (caseData && caseData.id === 7) {
      if (early && /꿈이\s*(생겼|있어요)|장래희망이/.test(t) && !/아직|잘\s*모르|없는\s*것/.test(t)) {
        return true;
      }
    }

    // 다른 사례에서도 교사형 수학 강의는 거부
    if (mathLecture && caseData && caseData.id !== 9 && caseData.id !== 8) {
      // 9·8 외에는 수학 설교가 사례와 무관
      if (!/시험|점수|머리|진로|이과/.test(t)) return true;
    }

    if (modelStudent && caseData && [1, 2, 3, 4, 10, 11].indexOf(caseData.id) >= 0) return true;

    return false;
  }

  function isBadReply(text, history, teacherMessage, caseData, phaseIndex) {
    const t = String(text || "").trim();
    if (t.length < 2) return true;
    if (t.length > 180) return true;
    if (isCounselorSpeak(t)) return true;
    if (isNonsensical(t)) return true;
    if (isBanmal(t)) return true;
    if (ignoresTeacher(t, teacherMessage)) return true;
    if (breaksCharacter(t, caseData, phaseIndex)) return true;
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

  async function fetchWithTimeout(fn, ms) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, ms)
      : null;
    try {
      return await fn(controller ? controller.signal : undefined);
    } catch (e) {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function callLiveAi(caseData, teacherMessage, history, trust, analysis, phaseIndex) {
    const messages = buildChatMessages(caseData, teacherMessage, history, trust, phaseIndex);
    const overallDeadline = Date.now() + 16000;

    function reject(ai) {
      return !ai || isBadReply(ai, history, teacherMessage, caseData, phaseIndex);
    }

    // 각 API는 짧은 개별 타임아웃 — 한 요청이 입력을 오래 잠그지 않음
    let ai = await fetchWithTimeout(function (signal) {
      return callGemini(messages, signal);
    }, 7000);

    if (reject(ai) && Date.now() < overallDeadline) {
      ai = await fetchWithTimeout(function (signal) {
        return callPollinations(messages, signal);
      }, 9000);
    }

    if (!reject(ai)) {
      return ai;
    }

    // 품질 필터가 까다로울 때: 캐릭터·존댓말만은 지켜야 함
    if (
      ai &&
      ai.length >= 4 &&
      !isNonsensical(ai) &&
      !isCounselorSpeak(ai) &&
      !isBanmal(ai) &&
      !breaksCharacter(ai, caseData, phaseIndex)
    ) {
      return ai;
    }

    // 마지막 한 번 더 Pollinations (짧은 재시도)
    if (Date.now() < overallDeadline - 2000) {
      await sleep(400);
      ai = await fetchWithTimeout(function (signal) {
        return callPollinations(messages, signal);
      }, 7000);
      if (
        ai &&
        ai.length >= 4 &&
        !isNonsensical(ai) &&
        !isCounselorSpeak(ai) &&
        !isBanmal(ai) &&
        !breaksCharacter(ai, caseData, phaseIndex)
      ) {
        return ai;
      }
    }

    return null;
  }

  async function generateReply(caseData, teacherMessage, history, phaseIndex, analysis) {
    const trust = calcTrust(history, analysis);
    const ai = await callLiveAi(
      caseData,
      teacherMessage,
      history,
      trust,
      analysis,
      phaseIndex || 0
    );

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
