/**
 * 교사 멘트 맥락에 맞는 학생·학부모 반응 생성
 * — 반복 방지, 주제별 응답, 감정 톤 반영
 */
const DialogueEngine = (function () {
  "use strict";

  const REACTION = {
    POSITIVE: "positive",
    NEGATIVE: "negative",
    NEUTRAL: "neutral",
    OPENING: "opening",
    DEFENSIVE: "defensive",
    CURIOUS: "curious",
  };

  const PREFIX = {
    positive: ["", "…(고개를 살짝 드며) ", "…(한숨을 내쉬며) ", "…(잠시 생각하다) "],
    negative: ["…(움츠리며) ", "…(고개를 돌리며) ", "…(작은 목소리로) ", "…(어깨를 움측) "],
    neutral: ["…", "…음, ", "…(머뭇거리며) ", "…글쎄요, "],
    opening: ["…(조금 늦게) ", "…(용기를 내어) ", ""],
    defensive: ["…(입을 다문 채) ", "…(눈을 피하며) ", "…(팔짱을 끼며) "],
    curious: ["…(고개를 갸웃) ", "…(눈이 커지며) ", "…(잠깐 생각하다) "],
  };

  const ACK = {
    empathy: [
      "선생님이 그렇게 말해줘서… ",
      "그 말… 조금… 위로가 돼요. ",
      "…네. 그 마음… 알 것 같아요. ",
      "…들어주셔서… ",
    ],
    safeSpace: [
      "…압박 안 느껴져서… 조금… ",
      "…말 안 해도 된다니… ",
      "…그렇게 말해주니… ",
    ],
    question: ["", "…음, ", "…그게… ", "…글쎄, "],
    respect: ["…네, ", "…아, ", "…그렇군요… "],
  };

  /** 사례·단계·반응별 대화 풀 (caseId → phaseId → reaction → messages[]) */
  const BANK = {
    1: {
      hesitant: {
        positive: [
          "…네. 그냥… 앉아도 돼요?",
          "…차… 마셔도 되는 거예요? …고마워요.",
          "…선생님이… 부담 안 주시는 것 같아서…",
        ],
        negative: [
          "…별일 없어요. …진짜요.",
          "…말하기 싫은데…",
          "…(침묵) …집에 가도 될까요?",
        ],
        neutral: [
          "…네, 선생님.",
          "…모르겠어요. …그냥…",
          "…(작게) …괜찮아요.",
        ],
      },
      opening: {
        positive: [
          "…사실… 요즘… 잠이 잘 안 와요.",
          "…밤에… 자꾸… 생각이 많아져요.",
          "…2주쯤… 그랬어요. …혼자…",
        ],
        neutral: [
          "…잠이요? …별로…",
          "…밤에… 뒤척이는…",
          "…점점… 심해지는…",
        ],
      },
      emotional: {
        positive: [
          "…많이… 힘들었어요. …눈물이…",
          "…친구들이랑… 멀어진 것 같아요.",
          "…이유는… 아직… 말하기… 어려워요.",
          "…선생님… 이렇게… 들어줘서…",
        ],
        opening: [
          "…사실… 더… 말하고… 싶은데…",
          "…조금씩… 괜찮아지는… 것 같기도…",
        ],
      },
      closure: {
        positive: [
          "…다음에… 또… 와도… 돼요?",
          "…오늘… 말해서… …나아진… 것 같아요.",
          "…고마워요… 선생님.",
        ],
      },
    },
    2: {
      denial: {
        neutral: [
          "…네. …농구하다가… 부딪혔어요.",
          "…운동할 때… 자주… 그래요.",
          "…별거… 아니에요… 진짜…",
        ],
        negative: [
          "…왜… 계속… 물어보세요?",
          "…말했잖아요… 넘어졌다고…",
        ],
        positive: [
          "…선생님이… 걱정… 해주시는… 거… 알아요.",
          "…그… 말… …무슨… 뜻이에요?",
        ],
      },
      considering: {
        positive: [
          "…도와주실… 수… 있어요?",
          "…무서워요… …말하면…",
          "…집에서… 가끔… …힘들…",
        ],
        opening: [
          "…선생님… …믿을… 수… 있을까요?",
          "…조금만… …더… …생각… 해볼게요.",
        ],
      },
      partial: {
        opening: [
          "…집에서… …가끔… …무서울… 때… 있어요.",
          "…소리… …지르실… 때… …방에… …숨어요.",
          "…오늘은… …여기까지… …말할게요.",
        ],
      },
      closure: {
        positive: [
          "…알겠어요… …선생님… …믿을게요.",
          "…다음에… …더… …말씀드릴… …수… …있을… …것… …같아요.",
        ],
      },
    },
    3: {
      closed: {
        negative: [
          "…뭐요. …바쁜데…",
          "…재미없어요. …들어가도… 돼요?",
          "…또… …뭐… …물어보시려고…",
        ],
        positive: [
          "…게임… …요? …○○… …아세요?",
          "…(눈빛이… …바뀜) …그… …게임… …좀… …재밌어요.",
        ],
      },
      interested: {
        positive: [
          "…팀장이에요. …작전… …물어봐요.",
          "…거기선… …좀… …살아있는… …느낌?",
          "…보여드릴까요? …잠깐… …만…",
        ],
        curious: [
          "…선생님도… …관심… …있으세요?",
          "…이… …게임… …{game}… …라고… …해요.",
        ],
      },
      honest: {
        opening: [
          "…학교… …의미… …없는… …것… …같아요.",
          "…솔직히… …말하니… …시원해요.",
          "…공부… …왜… …해야… …하는지… …모르겠어요.",
        ],
        positive: [
          "…선생님… …이렇게… …들어주니… …",
          "…학교에선… …안… …보이는… …모습… …맞아요.",
        ],
      },
      closure: {
        positive: [
          "…다음에… …또… …얘기… …해도… …돼요?",
          "…기분… …나아졌어요… …감사해요.",
        ],
      },
    },
    4: {
      fearful: {
        positive: [
          "…정말… …더… …괴롭힘… …당하지… …않을… …거… …맞죠?",
          "…신고… …하면… …더… …무서워질까… …봐…",
          "…단톡방… …욕… …사물함… …낙서… …다… …있어요.",
        ],
        opening: [
          "…일주일… …넘게… …그랬어요.",
          "…점심… …혼자… …먹게… …됐어요.",
          "…무서워서… …말… …못… …했어요.",
        ],
      },
      trusting: {
        positive: [
          "…네. …믿을게요.",
          "…날짜… …적어… …볼게요.",
          "…캡처… …해뒀어요.",
        ],
        opening: [
          "…혼자… …아닌… …것… …같아서… …다행이에요.",
          "…선생님… …말… …듣고… …조금… …안심…",
        ],
      },
      closure: {
        positive: [
          "…와서… …잘한… …것… …같아요.",
          "…감사합니다… …선생님.",
        ],
      },
    },
    5: {
      angry: {
        negative: [
          "…우리… …애가… …그런… …애… …아니에요!",
          "…편견… …있으신… …거… …아니에요?",
        ],
        positive: [
          "…그… …말… …무슨… …뜻이에요?",
          "…조사… …받으면… …어떻게… …되는… …거예요?",
        ],
      },
      questioning: {
        neutral: [
          "…전학… …가야… …하나요?",
          "…직접… …연락… …하면… …안… …돼요?",
          "…{childName}… …입장… …말할… …수… …있죠?",
        ],
        positive: [
          "…절차… …표… …주시는… …거예요?",
          "…알겠습니다… …일단… …읽어볼게요.",
        ],
      },
      calming: {
        positive: [
          "…직접… …연락… …안… …할게요.",
          "…담임이… …판단… …안… …하시는… …거… …이해했어요.",
        ],
      },
      closure: {
        positive: [
          "…절차표… …받았어요. …감사합니다.",
          "…조사… …결과… …기다릴게요.",
        ],
      },
    },
    6: {
      conflict: {
        opening: [
          "…이과… …안… …하고… …싶어요. …엄마… …랑… …매일… …싸워요.",
          "…수학… …답답해요. …국어… …영어… …는… …괜찮은데…",
          "…6학년… …때까지… …수학… …좋아했어요.",
        ],
        positive: [
          "…과목… …자체가… …싫은… …것… …같기도…",
          "…둘… …다… …인… …것… …같아요.",
        ],
      },
      exploring: {
        positive: [
          "…검사… …해보면… …엄마도… …들어주실까요?",
          "…3자… …면담… …좋을… …것… …같아요.",
          "…선생님이… …같이… …설명… …해주시면…",
        ],
      },
      closure: {
        positive: [
          "…마음이… …가벼워졌어요. …감사합니다.",
          "…검사… …부터… …해볼게요.",
        ],
      },
    },
    7: {
      empty: {
        neutral: [
          "…하고… …싶은… …게… …없어요.",
          "…다들… …정한… …것… …같아서… …불안해요.",
          "…저만… …이상한… …것… …같아요.",
        ],
        positive: [
          "…하기… …싫은… …거… …요?",
          "…그건… …있을… …것… …같아요.",
        ],
      },
      discovering: {
        opening: [
          "…컴퓨터… …종일… …보는… …건… …못… …할… …것… …같아요.",
          "…사람… …많이… …말하는… …것도… …싫고…",
          "…벌써… …두… …개나… …나왔네요?",
        ],
        positive: [
          "…직업… …카드… …같이… …볼… …수… …있어요?",
          "…다음… …시간… …기대… …돼요.",
        ],
      },
      closure: {
        positive: [
          "…시작점이… …생긴… …느낌? …고마워요.",
          "…다음… …주에… …봐요.",
        ],
      },
    },
    8: {
      fixed: {
        neutral: [
          "…수학… …머리… …없어요. …엄마도… …그래요.",
          "…친구는… …한… …번에… …풀던데…",
          "…저한테… …안… …되는… …것… …같아요.",
        ],
        positive: [
          "…여러… …번… …봤다고요?",
          "…낯선… …거라서… …그런… …거예요?",
          "…진단지… …한번… …풀어볼게요.",
        ],
      },
      reframing: {
        positive: [
          "…6학년… …분수… …부터… …요?",
          "…연습… …덜… …된… …거라니… …",
          "…조금… …희망… …생겨요.",
        ],
      },
      closure: {
        positive: [
          "…같이… …봐주시면… …해볼게요.",
          "…다음… …시간… …진단지… …가져올게요.",
        ],
      },
    },
    9: {
      resistant: {
        negative: [
          "…덧셈… …뺄셈만… …하면… …되잖아요.",
          "…학교… …수학… …너무… …복잡해요.",
          "…시험… …때문… …배우는… …거… …잖아요.",
        ],
        curious: [
          "…마트… …갔을… …때… …요?",
          "…그… …계산이… …수학이에요?",
        ],
      },
      curious: {
        positive: [
          "…아… …그렇구나.",
          "…학교… …꺼는… …더… …복잡한데…",
          "…함수가… …더… …나은… …선택… …?",
        ],
      },
      understanding: {
        positive: [
          "…게임… …만드는… …사람도… …써요?",
          "…논리적… …사고… …필요할… …것… …같기도…",
          "…한번… …더… …생각해볼게요.",
        ],
      },
      closure: {
        positive: [
          "…기분… …나쁘지… …않았어요. …감사합니다.",
          "…수학이… …연결돼… …있다는… …건… …처음… …알았어요.",
        ],
      },
    },
    10: {
      anxious: {
        opening: [
          "…손이… …떨려요. …공부… …는… …하는데…",
          "…3일… …남았는데… …잠… …못… …자요.",
          "…수학… …특히… …머리가… …하얘져요.",
        ],
        positive: [
          "…2주… …전부터… …그랬어요.",
          "…8… …정도… …? …지금…",
          "…호흡… …해볼게요.",
        ],
      },
      exploring: {
        positive: [
          "…말하니까… …조금… …가벼워요.",
          "…다음에… …또… …와도… …돼요?",
        ],
      },
      closure: {
        positive: [
          "…시험… …최선… …다해볼게요.",
          "…들어줘서… …고마워요… …선생님.",
        ],
      },
    },
    11: {
      isolated: {
        opening: [
          "…적응… …이… …안… …돼요.",
          "…점심… …혼자… …먹어요.",
          "…전… …학교가… …그립기도…",
        ],
        positive: [
          "…그림… …그리는… …건… …좋아해요.",
          "…동아리… …용기가… …없어서…",
        ],
      },
      opening_up: {
        positive: [
          "…작은… …것부터… …요?",
          "…미술… …동아리… …관심… …있어요.",
          "…옆… …반… …애… …미술… …좋아한다던데…",
        ],
      },
      closure: {
        positive: [
          "…동아리… …목록… …같이… …봐도… …돼요?",
          "…숨통이… …트여요. …고마워요.",
        ],
      },
    },
  };

  /** 카테고리별 주제 키워드 → 응답 */
  const TOPIC_REPLIES = {
    sleep: [
      "…한 2주쯤 전부터 잠이 잘 안 와요.",
      "…밤에 눈을 감아도 계속 생각이 나요.",
      "…새벽까지 깨어 있을 때가 많아요.",
    ],
    exam: [
      "…시험만 생각하면 손이 떨려요.",
      "…문제 읽다가 머리가 하얘져요.",
      "…공부는 하는데 시험장만 무서워요.",
    ],
    friends: [
      "…친구들이랑 어색해졌어요.",
      "…점심 혼자 먹게 됐어요.",
      "…단톡방에서 욕도 들었어요.",
    ],
    game: [
      "…게임 안에서는 팀장이에요.",
      "…거기선 제 말을 들어줘요.",
      "…{game} 하는데 거기선 자신 있어요.",
    ],
    career: [
      "…진로 정하기 너무 힘들어요.",
      "…엄마랑 맨날 싸워요.",
      "…수학 보기만 해도 답답해요.",
    ],
    math: [
      "…수학 머리 없는 것 같아요.",
      "…친구는 한 번에 풀던데…",
      "…30분 봐도 모르겠어요.",
    ],
    transfer: [
      "…전학 와서 아직 낯설어요.",
      "…점심 혼자 먹어요.",
      "…말 걸기가 어려워요.",
    ],
    parent: [
      "…어머님 말씀 이해는 돼요.",
      "…절차표 받아볼게요.",
      "…우리 애 억울해요, 진짜.",
    ],
  };

  const TOPIC_KEYS = {
    sleep: /잠|수면|불면|밤|새벽/,
    exam: /시험|고사|중간|기말|문제|성적/,
    friends: /친구|반\s*애|어울|왕따|따돌|단톡|카톡/,
    game: /게임|○○|팀장|발로란트|롤/,
    career: /진로|이과|문과|진학|대학|전공|의대|적성|흥미/,
    math: /수학|머리|점수|등급|풀|문제|분수|함수/,
    transfer: /전학|새\s*학교|적응|낯|동아리/,
    parent: /어머님|학부모|절차|조사|가해|피해/,
  };

  const GAMES = ["발로란트", "롤", "브롤", "오버워치", "마인크래프트", "피파"];

  function pick(arr, seed) {
    if (!arr || !arr.length) return "";
    return arr[Math.abs(seed) % arr.length];
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  function normalizeMsg(msg) {
    return (msg || "").replace(/\s+/g, "").slice(0, 40);
  }

  function getUsedMessages(history) {
    return history
      .filter(function (t) {
        return t.role === "student";
      })
      .map(function (t) {
        return normalizeMsg(t.text);
      });
  }

  function isDuplicate(msg, used) {
    const n = normalizeMsg(msg);
    return used.some(function (u) {
      return u === n || (u.length > 10 && n.length > 10 && u.slice(0, 12) === n.slice(0, 12));
    });
  }

  function pickUnique(candidates, used, seed) {
    const fresh = candidates.filter(function (c) {
      return !isDuplicate(c, used);
    });
    const pool = fresh.length ? fresh : candidates;
    return pick(pool, seed);
  }

  function detectTopics(text) {
    const topics = [];
    Object.keys(TOPIC_KEYS).forEach(function (key) {
      if (TOPIC_KEYS[key].test(text)) topics.push(key);
    });
    return topics;
  }

  function getReactionType(analysis, teacherMsg, phase) {
    if (phase.isClosure) return REACTION.POSITIVE;
    if (analysis.hasPressure || analysis.hasLecture || analysis.hasVictimBlame || analysis.hasDefensive)
      return REACTION.DEFENSIVE;
    if (analysis.hasEmpathy || analysis.hasSafeSpace || analysis.hasProtection)
      return REACTION.POSITIVE;
    if (analysis.hasJoining || analysis.hasRespect || analysis.hasRealLife)
      return REACTION.CURIOUS;
    if (analysis.hasOpenQuestion || /\?/.test(teacherMsg)) return REACTION.OPENING;
    if (analysis.hasMinimize || analysis.hasAuthority) return REACTION.NEGATIVE;
    return REACTION.NEUTRAL;
  }

  function mapReactionToBankKey(reaction) {
    if (reaction === REACTION.POSITIVE) return "positive";
    if (reaction === REACTION.NEGATIVE || reaction === REACTION.DEFENSIVE) return "negative";
    if (reaction === REACTION.OPENING) return "opening";
    if (reaction === REACTION.CURIOUS) return "curious";
    return "neutral";
  }

  function getPhaseBank(caseId, phaseId, bankKey) {
    const caseBank = BANK[caseId];
    if (!caseBank) return [];
    const phaseBank = caseBank[phaseId];
    if (!phaseBank) return [];
    return phaseBank[bankKey] || phaseBank.neutral || [];
  }

  function answerQuestion(teacherMsg, topics, analysis, seed, caseData) {
    if (/언제부터|언제\s*부터/.test(teacherMsg)) {
      if (topics.indexOf("sleep") >= 0)
        return pick(
          [
            "…2주쯤 전부터 그랬어요.",
            "…한 2주 된 것 같아요.",
            "…정확히는 모르겠는데, 점점 심해졌어요.",
          ],
          seed
        );
      if (topics.indexOf("exam") >= 0)
        return pick(
          ["…중2 때부터요.", "…작년부터 같아요.", "…고1 올라오면서 더 심해졌어요."],
          seed
        );
    }

    if (/어떤\s*느낌|무슨\s*느낌|기분/.test(teacherMsg)) {
      return pick(
        [
          "…답답해요. 말로 하기 어려운데…",
          "…가슴이 조여오는 느낌?",
          "…무거워요. 그냥 다 귀찮고…",
          "…모르겠어요. 그냥 힘들어요.",
        ],
        seed
      );
    }

    if (/왜|무슨\s*일|어떤\s*일/.test(teacherMsg) && !analysis.hasSafeSpace) {
      return pick(
        ["…별일 없어요, 진짜.", "…그냥 요즘 그래요.", "…말하기 싫어요."],
        seed
      );
    }

    if (/어떤\s*게임|무슨\s*게임/.test(teacherMsg)) {
      const game = pick(GAMES, seed);
      return "…" + game + " 해요. 아세요?";
    }

    if (/0.*10|척도|점수.*얼마|얼마나\s*불안/.test(teacherMsg)) {
      return pick(
        ["…8 정도요?", "…7이나 8? 지금…", "…10에 가까운 것 같아요."],
        seed
      );
    }

    if (/하기\s*싫|못\s*할|싫은\s*것/.test(teacherMsg)) {
      return pick(
        [
          "…앉아서 종일 컴퓨터 보는 거요.",
          "…사람 많은 데서 일하는 건 힘들 것 같아요.",
          "…큰 소리 나는 곳 싫어요.",
        ],
        seed
      );
    }

    if (/어제|저녁|마트|쇼핑/.test(teacherMsg)) {
      return pick(
        ["…엄마랑 마트 갔어요.", "…장 봤어요. 저녁 먹고…", "…마트 갔다 왔어요."],
        seed
      );
    }

    if (/다음|또\s*와|언제든/.test(teacherMsg) && analysis.hasNextVisit) {
      return pick(
        ["…네. 또 와도 돼요?", "…다음에 더 말해도 될까요?", "…고마워요, 선생님."],
        seed
      );
    }

    if (/수학\s*머리|머리.*있다/.test(teacherMsg)) {
      return pick(
        [
          "…있죠. 친구는 한 번에 풀던데…",
          "…없는 것 같아요, 저…",
          "…엄마도 그렇게 말해요.",
        ],
        seed
      );
    }

    if (/보호|안전|위험|혼자\s*두지/.test(teacherMsg)) {
      return pick(
        [
          "…정말 더 괴롭힘 당하지 않을 거 맞죠?",
          "…네. 믿을게요.",
          "…혼자가 아닌 것 같아서 다행이에요.",
        ],
        seed
      );
    }

    if (/기록|적어|캡처|날짜/.test(teacherMsg)) {
      return pick(
        ["…적어 볼게요.", "…캡처 해뒀어요.", "…기억나는 만큼 적을게요."],
        seed
      );
    }

    if (/분리|나눠|하나씩/.test(teacherMsg)) {
      return pick(
        [
          "…한꺼번에 정하려니 더 힘들어요.",
          "…나눠 보면 좀 가벼울 것 같아요.",
        ],
        seed
      );
    }

    if (/호흡|심호흡|이완/.test(teacherMsg)) {
      return pick(
        [
          "…(천천히 숨 쉬며) 조금 나아지는 것 같아요.",
          "…해볼게요. 같이 해요?",
        ],
        seed
      );
    }

    if (/관심|취미|동아리/.test(teacherMsg)) {
      return pick(
        ["…그림 그리는 건 좋아해요.", "…동아리 한번 알아보고 싶어요."],
        seed
      );
    }

    if (/친구|반\s*애|어울/.test(teacherMsg)) {
      return pick(
        [
          "…친구들이랑 멀어진 것 같아요.",
          "…점심도 같이 안 먹게 됐어요.",
          "…말 걸기가 어려워요.",
        ],
        seed
      );
    }

    if (/힘들|고생|어려웠/.test(teacherMsg) && analysis.hasEmpathy) {
      return pick(
        [
          "…(눈물) …많이 힘들었어요.",
          "…네… 혼자였는데…",
          "…그 말… 위로가 돼요.",
        ],
        seed
      );
    }

    return null;
  }

  function buildAck(analysis, seed) {
    if (analysis.hasEmpathy) return pick(ACK.empathy, seed);
    if (analysis.hasSafeSpace) return pick(ACK.safeSpace, seed);
    if (analysis.hasRespect) return pick(ACK.respect, seed);
    if (analysis.isQuestion) return pick(ACK.question, seed);
    return "";
  }

  function fillVars(text, vars) {
    return (text || "")
      .replace(/\{game\}/g, vars.game || pick(GAMES, vars.seed))
      .replace(/\{name\}/g, vars.name || "")
      .replace(/\{childName\}/g, vars.childName || vars.name || "");
  }

  function composeFromTopics(topics, seed, used, vars) {
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const replies = TOPIC_REPLIES[topic];
      if (!replies) continue;
      const msg = pickUnique(
        replies.map(function (r) {
          return fillVars(r, vars);
        }),
        used,
        seed + i
      );
      if (msg) return msg;
    }
    return null;
  }

  function cleanMessage(msg) {
    return (msg || "")
      .replace(/…{2,}/g, "…")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function generate(caseData, phaseIndex, teacherMessage, analysis, turnHistory) {
    const phase = caseData.phases[phaseIndex];
    if (!phase) return "…(침묵)";

    const used = getUsedMessages(turnHistory);
    const seed = hash(teacherMessage + turnHistory.length + phaseIndex);
    const reaction = getReactionType(analysis, teacherMessage, phase);
    const bankKey = mapReactionToBankKey(reaction);
    const topics = detectTopics(teacherMessage);
    const vars = {
      seed: seed,
      name: caseData.studentName,
      childName: caseData.childName || caseData.studentName,
      game: pick(GAMES, seed),
    };

    // 1) 질문에 대한 직접 답변
    let body = answerQuestion(teacherMessage, topics, analysis, seed, caseData);

    // 2) 주제 기반 응답
    if (!body || isDuplicate(body, used)) {
      body = composeFromTopics(topics, seed, used, vars);
    }

    // 3) 사례 원본 대화 + 단계별 풀 (원본 우선)
    if (!body || isDuplicate(body, used)) {
      const bank = getPhaseBank(caseData.id, phase.id, bankKey);
      const fallback = phase.studentMessages || [];
      const combined = fallback.concat(bank).map(function (m) {
        return fillVars(m, vars);
      });
      body = pickUnique(combined, used, seed);
    }

    // 4) 톤 접두사·공감 연결 (폐쇄 단계·부정 반응 제외)
    let prefix = "";
    if (reaction === REACTION.POSITIVE || reaction === REACTION.OPENING) {
      prefix = pick(PREFIX.positive, seed);
      if (analysis.hasEmpathy && Math.abs(seed) % 3 !== 0) {
        const ack = buildAck(analysis, seed);
        if (ack && body.indexOf(ack.trim()) < 0) {
          body = ack + body.replace(/^…/, "");
        }
      }
    } else if (reaction === REACTION.DEFENSIVE || reaction === REACTION.NEGATIVE) {
      prefix = pick(PREFIX.defensive, seed);
    } else if (reaction === REACTION.CURIOUS) {
      prefix = pick(PREFIX.curious, seed);
    } else {
      prefix = pick(PREFIX.neutral, seed);
    }

    let message = (prefix + body).replace(/…+/g, "…").trim();

    // 5) 여전히 중복이면 변형 접미사
    if (isDuplicate(message, used)) {
      const suffixes = [
        " …그게… …다예요.",
        " …음… …그랬어요.",
        " …(잠시 멈춤) …네.",
        " …조금… …더… …생각해볼게요.",
        " …선생님… …말… …듣고… …그래요.",
      ];
      message = message + pick(suffixes, seed + 1);
    }

    return cleanMessage(message);
  }

  /** 사례 4~11 등 BANK 미정의 사례 — phase 메시지 + 범용 생성 */
  function enrichGenericCase(caseData) {
    if (BANK[caseData.id]) return;
    BANK[caseData.id] = {};
    caseData.phases.forEach(function (phase) {
      const msgs = phase.studentMessages || [];
      BANK[caseData.id][phase.id] = {
        positive: msgs.slice(Math.ceil(msgs.length / 2)),
        negative: msgs.slice(0, 1),
        neutral: msgs,
        opening: msgs,
        curious: msgs,
      };
    });
  }

  function initBanks() {
    if (typeof COUNSELING_CASES !== "undefined") {
      COUNSELING_CASES.forEach(enrichGenericCase);
    }
  }

  initBanks();

  return {
    generate: generate,
    getReactionType: getReactionType,
    initBanks: initBanks,
  };
})();
