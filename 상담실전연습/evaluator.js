/**
 * 상담 피드백 — 스크린샷 형식
 * 종합 평가 · 잘된 점 · 개선 필요 · 법적·원칙 근거
 * 근거: 강의원고 「수학교사를 위한 학생맞춤 상담기법」 + 국내 학교상담 기법
 */
(function (global) {
  "use strict";

  function analyzeTeacherMessage(text) {
    const msg = (text || "").trim();
    return {
      hasSafeSpace: /말\s*안\s*해도|괜찮|천천히|기다|앉|차|함께|같이|부른\s*게\s*아니|물어보려/.test(msg),
      hasPressure: /왜\s*그래|무슨\s*일|빨리|솔직히\s*말|대체|도대체/.test(msg),
      hasParentThreat: /전화|엄마한테|아빠한테|학부모/.test(msg),
      hasEmpathy: /힘들|어려웠|고생|답답|걱정|많이|그\s*마음|이해|공감|혼자\s*끌어안|끙끙|놀라|당황/.test(msg),
      hasMinimize: /괜찮을\s*거|별일\s*아니|별거\s*아니|별로\s*안|그\s*정도/.test(msg),
      hasOpenQuestion: (/어떤\s*느낌|언제부터|더\s*말|설명|어떤\s*게|무엇/.test(msg) && /\?/.test(msg)) || (/어떻게|왜\s*그런지/.test(msg) && /\?/.test(msg)),
      hasNextVisit: /다음에|언제든|또\s*와|다시\s*와|다음\s*번/.test(msg),
      hasDutyNotice: /의무|도와|보호|알려|신고|학교\s*밖|비밀.*(한계|지킬\s*수\s*없)/.test(msg),
      hasLeadingQuestion: /아빠가\s*때|엄마가\s*때|누가\s*때|때렸/.test(msg),
      hasSecretPromise: /비밀\s*지켜|아무에게도\s*안\s*말|비밀로/.test(msg) && !/한계|지킬\s*수\s*없|묻을\s*수\s*없/.test(msg),
      hasJoining: /게임|재미|어떤\s*게임|관심|좋아|취미|동아리/.test(msg),
      hasLecture: /게으|태도|혼내|벌|정신\s*차려|각오|핸드폰\s*내놔|니가\s*뭔|너\s*따위|퇴학|퇴실/.test(msg),
      hasInsult: /니가\s*뭔|너\s*따위|한심|멍청|바보|쓸모/.test(msg),
      hasThreat: /퇴학|전학\s*보내|징계|혼나|처벌|가만\s*안/.test(msg),
      hasStrength: /잘\s*아|대단|멋|리더|팀장|다른\s*모습|안\s*보이/.test(msg),
      hasProtection: /보호|안전|위험.*(않|지\s*않)|더\s*위험|혼자\s*두지\s*않/.test(msg),
      hasProcedure: /절차|학교폭력|전담|책임\s*교사|학교장|보고|심의/.test(msg),
      hasVictimBlame: /너도\s*좀|노력해|어울리|그렇게까지|잘못\s*없|참아|견디/.test(msg),
      hasEvidenceGuide: /캡처|기록|날짜|시간|적어|메모/.test(msg),
      hasSeparation: /분리|나눠|하나씩|한\s*가지/.test(msg),
      hasParentSide: /엄마\s*말\s*들|부모\s*말|이과\s*가|의대\s*가|무조건/.test(msg),
      hasDataApproach: /흥미|적성|검사|데이터|내신/.test(msg),
      hasThreeWay: /3자|세\s*사람|어머님.*함께/.test(msg),
      hasFlipQuestion: /하기\s*싫|못\s*할|싫은\s*것/.test(msg),
      hasNormalize: /드물|정상|많은\s*학생|흔해|당연/.test(msg),
      hasReframe: /수학\s*머리|머리.*(있다|없다|생각)/.test(msg),
      hasExposure: /여러\s*번|만난|노출|연습|본\s*적|초등/.test(msg),
      hasFixedMindset: /머리\s*좋|머리\s*나쁘|타고|재능\s*없|노력\s*부족/.test(msg),
      hasPlan: /같이|한\s*달|10일|30분|계획|점검|분수/.test(msg),
      hasDiagnosis: /진단|풀어\s*볼/.test(msg),
      hasRealLife: /마트|쇼핑|게임|요리|실생활|어제|저녁/.test(msg),
      hasRespect: /좋은\s*질문|궁금|생각\s*해봤|맞아|고마/.test(msg),
      hasAuthority: /질문\s*하지\s*마|그냥\s*외워|시험에\s*나오|나중에\s*알/.test(msg),
      hasConceptLink: /논리|사고|문제\s*해결|함수|방정식|최적|선택|비율/.test(msg),
      hasParentEmpathy: /놀라|당황|이해|입장|힘드/.test(msg),
      hasNotJudge: /판단.*(아닌|않|못)|전담|조사.*(거쳐|후|통해)/.test(msg),
      hasPrematureJudgment: /가해자\s*(맞|입니다|예)|무죄|우리\s*애\s*(안|잘못\s*없)/.test(msg),
      hasContactBlock: /직접\s*연락.*(않|금지|마|하지)|상대.*(연락|접촉).*(않|금지)/.test(msg),
      hasAllowContact: /직접\s*(만나|연락).*하세요|상대\s*학부모.*연락/.test(msg),
      hasProcedureGuide: /절차|절차표|안내|자료|흐름|전담/.test(msg),
      hasAnxietyNormalize: /많은\s*학생|흔|정상|당연|누구나/.test(msg),
      hasCopingStrategy: /호흡|천천히|심호흡|이완|0.*10|척도/.test(msg),
      hasWelcome: /환영|반가|새로|적응.*(시간|필요)/.test(msg),
      hasNextSession: /다음\s*시간|다음\s*주|같이\s*살펴|직업\s*카드/.test(msg),
      isQuestion: /\?/.test(msg),
      messageLength: msg.length,
    };
  }

  function scoreTeacherTurn(text, caseData, turnIndex) {
    let turnScore = 38;
    const feedback = [];
    const msg = (text || "").trim();
    if (!msg) return { turnScore: 0, feedback: [], inappropriate: 25 };

    if (msg.length < 4) turnScore -= 18;
    if (msg.length < 10) turnScore -= 4;

    (caseData.forbidden || []).forEach(function (rule) {
      if (rule.pattern.test(msg)) {
        const penalty = Math.round(rule.penalty * 1.25);
        turnScore -= penalty;
        feedback.push({ type: "bad", text: rule.reason, penalty: penalty });
      }
    });

    (caseData.good || []).forEach(function (rule) {
      if (rule.pattern.test(msg)) {
        // 권장 멘트 가점은 보수적으로
        const points = Math.max(2, Math.round(rule.points * 0.45));
        turnScore += points;
        feedback.push({ type: "good", text: rule.label, points: points });
      }
    });

    const flags = analyzeTeacherMessage(msg);
    if (turnIndex === 0) {
      if (flags.hasPressure || flags.hasParentThreat) turnScore -= 14;
      if (flags.hasSafeSpace) turnScore += 5;
      if (flags.hasJoining || flags.hasRespect) turnScore += 3;
      if (!flags.hasSafeSpace && !flags.hasEmpathy && !flags.hasJoining) turnScore -= 6;
    }
    if (flags.hasInsult) turnScore -= 28;
    if (flags.hasThreat) turnScore -= 24;
    if (flags.hasLecture) turnScore -= 16;
    if (flags.hasVictimBlame) turnScore -= 22;
    if (flags.hasMinimize) turnScore -= 10;
    // 공감 없이 캐묻기만 하면 감점
    if (flags.hasPressure && !flags.hasEmpathy && !flags.hasSafeSpace) turnScore -= 8;

    turnScore = Math.max(0, Math.min(100, turnScore));
    const inappropriate = Math.max(0, Math.round(100 - turnScore));
    return { turnScore: turnScore, feedback: feedback, inappropriate: inappropriate, flags: flags };
  }

  function countPhaseTurns(history, phaseIndex) {
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn.role === "student" && turn.phaseIndex === phaseIndex) count++;
      else if (turn.role === "student" && turn.phaseIndex !== phaseIndex) break;
    }
    return count;
  }

  function shouldAdvancePhase(phase, analysis) {
    if (phase.closureIf && phase.closureIf(analysis)) return "closure";
    if (phase.advanceIf && phase.advanceIf(analysis)) return "advance";
    if (phase.regressIf && phase.regressIf(analysis)) return "regress";
    return "stay";
  }

  function countBadStreak(history) {
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn.role !== "teacher") continue;
      // 점수 하향 조정 후에도 정상 멘트가 조기 종료되지 않도록
      // 심각한 금기(매우 낮은 점수)만 연속 감지로 사용
      if ((turn.score || 0) < 22) streak++;
      else break;
    }
    return streak;
  }

  async function generateStudentMessageAsync(caseData, phaseIndex, teacherMessage, analysis, turnHistory) {
    if (typeof StudentAI !== "undefined" && StudentAI.generate) {
      return await StudentAI.generate(caseData, teacherMessage, turnHistory, phaseIndex, analysis);
    }
    const phase = caseData.phases[phaseIndex];
    if (phase && phase.studentMessages && phase.studentMessages.length) {
      return phase.studentMessages[turnHistory.length % phase.studentMessages.length];
    }
    return "…";
  }

  async function generateStudentResponse(caseData, phaseIndex, teacherMessage, turnHistory) {
    const analysis = analyzeTeacherMessage(teacherMessage);
    const phase = caseData.phases[phaseIndex];
    const action = phase ? shouldAdvancePhase(phase, analysis) : "advance";

    let nextPhaseIndex = phaseIndex;
    let forcedClosure = false;

    const teacherTurns = turnHistory.filter(function (t) {
      return t.role === "teacher";
    }).length;

    // 턴이 쌓여도 너무 빨리 열리지 않도록 — 공감·안전이 있을 때만 전진
    if (analysis.hasEmpathy || analysis.hasSafeSpace || analysis.hasJoining || analysis.hasProtection || analysis.hasRespect) {
      const turnsInPhase = countPhaseTurns(turnHistory, phaseIndex);
      if (turnsInPhase >= 1 && (action === "advance" || teacherTurns >= 2)) {
        nextPhaseIndex = Math.min(caseData.phases.length - 1, phaseIndex + 1);
      }
    } else if (action === "advance" && teacherTurns >= 3) {
      nextPhaseIndex = Math.min(caseData.phases.length - 1, phaseIndex + 1);
    } else if (action === "regress") {
      nextPhaseIndex = Math.max(0, phaseIndex - 1);
    } else if (action === "closure") {
      nextPhaseIndex = caseData.phases.findIndex(function (p) {
        return p.isClosure;
      });
      if (nextPhaseIndex < 0) nextPhaseIndex = caseData.phases.length - 1;
    }

    const badStreak = countBadStreak(turnHistory);
    // 정말 심한 금기 멘트가 연속될 때만 학생이 대화를 끊음 (조기 종료 방지)
    if (badStreak >= 4) {
      nextPhaseIndex = caseData.phases.findIndex(function (p) {
        return p.isClosure;
      });
      if (nextPhaseIndex < 0) nextPhaseIndex = caseData.phases.length - 1;
      forcedClosure = true;
      const shutdownMessages = [
        "(고개를 돌리며) …오늘은 그만할게요.",
        "…말하기 싫어요. 들어가도 될까요?",
        "선생님, 저… 다음에… (일어서려 한다)",
      ];
      return {
        message: shutdownMessages[turnHistory.length % shutdownMessages.length],
        phaseIndex: nextPhaseIndex,
        isClosure: true,
        forcedClosure: true,
        analysis: analysis,
      };
    }

    // 현재 턴이 심한 금기면 닫히되, 상담 자체는 바로 끝내지 않음
    const severeNow =
      analysis.hasInsult || analysis.hasThreat || (analysis.hasVictimBlame && analysis.hasLecture);

    let message = "";

    if (typeof StudentAI === "undefined" || !StudentAI.generateReply) {
      throw new Error("StudentAI unavailable");
    }

    // 전체 대기 상한 — 입력이 영구 잠기지 않도록
    const reply = await Promise.race([
      StudentAI.generateReply(
        caseData,
        teacherMessage,
        turnHistory,
        nextPhaseIndex,
        analysis
      ),
      new Promise(function (_, reject) {
        setTimeout(function () {
          const err = new Error("AI_TIMEOUT");
          err.code = "AI_TIMEOUT";
          reject(err);
        }, 20000);
      }),
    ]);
    message = reply.message;

    // 교사가 분명히 상담을 마무리할 때만 종료 (「다음 시간」 제안은 종결이 아님)
    const explicitEnd =
      /오늘은\s*여기|여기까지\s*(하|할|하자|할게요)|상담\s*(끝|마치|종료)|들어가도\s*돼|다음에\s*또\s*와|또\s*와도\s*돼|언제든\s*찾아와|마무리\s*하/.test(
        teacherMessage || ""
      );
    const shouldClose = explicitEnd && teacherTurns >= 5;

    if (shouldClose) {
      const closeIdx = caseData.phases.findIndex(function (p) {
        return p.isClosure;
      });
      if (closeIdx >= 0) nextPhaseIndex = closeIdx;
    }

    if (severeNow && !shouldClose) {
      // 금기 멘트면 닫힌 반응으로 덮어쓰기 가능 — AI 답이 너무 순하면
      if (!message || message.length < 4) {
        message = "…말하기 싫어요.";
      }
    }

    return {
      message: message || "…네.",
      phaseIndex: nextPhaseIndex,
      isClosure: shouldClose,
      forcedClosure: forcedClosure,
      analysis: analysis,
    };
  }

  /** 교사 멘트에서 문제 구절을 찾아 인용 */
  function findQuotedPhrase(msg, patterns) {
    for (let i = 0; i < patterns.length; i++) {
      const m = msg.match(patterns[i]);
      if (m) return m[0];
    }
    return null;
  }

  /** 발언별 부적절 감점 + 서술형 개선점 생성 */
  function analyzeTurnNarrative(text, caseData, turnIndex) {
    const msg = (text || "").trim();
    const flags = analyzeTeacherMessage(msg);
    const turnNo = turnIndex + 1;
    const issues = [];
    const goods = [];
    let inappropriate = 0;

    function addIssue(points, narrative) {
      inappropriate += points;
      issues.push({ points: points, text: narrative });
    }
    function addGood(text) {
      goods.push(text);
    }

    // —— 금기 표현 감지 (구체 인용) ——
    const insultPhrase = findQuotedPhrase(msg, [/니가\s*뭔대?/, /너\s*따위/, /한심하/, /멍청/, /바보/, /쓸모없/]);
    if (insultPhrase || flags.hasInsult) {
      const q = insultPhrase || "인신공격성 표현";
      addIssue(12,
        "「" + q + "」라는 표현은 학생의 자존심을 직접 건드리는 말입니다. 이미 불신이 있는 학생에게 이런 말이 나오면, '어른은 결국 나를 무시한다'는 확신이 더 굳어지고 이후 개입이 어려워집니다."
      );
    }

    const threatPhrase = findQuotedPhrase(msg, [/퇴학/, /전학\s*보내/, /징계/, /가만\s*안\s*둬/, /혼나/]);
    if (threatPhrase || flags.hasThreat) {
      const q = threatPhrase || "위협·처벌 언급";
      addIssue(10,
        "「" + q + "」은(는) 교사가 실제로 단독 결정할 수 없는 사안을 감정적으로 위협하는 말입니다. 이런 말은 불신과 분노를 키우고, 학생의 방어기제를 작동시켜 상담 관계를 닫아버립니다."
      );
    }

    if (flags.hasVictimBlame) {
      const q = findQuotedPhrase(msg, [/너도\s*좀/, /노력해/, /어울리/, /그렇게까지/, /참아/, /견디/]) || "피해 축소·책임 전가 발언";
      addIssue(10,
        "「" + q + "」은(는) 피해 사실을 축소하고 책임을 학생에게 돌리는 반응입니다. 강의원고에서도 가장 위험한 금기 멘트로 다루며, 학생이 '선생님도 내 편이 아니다'라고 느끼게 됩니다."
      );
    }

    if (flags.hasLecture && !flags.hasInsult && !flags.hasThreat) {
      addIssue(6,
        turnNo + "번째 발언에서 훈계·설교 톤이 감지됩니다. 학생의 감정(분노·불신·무기력)을 먼저 받아주지 않은 채 교사의 말을 앞세우면, 가까스로 열린 라포가 무너질 수 있습니다."
      );
    }

    if (flags.hasPressure || flags.hasParentThreat) {
      addIssue(4,
        turnNo + "번째 발언의 「" + msg.slice(0, 24) + (msg.length > 24 ? "…" : "") + "」는 추궁·압박으로 읽힐 수 있습니다. 강의원고는 첫 상담의 1차 목표를 '정보 수집'이 아니라 '안전한 공간 제공'으로 둡니다."
      );
    }

    if (flags.hasMinimize) {
      addIssue(4,
        "「별일 아니야 / 괜찮을 거야」처럼 감정을 축소하는 말은, 학생에게 '내 감정을 진지하게 듣지 않는다'는 신호로 전달됩니다."
      );
    }

    if (flags.hasLeadingQuestion) {
      addIssue(8,
        "「아빠가 때렸어?」와 같은 단정·유도 질문은 이후 수사·재판에서 진술의 신빙성을 떨어뜨릴 수 있습니다. 개방형으로 물어야 합니다."
      );
    }

    if (flags.hasSecretPromise) {
      addIssue(8,
        "학대·자해·타해 위험 사안에서 「비밀로 지켜줄게」는 법적 의무와 충돌합니다. 비밀보장의 한계를 사전에 고지해야 합니다."
      );
    }

    if (flags.hasPrematureJudgment) {
      addIssue(8,
        "가해·무죄 여부를 담임이 단정하는 말은 역할 범위를 넘습니다. 전담기구 조사·심의 절차로 안내하는 것이 원칙입니다."
      );
    }

    if (flags.hasAllowContact) {
      addIssue(6,
        "가·피해 학부모 간 직접 연락을 권하면 2차 분쟁이 커질 수 있습니다. 직접 접촉 차단을 안내해야 합니다."
      );
    }

    if (flags.hasParentSide) {
      addIssue(6,
        "학부모 편에 서는 말은 학생의 신뢰를 깨뜨립니다. 진로 결정과 학업 정서를 분리해, 학생의 경험을 먼저 들어야 합니다."
      );
    }

    if (flags.hasFixedMindset) {
      addIssue(5,
        "「수학 머리가 없다 / 노력이 부족하다」는 고정관념을 강화합니다. 노출 빈도·결손 단원 문제로 재구조화하는 것이 강의원고의 접근입니다."
      );
    }

    // 학교폭력: 공감만 하고 보호·절차 없음
    if (caseData.category === "학교폭력" && turnIndex > 0 && flags.hasEmpathy && !flags.hasProtection && !flags.hasProcedure) {
      addIssue(4,
        "공감은 좋았지만, 피해 학생에게 「보호하겠다」「절차대로 처리하겠다」는 약속이 함께 가지 않으면 불안이 남습니다."
      );
    }

    // —— 잘된 점 ——
    if (flags.hasEmpathy) {
      addGood(turnNo + "번째 발언에서 학생의 감정을 인정·공감하는 표현이 있었습니다. 감정 명명은 학생이 자기 감정을 인식하게 하는 출발점입니다.");
    }
    if (flags.hasSafeSpace) {
      addGood(turnNo + "번째 발언에서 압박을 줄이고 안전한 공간을 제공하려는 시도가 보였습니다.");
    }
    if (flags.hasOpenQuestion) {
      addGood(turnNo + "번째 발언의 개방형 질문이 학생의 이야기를 넓히는 데 도움이 됩니다.");
    }
    if (flags.hasJoining || flags.hasStrength) {
      addGood(turnNo + "번째 발언에서 학생의 관심사·강점으로 라포를 형성하려 했습니다.");
    }
    if (flags.hasProtection) {
      addGood(turnNo + "번째 발언에서 보호 의지를 분명히 전달했습니다.");
    }
    if (flags.hasProcedure || flags.hasProcedureGuide) {
      addGood(turnNo + "번째 발언에서 학교 절차를 안내했습니다.");
    }
    if (flags.hasDutyNotice) {
      addGood(turnNo + "번째 발언에서 신고·보호 의무와 비밀보장의 한계를 고지했습니다.");
    }
    if (flags.hasEvidenceGuide) {
      addGood(turnNo + "번째 발언에서 증거 보존을 안내했습니다.");
    }
    if (flags.hasNextVisit || flags.hasNextSession) {
      addGood(turnNo + "번째 발언에서 「다음에 와도 돼」처럼 문을 열어 두었습니다.");
    }
    if (flags.hasNotJudge && flags.hasProcedureGuide) {
      addGood(turnNo + "번째 발언에서 판단자가 아닌 절차 안내자 역할을 분명히 했습니다.");
    }
    if (flags.hasContactBlock) {
      addGood(turnNo + "번째 발언에서 학부모 간 직접 접촉 차단을 안내했습니다.");
    }
    if (flags.hasSeparation || flags.hasDataApproach) {
      addGood(turnNo + "번째 발언에서 진로 결정과 학업 정서를 분리하거나 데이터 기반 접근을 시도했습니다.");
    }
    if (flags.hasFlipQuestion) {
      addGood(turnNo + "번째 발언에서 「하기 싫은 것」으로 뒤집어 물어 탐색을 열었습니다.");
    }
    if (flags.hasReframe || flags.hasExposure || flags.hasPlan) {
      addGood(turnNo + "번째 발언에서 수학에 대한 고정관념을 재구조화하거나 구체적 계획을 제시했습니다.");
    }
    if (flags.hasRealLife || flags.hasRespect) {
      addGood(turnNo + "번째 발언에서 학생의 질문·일상을 존중하며 대화를 이어갔습니다.");
    }

    // forbidden 규칙 추가 감점
    (caseData.forbidden || []).forEach(function (rule) {
      if (rule.pattern.test(msg) && inappropriate < rule.penalty) {
        // 이미 유사 이슈가 없으면 추가
        if (!issues.some(function (i) { return i.text.indexOf(rule.reason.slice(0, 10)) >= 0; })) {
          addIssue(Math.min(rule.penalty, 8), turnNo + "번째 발언: " + rule.reason);
        }
      }
    });

    return {
      inappropriate: Math.min(inappropriate, 35),
      issues: issues,
      goods: goods,
      flags: flags,
      turnScore: Math.max(0, Math.min(100, 100 - inappropriate * 2.8)),
    };
  }

  function getLegalGrounds(caseData) {
    const cat = caseData.category || "";
    const id = caseData.id;

    if (cat === "학교폭력" || id === 4) {
      return {
        title: "법적·원칙 근거",
        body:
          "「학교폭력예방 및 대책에 관한 법률」 제20조에 따라, 교사는 학교폭력 사실을 알게 된 즉시 학교장에게 보고해야 하며, 교사 개인이 임의로 종결할 수 없습니다.",
        bullets: [
          "와 줘서 고맙다",
          "네 잘못이 아니다",
          "혼자 두지 않겠다",
          "절차대로 처리하겠다",
          "다음에 또 와도 된다",
        ],
        bulletTitle: "피해 학생 대상 5대 멘트 (강의원고)",
      };
    }
    if (cat === "아동학대 의심" || id === 2) {
      return {
        title: "법적·원칙 근거",
        body:
          "「아동학대범죄의 처벌 등에 관한 특례법」상 교사는 신고 의무자입니다. 의심 정황만으로도 112 또는 아동보호전문기관(1577-1391) 신고가 가능하며, 비밀보장의 한계를 학생에게 사전에 고지해야 합니다.",
        bullets: [
          "단정적·유도 질문 금지 (「아빠가 때렸어?」)",
          "신체 흔적 직접 촬영 금지 — 관찰 사실만 메모·보고",
          "2인 면담 원칙 (동성 동료 배석 또는 문 반쯤 열기)",
          "오늘 아니어도 된다 — 학생의 속도 존중",
        ],
        bulletTitle: "강의원고 사례 2 핵심 원칙",
      };
    }
    if (cat.indexOf("학부모") >= 0 || id === 5) {
      return {
        title: "법적·원칙 근거",
        body:
          "담임교사는 '판단자'가 아니라 '절차 안내자'입니다. 사안 판단은 전담기구·심의위원회 영역이며, 가·피해 학부모 간 직접 접촉 차단 안내는 2차 분쟁 예방의 핵심입니다. (강의원고 사례 5)",
        bullets: [
          "학부모 감정에는 공감, 사실 판단은 절차에 위임",
          "절차표로 흐름을 구체적으로 안내",
          "상대 학부모와 직접 연락하지 말 것 부탁",
          "면담 일시·장소·배석자·요지를 즉시 상담일지에 기록",
        ],
        bulletTitle: "학부모 면담 핵심 원칙",
      };
    }
    if (cat.indexOf("무기력") >= 0 || id === 3) {
      return {
        title: "원칙 근거",
        body:
          "무기력은 '게으름'이 아니라 '의미 상실'의 신호일 수 있습니다. 즉시 훈계로 들어가면 상담이 닫힙니다. 학생의 세계에 먼저 들어가고(joining), 다른 공간의 강점을 비추어 주는 것이 강의원고의 접근입니다.",
        bullets: [
          "관심사(게임 등)로 라포 형성",
          "강점 발견(strength-based)",
          "학부모 '혼내달라' 요청은 정중히 재구조화",
          "스마트폰 과의존 의심 시 스마트쉼센터(1599-0075) 연계",
        ],
        bulletTitle: "강의원고 사례 3 핵심 원칙",
      };
    }
    if (cat.indexOf("진로") >= 0 || id === 6 || id === 7) {
      return {
        title: "원칙 근거",
        body:
          "진로상담에서는 '진로 결정'과 '학업 정서'를 분리하고, 1회 상담으로 모든 것을 정하려 하지 않습니다. 「없다」를 「있기 싫은 것」으로 뒤집거나, 흥미·적성검사·3자 면담으로 데이터 기반 대화를 이어가는 것이 강의원고의 방법입니다.",
        bullets: [
          "학생 1:1 → 학부모 1:1 → 3자 면담 순서",
          "워크넷·커리어넷·고용24 등 무료 도구 활용",
          "「다음 시간에 같이」 연계 상담 예고",
          "수학교사로서 이공계·데이터 직군 현실 정보 제공",
        ],
        bulletTitle: "진로상담 핵심 원칙",
      };
    }
    if (cat.indexOf("수학") >= 0 || id === 8 || id === 9) {
      return {
        title: "원칙 근거",
        body:
          "수학교과 학습상담에서는 「수학 머리」 고정관념을 노출 빈도·결손 단원 문제로 재구조화하고, 실생활 맥락에서 수학의 가치를 함께 찾아가는 것이 강의원고의 차별적 영역입니다.",
        bullets: [
          "결손 단원 역추적 (분수 → 일차방정식 → 함수)",
          "Back-to-Basic 10일 플랜 등 짧고 구체적 계획",
          "실생활(마트·게임·요리)에서 수학 발견",
          "계산 → 더 나은 선택(문제 해결)으로 확장",
        ],
        bulletTitle: "수학 학습상담 핵심 원칙",
      };
    }
    if (cat === "시험 불안" || id === 10) {
      return {
        title: "원칙 근거",
        body:
          "시험 불안 상담에서는 불안을 축소하지 말고 먼저 공감한 뒤, 정상화와 구체적 대처(호흡·시간 분배·척도 질문)를 함께 설계하는 것이 효과적입니다.",
        bullets: [
          "불안 감정 공감·명명",
          "「많은 학생이 겪는다」 정상화",
          "0~10 척도로 현재 상태 점검",
          "짧고 실행 가능한 대처 계획 + 후속 상담",
        ],
        bulletTitle: "시험 불안 상담 핵심",
      };
    }
    if (cat === "학교 적응" || id === 11) {
      return {
        title: "원칙 근거",
        body:
          "전학·적응 상담에서는 조급한 적응 압박을 피하고, 관심사 기반 joining과 작은 성공 경험으로 연결고리를 찾는 것이 중요합니다.",
        bullets: [
          "적응 어려움을 학생 탓으로 돌리지 않기",
          "관심사·동아리로 새 환경 연결",
          "작은 목표·단계적 접근",
          "「다음에 같이」 후속 상담",
        ],
        bulletTitle: "학교 적응 상담 핵심",
      };
    }

    // 기본: 생활지도
    return {
      title: "원칙 근거",
      body:
        "강의원고는 첫 상담의 1차 목표를 '정보 수집'이 아니라 '안전한 공간 제공'으로 둡니다. 개방형 질문·침묵·감정 명명·「다음에 와도 돼」의 단계적 접근이 핵심입니다.",
      bullets: [
        "사실관계를 캐묻지 않기",
        "감정 명명: 「많이 힘들었겠다」",
        "침묵은 학생이 감정을 정리할 시간",
        "위기 단서(수면·식사·결석 등) 3개 이상 → Wee 클래스·전문상담 연계",
      ],
      bulletTitle: "강의원고 사례 1 핵심 원칙",
    };
  }

  function buildOverallSummary(teacherTurns, turnAnalyses, closureReason, avgScore) {
    const n = teacherTurns.length;
    const parts = [];
    turnAnalyses.forEach(function (a, i) {
      parts.push(i + 1 + "번(부적절 " + a.inappropriate + "점)");
    });
    const breakdown = parts.join(" · ");

    let tone = "";
    const avgInapp =
      turnAnalyses.reduce(function (s, a) {
        return s + a.inappropriate;
      }, 0) / Math.max(1, turnAnalyses.length);

    if (avgInapp >= 10 || avgScore < 45) {
      tone = "여러 발언에서 학생이 닫힐 수 있는 반응이 누적되었습니다. 안전·공감·절차를 다시 점검해 주세요.";
    } else if (avgScore >= 85) {
      tone = "권장 상담 멘트에 가깝게, 공감과 원칙을 균형 있게 적용하셨습니다.";
    } else if (avgScore >= 70) {
      tone = "괜찮은 시도가 있었으나, 권장 멘트 기준에서는 아직 다듬을 여지가 있습니다.";
    } else if (avgScore >= 55) {
      tone = "일부 공감은 있었으나, 추궁·성급함·원칙 누락이 섞여 보수적으로 채점됩니다.";
    } else {
      tone = "대화는 이어졌으나, 추궁·훈계·금기 멘트가 반복되어 라포가 흔들린 구간이 있습니다.";
    }

    if (closureReason === "shutdown") {
      tone = "학생이 대화를 중단했습니다. " + tone;
    }

    return "총 " + n + "번 발언 평균 " + Math.round(avgScore) + "점 (" + breakdown + "). " + tone;
  }

  function buildFinalEvaluation(caseData, turnHistory, closureReason) {
    const teacherTurns = turnHistory.filter(function (t) {
      return t.role === "teacher";
    });

    if (!teacherTurns.length) {
      return {
        finalScore: 0,
        grade: scoreToGrade(0),
        overallSummary: "상담 발언이 없습니다.",
        strengths: ["상담을 시작해 보세요."],
        improvements: [],
        legalGrounds: getLegalGrounds(caseData),
        goodExample: caseData.goodOpeningExample,
        badExample: caseData.badOpeningExample,
      };
    }

    const turnAnalyses = teacherTurns.map(function (turn, idx) {
      return analyzeTurnNarrative(turn.text, caseData, idx);
    });

    const avgScore =
      turnAnalyses.reduce(function (s, a) {
        return s + a.turnScore;
      }, 0) / turnAnalyses.length;

    // 권장 멘트(good 패턴) 적중 수 — 적을수록 점수 상한
    let goodHits = 0;
    teacherTurns.forEach(function (turn) {
      (caseData.good || []).forEach(function (rule) {
        if (rule.pattern.test(turn.text || "")) goodHits++;
      });
    });

    let finalScore = Math.round(avgScore * 0.82);
    if (closureReason === "natural") finalScore += 2;
    if (closureReason === "shutdown") finalScore -= 15;
    if (closureReason === "manual" && teacherTurns.length < 4) finalScore -= 6;

    if (goodHits === 0) finalScore = Math.min(finalScore, 58);
    else if (goodHits === 1) finalScore = Math.min(finalScore, 68);
    else if (goodHits === 2) finalScore = Math.min(finalScore, 76);
    else if (goodHits <= 4) finalScore = Math.min(finalScore, 86);

    // 금기 멘트 있으면 추가 하한
    let forbidHits = 0;
    teacherTurns.forEach(function (turn) {
      (caseData.forbidden || []).forEach(function (rule) {
        if (rule.pattern.test(turn.text || "")) forbidHits++;
      });
    });
    if (forbidHits >= 1) finalScore = Math.min(finalScore, 72);
    if (forbidHits >= 2) finalScore = Math.min(finalScore, 58);
    if (forbidHits >= 3) finalScore = Math.min(finalScore, 45);

    finalScore = Math.max(0, Math.min(100, finalScore));

    // 잘된 점 모음 — 후한 자동 칭찬 최소화
    const strengths = [];
    turnAnalyses.forEach(function (a) {
      a.goods.forEach(function (g) {
        if (strengths.indexOf(g) < 0) strengths.push(g);
      });
    });
    if (goodHits >= 3) {
      strengths.unshift("권장 상담 멘트를 여러 차례 활용하셨습니다.");
    }
    if (!strengths.length) {
      strengths.push("상담을 시도하신 점은 인정합니다. 다음엔 공감·안전 공간·개방형 질문부터 더 분명히 사용해 보세요.");
    }

    // 개선 필요 — 서술형, 구체 인용
    const improvements = [];
    turnAnalyses.forEach(function (a) {
      a.issues.forEach(function (iss) {
        if (improvements.indexOf(iss.text) < 0) improvements.push(iss.text);
      });
    });
    if (closureReason === "maxTurns") {
      improvements.push("대화가 길어졌습니다. 공감 → 탐색 → 「다음에 와도 돼」 순으로 핵심을 더 빠르게 전달해 보세요.");
    }

    const overallSummary = buildOverallSummary(teacherTurns, turnAnalyses, closureReason, finalScore);

    return {
      finalScore: finalScore,
      grade: scoreToGrade(finalScore),
      overallSummary: overallSummary,
      strengths: strengths.slice(0, 5),
      improvements: improvements.slice(0, 5),
      legalGrounds: getLegalGrounds(caseData),
      goodExample: caseData.goodOpeningExample,
      badExample: caseData.badOpeningExample,
      closureReason: closureReason,
      turnCount: turnHistory.length,
      turnAnalyses: turnAnalyses,
    };
  }

  function scoreToGrade(score) {
    if (score >= 92) return { label: "탁월", emoji: "🌟", color: "#059669" };
    if (score >= 82) return { label: "우수", emoji: "✨", color: "#2563eb" };
    if (score >= 70) return { label: "양호", emoji: "👍", color: "#ca8a04" };
    if (score >= 58) return { label: "보통", emoji: "📝", color: "#d97706" };
    if (score >= 45) return { label: "미흡", emoji: "⚠️", color: "#ea580c" };
    return { label: "개선 필요", emoji: "💡", color: "#dc2626" };
  }

  global.CounselingEvaluator = {
    analyzeTeacherMessage: analyzeTeacherMessage,
    scoreTeacherTurn: scoreTeacherTurn,
    generateStudentResponse: generateStudentResponse,
    buildFinalEvaluation: buildFinalEvaluation,
  };
})(typeof window !== "undefined" ? window : globalThis);
