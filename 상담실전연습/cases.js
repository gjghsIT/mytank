/**
 * 수학교사를 위한 학생맞춤 상담기법 — 11가지 사례 데이터
 * 출처: 이화연, 「수학교사를 위한 학생맞춤 상담기법 — 사례 중심 상담 원리」
 */
const COUNSELING_CASES = [
  {
    id: 1,
    title: "갑자기 말이 없어진 학생",
    category: "생활지도",
    studentName: "민지",
    grade: "중2",
    gender: "female",
    situation:
      "최근 2주간 수업 시간 내내 엎드려 있고, 점심도 거르고 있습니다. 담임(수학교사)이 종례 후 따로 불렀습니다.",
    principles: [
      "정보 수집이 아니라 '안전한 공간 제공'이 1차 목표",
      "개방형 질문과 침묵 활용 — 어색한 침묵도 학생의 감정 정리 시간",
      "감정 명명(naming): 학생 감정에 이름을 붙여 주기",
      "1회 상담으로 모든 것을 해결하려 하지 않기 — '다음에 와도 돼'",
      "위기 단서(수면·식사 변화 등) 3개 이상이면 전문상담·Wee 클래스 연계",
    ],
    references: [
      "강의원고 사례 1 — 생활지도 및 학생 개인 상황 파악",
      "교육부·Wee 클래스 상담 연계 체계 (학교 내 전문상담교사 협력)",
    ],
    forbidden: [
      { pattern: /엄마|아빠|부모|학부모/, reason: "첫 상담에서 보호자 연락을 언급하면 학생이 위축됩니다.", penalty: 15 },
      { pattern: /왜\s*그래|무슨\s*일|대체|도대체/, reason: "추궁형 질문은 학생의 방어 반응을 유발합니다.", penalty: 12 },
      { pattern: /전화|연락/, reason: "보호자 연락 압박은 신뢰 관계를 깨뜨립니다.", penalty: 15 },
      { pattern: /괜찮을\s*거야|별일\s*아니|별거\s*아니/, reason: "감정을 축소·무시하는 반응입니다.", penalty: 10 },
      { pattern: /빨리\s*말|솔직히\s*말/, reason: "서두르기는 안전한 공간을 해칩니다.", penalty: 10 },
    ],
    good: [
      { pattern: /말\s*안\s*해도|괜찮아|천천히|기다/, points: 8, label: "압박 없는 분위기 조성" },
      { pattern: /힘들|어려웠|고생/, points: 10, label: "감정 공감·명명" },
      { pattern: /다음에|언제든|또\s*와/, points: 8, label: "단계적 접근·재방문 문 열기" },
      { pattern: /앉|차|함께|같이/, points: 6, label: "안전한 공간·라포 형성" },
      { pattern: /언제부터|어떤\s*느낌/, points: 7, label: "개방형 질문" },
      { pattern: /물어보려|부른\s*게\s*아니/, points: 8, label: "상담 목적 부담 완화" },
    ],
    phases: [
      {
        id: "hesitant",
        studentMessages: [
          "…네, 선생님. (고개를 숙이며)",
          "…별일 없어요. 그냥요.",
          "…(잠시 침묵) …모르겠어요.",
        ],
        advanceIf: (a) => a.hasSafeSpace && !a.hasPressure,
        regressIf: (a) => a.hasPressure || a.hasParentThreat,
      },
      {
        id: "opening",
        studentMessages: [
          "…선생님, 저 요즘 잠이 잘 안 와요.",
          "밤에 눈을 감아도 계속 생각이 나요…",
          "한 2주 된 것 같아요. 혼자 끙끙 앓고 있었어요.",
        ],
        advanceIf: (a) => a.hasEmpathy,
        regressIf: (a) => a.hasMinimize || a.hasPressure,
      },
      {
        id: "emotional",
        studentMessages: [
          "(눈물) …많이 힘들었어요. 말하기 싫은데도…",
          "…친구들이랑도 잘 안 어울리게 됐어요. 이유는… 아직 말하기 어려워요.",
          "선생님이 이렇게 들어줘서… 조금 숨통이 트이는 것 같아요.",
        ],
        advanceIf: (a) => a.hasEmpathy || a.hasOpenQuestion,
        closureIf: (a) => a.hasNextVisit,
      },
      {
        id: "closure",
        studentMessages: [
          "…네. 다음에 또 올게요. 오늘 말해줘서… 감사해요, 선생님.",
          "오늘은 여기까지 할게요. 선생님한테 와도 되는 거죠?",
          "일단은… 잠 좀 자볼게요. 선생님, 고마워요.",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "…선생님, 부르셨어요? (눈을 마주치지 못하고 작게 대답한다)",
    badOpeningExample: "{name}야, 너 요즘 왜 그래? 무슨 일 있어? 엄마한테 전화할까?",
    goodOpeningExample:
      "{name}야, 잠깐 앉을래? 오늘은 선생님이 뭘 물어보려고 부른 게 아니야. 그냥 요즘 네 얼굴이 좀 다르길래, 차나 한 잔 같이 마시려고.",
  },
  {
    id: 2,
    title: "교복 밑으로 보인 멍 자국",
    category: "아동학대 의심",
    studentName: "정국",
    grade: "고1",
    gender: "male",
    situation:
      "체육 시간에 팔뚝의 멍이 노출되었습니다. '운동하다 부딪혔다'고 말하지만, 친구들 사이에 가정폭력 소문이 돕니다.",
    principles: [
      "교사는 아동학대 신고 의무자(아동학대범죄의 처벌 등에 관한 특례법)",
      "비밀보장의 한계 고지 — 학대·자·타해 위험은 비밀로 묻을 수 없음",
      "단정적·유도 질문 금지('아빠가 때렸어?' 등)",
      "신체 흔적 직접 촬영 금지 — 관찰 사실만 메모·보고",
      "2인 면담 원칙(동성 동료 배석 또는 문 반쯤 열기)",
    ],
    references: [
      "아동학대범죄의 처벌 등에 관한 특례법 — 교사 신고 의무 (법제처 국가법령정보센터)",
      "아동보호전문기관 1577-1391 / 경찰 112 신고 가능",
      "강의원고 사례 2",
    ],
    forbidden: [
      { pattern: /아빠가\s*때|엄마가\s*때|누가\s*때/, reason: "단정·유도 질문은 진술 신빙성을 떨어뜨립니다.", penalty: 18 },
      { pattern: /사진|촬영|찍/, reason: "교사가 신체 흔적을 직접 촬영하면 안 됩니다.", penalty: 15 },
      { pattern: /거짓말|구라|안\s*믿/, reason: "학생을 추궁·불신하는 태도입니다.", penalty: 12 },
      { pattern: /비밀\s*지켜|아무에게도\s*안/, reason: "학대 의심 시 비밀 약속은 법적 의무와 충돌합니다.", penalty: 15 },
    ],
    good: [
      { pattern: /도와|보호|의무|알려/, points: 10, label: "신고 의무·보호 의도 고지" },
      { pattern: /비밀.*(한계|지킬\s*수\s*없|묻을\s*수\s*없)/, points: 12, label: "비밀보장 한계 설명" },
      { pattern: /오늘\s*아니어도|언제든|준비되면/, points: 8, label: "학생 속도 존중" },
      { pattern: /무섭|때리|학대|다치/, points: 6, label: "안전 관련 개방형 언급" },
      { pattern: /신경\s*쓰|걱정|불러/, points: 5, label: "관심 표현" },
      { pattern: /학교\s*밖|가족|누구/, points: 7, label: "넓은 범위의 안전 확인" },
    ],
    phases: [
      {
        id: "denial",
        studentMessages: [
          "네… 친구랑 농구하다가 부딪혔어요.",
          "운동하다가 자주 그래요. 별거 아니에요.",
          "…(팔을 움켜쥐며) 진짜 그냥 넘어졌어요.",
        ],
        advanceIf: (a) => a.hasDutyNotice || a.hasSafetyCheck,
        regressIf: (a) => a.hasLeadingQuestion,
      },
      {
        id: "considering",
        studentMessages: [
          "…선생님, 그 말… 무슨 뜻이에요?",
          "…만약에… 그런 일이 있으면… 선생님이… 도와주실 수 있어요?",
          "…무서워요. 말하면 더 큰일 날 것 같아요.",
        ],
        advanceIf: (a) => a.hasDutyNotice && a.hasEmpathy,
        regressIf: (a) => a.hasLeadingQuestion || a.hasSecretPromise,
      },
      {
        id: "partial",
        studentMessages: [
          "…선생님. (잠시 후) …집에서… 가끔… 무서울 때가 있어요.",
          "…술 드시고… 소리 지르실 때… 저는 방에 숨어요.",
          "…이것만 말할게요. 더는… 아직 못 하겠어요.",
        ],
        advanceIf: (a) => a.hasEmpathy && a.hasDutyNotice,
        closureIf: (a) => a.hasNextVisit || a.hasReportMention,
      },
      {
        id: "closure",
        studentMessages: [
          "…알겠어요. 선생님 믿고… 조금 더 생각해볼게요.",
          "…오늘은 여기까지요. 선생님이 도와준다는 거… 기억할게요.",
          "…감사해요. 다음에… 더 말씀드릴 수 있을 것 같아요.",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "…네, 선생님. (교복 소매를 내리며) 뭐… 무슨 일이세요?",
    badOpeningExample: "{name}아, 솔직히 말해. 아빠가 때린 거지?",
    goodOpeningExample:
      "{name}아, 아까 체육 시간에 팔에 멍이 있어서 신경 쓰여서 불렀어. 혹시 학교 밖에서 누가 너를 때리거나 무섭게 하는 일이 있다면, 선생님은 도와줘야 하는 의무가 있어.",
  },
  {
    id: 3,
    title: "핸드폰만 보는 무기력한 학생",
    category: "무기력·의미 상실",
    studentName: "뷔",
    grade: "중3",
    gender: "male",
    situation:
      "등교 직후부터 휴대전화만 들여다보고, 수업 중 자거나 '재미없어요'만 반복합니다. 어머니는 '혼내달라'고 요청했습니다.",
    principles: [
      "무기력은 '게으름'이 아니라 '의미 상실'의 신호일 수 있음",
      "학생의 세계에 먼저 들어가기(joining) — 관심사로 라포 형성",
      "강점 발견(strength-based) — 다른 공간의 리더십·끈기 비추어 주기",
      "학부모 '혼내달라' 요청은 정중히 재구조화",
      "스마트폰 과의존 의심 시 스마트쉼센터(1599-0075) 또는 Wee 클래스 연계",
    ],
    references: [
      "한국지능정보사회진흥원 스마트쉼센터 1599-0075",
      "강의원고 사례 3 — strength-based approach",
    ],
    forbidden: [
      { pattern: /게으|반항|태도|혼내|벌/, reason: "즉시 훈계는 상담을 닫습니다.", penalty: 15 },
      { pattern: /핸드폰\s*내놔|휴대폰\s*거|압수/, reason: "처벌 중심 접근은 라포를 깨뜨립니다.", penalty: 12 },
      { pattern: /엄마\s*말|부모\s*말씀|어머니\s*께서/, reason: "학부모 압력을 전달하면 학생이 닫습니다.", penalty: 10 },
      { pattern: /정신\s*차려|각오/, reason: "설교형 멘트는 효과가 없습니다.", penalty: 10 },
    ],
    good: [
      { pattern: /게임|○○|어떤\s*게임|재미/, points: 10, label: "관심사로 라포 형성" },
      { pattern: /잘\s*아|대단|멋|리더|팀장/, points: 10, label: "강점 발견·비추어 주기" },
      { pattern: /의미|답답|솔직|고마/, points: 8, label: "의미 상실 탐색" },
      { pattern: /학교.*(다르|안\s*보이)/, points: 7, label: "학교 vs 관심 영역 연결" },
      { pattern: /더\s*말|어떤\s*느낌|설명/, points: 6, label: "개방형 질문" },
      { pattern: /함께\s*찾|같이/, points: 6, label: "협력적 자세" },
    ],
    phases: [
      {
        id: "closed",
        studentMessages: [
          "…뭐요. (휴대폰에서 눈을 떼지 않는다)",
          "…재미없어요. 별말 없으면 들어가도 돼요?",
          "…(한숨) …뭘 또 물어보시려고요.",
        ],
        advanceIf: (a) => a.hasJoining,
        regressIf: (a) => a.hasLecture,
      },
      {
        id: "interested",
        studentMessages: [
          "(눈빛이 바뀜) …○○ 게임이요. 아세요?",
          "팀장이에요. 사람들이 저한테 작전 물어봐요. 거기선 좀… 살아있는 느낌?",
          "…선생님도 관심 있으시면… 잠깐 보여드릴까요?",
        ],
        advanceIf: (a) => a.hasStrength || a.hasJoining,
        regressIf: (a) => a.hasLecture,
      },
      {
        id: "honest",
        studentMessages: [
          "…네. 학교는 그냥 의미가 없어요.",
          "공부해봤자… 모르겠어요. 재미없고, 왜 해야 하는지도…",
          "…솔직히 말하니까 좀… 시원하긴 해요.",
        ],
        advanceIf: (a) => a.hasEmpathy || a.hasOpenQuestion,
        closureIf: (a) => a.hasNextVisit,
      },
      {
        id: "closure",
        studentMessages: [
          "…다음에 또 얘기해도 돼요? 게임 말고… 다른 것도요.",
          "…오늘은 여기까지. 이상하게… 기분이 좀 나아요.",
          "…감사해요, 선생님. (휴대폰을 주머니에 넣는다)",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "…(휴대폰 화면을 보며) …선생님, 뭐요?",
    badOpeningExample: "{name}야, 또 핸드폰? 태도 좀 고쳐. 엄마가 혼내달래.",
    goodOpeningExample: "{name}야, 요즘 어떤 게임 해? 이름만 들어봤는데, 어떤 게임이야?",
  },
  {
    id: 4,
    title: "단톡방에서 따돌림 당한 학생",
    category: "학교폭력",
    studentName: "해린",
    grade: "중2",
    gender: "female",
    situation:
      "점심시간에 혼자 교사를 찾아와 '저 좀 들어주실래요?'라고 말했습니다. 단톡방 강제 초대 후 욕설, 점심 배제, 사물함 낙서 등을 1주일간 당했다고 호소합니다.",
    principles: [
      "학교폭력예방 및 대책에 관한 법률 제20조 — 교사는 즉시 학교장 보고",
      "자체 종결·화해 강요 금지",
      "초기 대응: 안전 분리·보호 → 학교장 보고 → 전담기구 → 보호자 통지 → 조사",
      "증거 1차 보존 안내(캡처 등) — 교사가 학생 휴대폰 직접 만지지 않기",
      "피해 학생에게: '와 줘서 고맙다', '네 잘못 아니다', '혼자 두지 않겠다'",
    ],
    references: [
      "학교폭력예방 및 대책에 관한 법률 제20조 (법제처 국가법령정보센터)",
      "교육부·이화여대 학교폭력예방연구소 「2025년도 학교폭력 사안처리 가이드북」",
      "강의원고 사례 4",
    ],
    forbidden: [
      { pattern: /너도\s*좀|노력|어울리|잘못\s*없|그렇게까지/, reason: "피해 축소·책임 전가 — 가장 위험한 반응입니다.", penalty: 20 },
      { pattern: /둘이\s*화해|사과\s*하고\s*끝|그냥\s*넘/, reason: "자체 종결·화해 강요는 금지입니다.", penalty: 18 },
      { pattern: /참아|견디|무시/, reason: "피해 학생에게 참으라는 것은 2차 가해입니다.", penalty: 15 },
      { pattern: /신고\s*안|비밀로|덮/, reason: "교사 개인이 임의로 종결할 수 없습니다.", penalty: 15 },
    ],
    good: [
      { pattern: /고마|용기|와\s*줘/, points: 10, label: "용기 인정" },
      { pattern: /가볍게\s*듣지\s*않|진지|믿/, points: 10, label: "피해 사실 존중" },
      { pattern: /보호|안전|위험.*(않|지\s*않)/, points: 12, label: "보호 약속" },
      { pattern: /절차|학교폭력|전담|책임\s*교사|학교장/, points: 12, label: "법정 절차 안내" },
      { pattern: /네\s*잘못\s*아니|잘못\s*없/, points: 10, label: "피해자 무죄 강조" },
      { pattern: /캡처|기록|날짜|시간|적/, points: 8, label: "증거 보존 안내" },
      { pattern: /혼자\s*두지\s*않|함께/, points: 8, label: "지지 표현" },
    ],
    phases: [
      {
        id: "fearful",
        studentMessages: [
          "선생님… 저… 좀 들어주실래요?",
          "반 애들이… 단톡방에 저를… 욕하고… 점심도 같이 안 먹게 해요.",
          "…근데 신고하면 더 괴롭힐까 봐… 무서워요.",
        ],
        advanceIf: (a) => a.hasProtection && a.hasProcedure,
        regressIf: (a) => a.hasVictimBlame,
      },
      {
        id: "trusting",
        studentMessages: [
          "…정말요? 더 위험해지지 않게… 해주실 거예요?",
          "…네. 믿을게요. 사물함 낙서도… 있어요.",
          "…언제부터였는지… 적어볼게요.",
        ],
        advanceIf: (a) => a.hasProtection || a.hasEvidenceGuide,
        closureIf: (a) => a.hasProcedure,
      },
      {
        id: "closure",
        studentMessages: [
          "…알겠어요. 선생님한테 와서 잘한 것 같아요.",
          "…혼자가 아니라는 게… 조금 안심돼요. 감사합니다.",
          "…오늘은 여기까지 할게요. 선생님, 고마워요.",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "선생님… (눈이 빨갛다) …저, 좀… 들어주실 수 있을까요?",
    badOpeningExample: "{name}아, 걔네가 뭐 그렇게까지 했겠어. 너도 좀 친구들이랑 어울리려고 노력해 봐.",
    goodOpeningExample:
      "{name}아, 어렵게 와줘서 정말 고마워. 선생님은 네가 한 이야기를 가볍게 듣지 않을 거야.",
  },
  {
    id: 5,
    title: "'내 아이는 가해자가 아니에요' — 학부모 면담",
    category: "학교폭력·학부모 면담",
    clientRole: "parent",
    clientLabel: "학부모",
    studentName: "카리나 어머니",
    grade: "학부모",
    gender: "female",
    situation:
      "가해 의심 학생의 학부모가 학교에 찾아와 큰 소리로 항의합니다. '우리 애가 그런 애가 아니에요. 선생님이 편견을 가지고 보는 거 아닙니까?'",
    principles: [
      "담임교사는 '판단자'가 아니라 '절차 안내자' — 사안 판단은 전담기구·심의위원회 영역",
      "공감 + 절차 분리 — 학부모 감정에는 공감, 사실 판단은 절차에 위임",
      "가·피해 학부모 간 직접 접촉 차단 안내 — 2차 분쟁 예방",
      "면담 일시·장소·배석자·요지를 즉시 상담일지에 기록 — 교권 보호",
      "본인이 당사자인 1:1 면담의 단독 녹음은 적법 (교육플러스·한국교육신문)",
    ],
    references: [
      "학교폭력예방 및 대책에 관한 법률 — 전담기구·심의위원회 조사 절차 (법제처 국가법령정보센터)",
      "교육부·이화여대 「2025년도 학교폭력 사안처리 가이드북」",
      "한국교육신문(교육플러스)(2024). [교단법률] 학교에서 발생하는 녹음 관련 법적 문제와 해결",
      "강의원고 사례 5",
    ],
    forbidden: [
      { pattern: /가해자\s*(맞|입니다|예요|야)|우리\s*애\s*잘못/, reason: "담임교사가 가해·무죄를 단정하면 안 됩니다.", penalty: 20 },
      { pattern: /가해자\s*아니|무죄|우리\s*애\s*안\s*그|절대\s*그런\s*애\s*아/, reason: "무죄 단정도 담임의 역할을 넘어섭니다. 절차에 맡겨야 합니다.", penalty: 18 },
      { pattern: /편견\s*(없|안)|제가\s*잘못/, reason: "감정적 대립을 유발하는 방어적 반응입니다.", penalty: 12 },
      { pattern: /그냥\s*넘|덮|조사\s*안|없던\s*일/, reason: "학교폭력 사안을 임의 종결할 수 없습니다.", penalty: 18 },
      { pattern: /직접\s*(만나|연락).*하세요|상대\s*학부모.*연락/, reason: "가·피해 학부모 간 직접 접촉을 권하면 안 됩니다.", penalty: 15 },
    ],
    good: [
      { pattern: /앉|차|진정|천천히/, points: 6, label: "분위기 완화" },
      { pattern: /놀라|당황|이해|입장|힘드/, points: 10, label: "학부모 감정 공감" },
      { pattern: /판단.*(아닌|않|못)|결정.*(제|내)|전담|조사.*(거쳐|후| 통해)/, points: 12, label: "판단자 아님·절차 위임" },
      { pattern: /절차|절차표|안내|자료|흐름/, points: 10, label: "절차 안내" },
      { pattern: /직접\s*연락.*(않|금지|마|하지)|상대.*(연락|접촉).*(않|금지)/, points: 12, label: "학부모 간 직접 접촉 차단" },
      { pattern: /잘\s*아시|가장\s*잘\s*아|자기\s*입장\s*말/, points: 8, label: "학부모·학생에 대한 존중" },
      { pattern: /기록|일지|메모|배석/, points: 6, label: "면담 기록 안내" },
    ],
    phases: [
      {
        id: "angry",
        studentMessages: [
          "선생님! 우리 {childName}가 그런 애가 아니에요! 선생님이 편견 가지고 보는 거 아닙니까?",
          "놀라는 정도가 아니에요! 학교에서 우리 애 이름이 올라갔다는데… 이게 말이 됩니까?",
          "다른 애들이 우리 애를 억울하게 만든 거 아니에요? 선생님은 뭐 하신 거예요?",
        ],
        advanceIf: (a) => a.hasParentEmpathy && a.hasNotJudge,
        regressIf: (a) => a.hasPrematureJudgment || a.hasDefensive,
      },
      {
        id: "questioning",
        studentMessages: [
          "…그럼 우리 애는 어떻게 되는 거예요? 조사받으면… 전학 가야 하는 거예요?",
          "…{childName}도 자기 입장 말할 수 있다는 거죠? 우리 애가… 말도 못 하게 하는 건 아니죠?",
          "…피해 학생 쪽 부모님이랑… 제가 직접 연락해서 말씀드리면 안 될까요?",
        ],
        advanceIf: (a) => a.hasProcedureGuide && (a.hasContactBlock || a.hasNotJudge),
        regressIf: (a) => a.hasPrematureJudgment || a.hasAllowContact,
      },
      {
        id: "calming",
        studentMessages: [
          "…절차표요? …한번… 읽어볼게요.",
          "…직접 연락하면 안 된다는 건… 알겠어요. 감정적으로… 참을게요.",
          "…담임 선생님이 판단하는 게 아니라는 건… 이해했어요.",
        ],
        advanceIf: (a) => a.hasProcedureGuide && a.hasContactBlock,
        closureIf: (a) => a.hasProcedureGuide && a.hasContactBlock,
      },
      {
        id: "closure",
        studentMessages: [
          "…알겠습니다. 절차표는 받았고… {childName}한테도… 학교 말씀대로 하라고 할게요.",
          "…오늘은… 여기까지 할게요. 차라도… 주셔서 감사합니다, 선생님.",
          "…조사 결과 나오면… 다시 연락 주시겠죠? …수고하셨습니다.",
        ],
        isClosure: true,
      },
    ],
    openingMessage:
      "선생님! 잠깐 얘기 좀 해요. 우리 {childName}가 학교폭력 가해자로… 이름이 올라갔다는데, 이게 무슨 말도 안 되는 소리예요?!",
    badOpeningExample:
      "어머님, 조용히 하세요. {childName}가 한 게 맞는지 아닌지는 저도 봤고, 일단 우리 애 잘못은 없어 보여요.",
    goodOpeningExample:
      "어머님, 우선 앉으셔서 차 한 잔 드시지요. 어머님 입장에서 많이 놀라셨을 것 같습니다. 한 가지만 먼저 말씀드릴게요. 저는 오늘 '{childName}가 가해자다/아니다'를 판단하는 자리가 아닙니다.",
  },
  {
    id: 6,
    title: "엄마는 이과 가라는데",
    category: "진로·학부모 갈등",
    studentName: "장원영",
    grade: "고1",
    gender: "female",
    situation:
      "1학기 수학 4등급, 국어·영어 2등급. 학부모는 의대·약대 진학을 강력 희망하지만, 학생은 '수학 보기만 해도 답답하다'고 호소합니다.",
    principles: [
      "진로 결정과 학업 정서 분리 — 한 번에 두 가지를 해결하려 하지 않기",
      "데이터 기반 학부모 면담(흥미·적성검사·내신 추이)",
      "분리상담 순서: 학생 1:1 → 학부모 1:1 → 3자 면담",
      "수학교사의 강점: 이공계·데이터 직군의 현실적 정보 제공",
    ],
    references: [
      "워크넷 청소년 직업흥미검사 (고용노동부·한국고용정보원)",
      "커리어넷 직업 카드 (교육부·한국직업능력연구원)",
      "강의원고 사례 6",
    ],
    forbidden: [
      { pattern: /엄마\s*말\s*들|부모\s*말\s*들|이과\s*가/, reason: "학부모 편에 서면 학생 신뢰가 깨집니다.", penalty: 15 },
      { pattern: /의대\s*가|약대\s*가|무조건/, reason: "특정 진로 강요는 상담 목적에 어긋납니다.", penalty: 12 },
      { pattern: /수학\s*더\s*열심|공부\s*부족|노력\s*부족/, reason: "정서적 어려움을 게으름으로 돌립니다.", penalty: 12 },
      { pattern: /반항|이기|고집/, reason: "학생 감정을 문제화합니다.", penalty: 10 },
    ],
    good: [
      { pattern: /힘들|답답|사이\s*에서/, points: 10, label: "갈등 공감" },
      { pattern: /수학.*(과목|성적|싫)/, points: 8, label: "과목 vs 성적 분리 탐색" },
      { pattern: /언제부터|좋아했/, points: 8, label: "변화 시점 탐색" },
      { pattern: /분리|나눠|하나씩|한\s*가지/, points: 10, label: "문제 분리" },
      { pattern: /흥미|적성|검사|데이터/, points: 10, label: "데이터 기반 접근" },
      { pattern: /3자|함께\s*면담|어머님/, points: 8, label: "3자 면담 제안" },
    ],
    phases: [
      {
        id: "conflict",
        studentMessages: [
          "선생님, 저 진짜 이과 안 하고 싶어요. 근데 엄마는 무조건 의대 가래요.",
          "수학 보기만 해도 답답해요… 근데 국어랑 영어는 괜찮은데…",
          "…6학년 때까지는 수학 좋아했어요. 중2 때 함수 나오고부터…",
        ],
        advanceIf: (a) => a.hasSeparation || a.hasEmpathy,
        regressIf: (a) => a.hasParentSide,
      },
      {
        id: "exploring",
        studentMessages: [
          "…과목 자체가 싫은 것 같기도 하고… 성적이 안 나와서 답답한 것도요.",
          "…둘 다인 것 같아요. 근데 이과/문과를 한꺼번에 정해야 하는 것 같아서… 더 힘들어요.",
          "…검사? 그런 거 해보면… 엄마도 좀 들어주실까요?",
        ],
        advanceIf: (a) => a.hasDataApproach || a.hasSeparation,
        closureIf: (a) => a.hasThreeWay,
      },
      {
        id: "closure",
        studentMessages: [
          "…네. 일단 검사부터 같이 해볼게요. 선생님이 같이 설명해 주시면… 든든할 것 같아요.",
          "…오늘은 여기까지. 마음이 좀 가벼워졌어요. 감사합니다, 선생님.",
          "…다음에 3자 면담 날짜 잡아 주세요. 고마워요.",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "선생님… (망설이다) …저, 진로 때문에… 상담 받고 싶어서 왔어요.",
    badOpeningExample: "{name}아, 엄마 말이 맞아. 의대 가려면 이과 가야지. 수학 더 열심히 해.",
    goodOpeningExample:
      "엄마랑 너 사이에서 {name}이가 많이 힘들겠다. '수학이 싫다'는 게 과목 자체가 싫은 거야, 아니면 성적이 안 나와서 답답한 거야?",
  },
  {
    id: 7,
    title: "꿈이 없어요",
    category: "진로 탐색",
    studentName: "리즈",
    grade: "고2",
    gender: "female",
    situation:
      "진로 희망란에 매년 '미정'을 기재합니다. '하고 싶은 게 없어요'가 입버릇입니다.",
    principles: [
      "'없다'를 '있다'로 뒤집기 — 하고 싶은 것 → 하기 싫은 것",
      "진로교육의 시간 척도는 길다 — 1회 상담으로 정해지지 않음",
      "'다음 시간에 같이' 연계 상담 예고",
      "워크넷·커리어넷·고용24 등 무료 도구 활용",
    ],
    references: [
      "워크넷 청소년 직업흥미검사 (www.work.go.kr)",
      "커리어넷 (www.career.go.kr)",
      "고용24 (www.work24.go.kr)",
      "강의원고 사례 7",
    ],
    forbidden: [
      { pattern: /빨리\s*정|서둘|그\s*나이\s*때|남\s*들/, reason: "조급함은 학생을 위축시킵니다.", penalty: 12 },
      { pattern: /게으|의지\s*없|안\s*타/, reason: "비난은 탐색을 막습니다.", penalty: 12 },
      { pattern: /성적\s*보면|등급/, reason: "성적 압박은 진로 탐색과 별개입니다.", penalty: 8 },
      { pattern: /미정\s*하면\s*안/, reason: "미정 상태를 문제화합니다.", penalty: 10 },
    ],
    good: [
      { pattern: /솔직|좋|괜찮/, points: 8, label: "솔직함 인정" },
      { pattern: /드물|정상|많/, points: 8, label: "정상화" },
      { pattern: /하기\s*싫|못\s*할|싫은\s*것/, points: 12, label: "'없다→있다' 전환" },
      { pattern: /정보|조건|카드|직업/, points: 8, label: "구체화·도구 연계" },
      { pattern: /다음\s*시간|같이\s*살펴|다음에/, points: 10, label: "연계 상담 예고" },
      { pattern: /몸\s*쓰|사람.*말/, points: 6, label: "학생 답변 반영" },
    ],
    phases: [
      {
        id: "empty",
        studentMessages: [
          "…하고 싶은 게 없어요. 매년 미정이에요.",
          "…다들 정한 것 같은데, 저만 이상한 것 같아요.",
          "…뭘 좋아하는지도 모르겠어요.",
        ],
        advanceIf: (a) => a.hasFlipQuestion || a.hasNormalize,
        regressIf: (a) => a.hasRush,
      },
      {
        id: "discovering",
        studentMessages: [
          "…앉아서 종일 컴퓨터 보는 거요. 그건 진짜 못 할 것 같아요.",
          "…사람이랑 말 많이 하는 것도요. 그건 좀…",
          "…없다고 했는데… 벌써 두 개나 나왔네요? (살짝 웃음)",
        ],
        advanceIf: (a) => a.hasFlipQuestion || a.hasFollowUp,
        closureIf: (a) => a.hasNextSession,
      },
      {
        id: "closure",
        studentMessages: [
          "…다음 시간에 직업 카드 같이 볼래요. 오늘… 생각보다 괜찮았어요.",
          "…감사해요, 선생님. 뭔가… 시작점이 생긴 느낌?",
          "…그럼 다음 주에 봐요. 고마워요!",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "…선생님, 진로 상담… 시간이요? …특별히 할 말은 없는데…",
    badOpeningExample: "{name}야, 고2인데 아직도 미정이면 안 되지. 빨리 정해야지.",
    goodOpeningExample:
      "{name}야, '하고 싶은 게 없다'는 말 솔직해서 좋다. 사실 그 나이에 꿈이 또렷한 게 더 드물어. 하고 싶은 건 없어도, '하기 싫은 것'은 있을 거 아냐?",
  },
  {
    id: 8,
    title: "저 수학 머리 없어요",
    category: "수학 학습상담",
    studentName: "윈터",
    grade: "중1",
    gender: "female",
    situation:
      "1학기 중간 38점. 첫 마디가 '저 수학 머리 없어요, 우리 엄마도 그래요'입니다.",
    principles: [
      "결손 단원 역추적 진단(분수→일차방정식→함수→미적분)",
      "'수학 머리' 표현을 노출 빈도 문제로 재구조화",
      "가족 단위 일반화 낙인 차단 — 작은 성공 경험으로 균열",
      "Back-to-Basic 10일 플랜 — 짧고 구체적 계획",
    ],
    references: [
      "강의원고 사례 8 — 수학과의 위계성 이해",
      "성장 마인드셋(Growth Mindset, Dweck) — 능력 고정관념 재구조화",
    ],
    forbidden: [
      { pattern: /머리\s*좋|머리\s*나쁘|타고|재능\s*없/, reason: "고정관념을 강화합니다.", penalty: 15 },
      { pattern: /게으|노력\s*부족|안\s*해/, reason: "노력 부족 프레임은 낙인을 강화합니다.", penalty: 12 },
      { pattern: /엄마\s*말\s*듣|부모\s*탓/, reason: "가족 낙인을 방치하거나 비난합니다.", penalty: 10 },
      { pattern: /38점|점수\s*낮|등급/, reason: "점수를 그대로 강조하면 수치가 낙인이 됩니다.", penalty: 8 },
    ],
    good: [
      { pattern: /수학\s*머리|머리.*(있다|없다|생각)/, points: 10, label: "고정관념 재구조화" },
      { pattern: /여러\s*번|만난|노출|연습|본/, points: 10, label: "노출 빈도 설명" },
      { pattern: /낯선|기초|결손|분수|점검/, points: 10, label: "결손 진단·기초 점검" },
      { pattern: /같이|한\s*달|10일|30분|계획/, points: 8, label: "구체적 학습 계획" },
      { pattern: /진단|풀어\s*볼|문제/, points: 7, label: "진단지 제안" },
      { pattern: /친구.*(만난|본)/, points: 6, label: "비교 재구조화" },
    ],
    phases: [
      {
        id: "fixed",
        studentMessages: [
          "저… 수학 머리 없어요. 우리 엄마도 그래요.",
          "친구는 한 번 보면 푸는데… 저는 30분 봐도 모르겠어요.",
          "…저한테는 안 되는 것 같아요.",
        ],
        advanceIf: (a) => a.hasReframe || a.hasExposure,
        regressIf: (a) => a.hasFixedMindset,
      },
      {
        id: "reframing",
        studentMessages: [
          "…그 친구가 초등 때 그 단원을 많이 만났다고요?",
          "…그럼 저는… 아직 만난 횟수가 적어서 그런 거예요?",
          "…진단지? 한번… 풀어볼게요.",
        ],
        advanceIf: (a) => a.hasPlan || a.hasDiagnosis,
        closureIf: (a) => a.hasPlan,
      },
      {
        id: "closure",
        studentMessages: [
          "…6학년 분수부터 다시요? …해볼게요. 선생님이 같이 봐주시면…",
          "…수학 머리 없는 게 아니라… 연습이 덜 된 거라니… 조금 희망 생겨요.",
          "…감사해요, 선생님. 다음 시간에 진단지 가져올게요!",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "선생님… 저… 수학 시험… 38점 맞았어요. 저 수학 머리 없어요…",
    badOpeningExample: "{name}야, 38점이면 노력이 부족한 거지. 수학 머리 없다고 포기하면 안 돼.",
    goodOpeningExample:
      "{name}야, '수학 머리'라는 게 진짜 있다고 생각해? 그 친구가 한 번에 푼 그 단원, 초등학교 때 그 단원 몇 번 만났을까?",
  },
  {
    id: 9,
    title: "수학을 왜 배워야 해요?",
    category: "수학 학습동기",
    studentName: "카즈하",
    grade: "중2",
    gender: "female",
    situation:
      "수업 중 '살면서 덧셈 뺄셈만 하면 되지, 이런 건 왜 배워요?'라고 직설적으로 질문합니다. 학습 동기가 낮고 수학을 단순 계산 도구로만 인식합니다.",
    principles: [
      "학생의 저항은 실생활 연관성 부재에서 비롯 — 먼저 존중하며 대화",
      "실생활 속 수학 발견(쇼핑·게임·요리 등)",
      "문제 해결 도구로서의 수학 — 최적의 답을 찾는 능력",
      "Realistic Mathematics Education(Freudenthal, 1991) — 실생활→수학 개념",
    ],
    references: [
      "Freudenthal, H.(1991). Revisiting Mathematics Education — Realistic Mathematics Education",
      "강의원고 사례 9 — 학습 동기와 실용성 인식",
    ],
    forbidden: [
      { pattern: /나중에\s*알|지금\s*은\s*모르|그냥\s*외워|시험/, reason: "권위적·회피적 답변은 동기를 떨어뜨립니다.", penalty: 12 },
      { pattern: /질문\s*하지\s*마|말\s*대꾸|태도/, reason: "질문 자체를 억압합니다.", penalty: 15 },
      { pattern: /당연|당연히|당연하/, reason: "설교형 답변입니다.", penalty: 8 },
      { pattern: /쓸\s*데\s*없|의미\s*없/, reason: "학생 인식을 무시합니다.", penalty: 10 },
    ],
    good: [
      { pattern: /좋은\s*질문|궁금|생각/, points: 8, label: "질문 존중" },
      { pattern: /마트|쇼핑|게임|요리|실생활|어제/, points: 10, label: "실생활 맥락" },
      { pattern: /비율|싼|계산|선택|최적/, points: 10, label: "실용적 수학 연결" },
      { pattern: /논리|사고|문제\s*해결|함수|방정식/, points: 8, label: "수학적 사고력 설명" },
      { pattern: /덧셈.*(계산|넘어)|더\s*나은\s*선택/, points: 10, label: "계산→문제해결 확장" },
      { pattern: /데이터|AI|게임\s*만드/, points: 6, label: "미래·진로 연결" },
    ],
    phases: [
      {
        id: "resistant",
        studentMessages: [
          "선생님, 살면서 덧셈 뺄셈만 하면 되지… 이런 건 왜 배워요?",
          "…학교 수학은 너무 복잡해요. 쓸 데 있어요?",
          "…그냥 시험 때문에 배우는 거잖아요.",
        ],
        advanceIf: (a) => a.hasRealLife || a.hasRespect,
        regressIf: (a) => a.hasAuthority,
      },
      {
        id: "curious",
        studentMessages: [
          "…어제 마트 갔을 때…? (고개를 갸웃)",
          "…아, 방금 그 계산이 수학이에요?",
          "…그치만 학교에서 배우는 건 훨씬 복잡하잖아요.",
        ],
        advanceIf: (a) => a.hasRealLife && a.hasConceptLink,
        regressIf: (a) => a.hasAuthority,
      },
      {
        id: "understanding",
        studentMessages: [
          "…덧셈·뺄셈이 '계산'이면, 함수는 '더 나은 선택'을 찾는 거…?",
          "…게임 만드는 사람도 수학 쓴다고요? 좀… 신기한데요.",
          "…논리적으로 생각하는 힘… 그건… 필요할 것 같기도 하고.",
        ],
        advanceIf: (a) => a.hasConceptLink || a.hasFutureLink,
        closureIf: (a) => a.hasConceptLink,
      },
      {
        id: "closure",
        studentMessages: [
          "…알겠어요. 다음엔 수업 때… 한번 더 생각해볼게요.",
          "…좋은 질문이라고 해주셔서… 기분 나쁘지 않았어요. 감사합니다!",
          "…수학이 그렇게… 연결돼 있다는 건… 처음 알았어요.",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "선생님! 잠깐만요 — 살면서 덧셈이랑 뺄셈만 하면 되잖아요. 이건 왜 배워요?",
    badOpeningExample: "{name}야, 질문하지 마. 시험에 나오니까 배우는 거야. 나중에 알게 돼.",
    goodOpeningExample:
      "{name}야, 좋은 질문이다. 그런데 하나만 먼저 물어볼게. 어제 저녁에 뭐 했어?",
  },
  {
    id: 10,
    title: "시험만 앞두면 손이 떨려요",
    category: "시험 불안",
    grade: "고2",
    gender: "male",
    situation:
      "중간고사 3일 전, 학생이 상담실을 찾아와 '공부는 하는데 시험만 보면 머리가 하얘져요'라고 말합니다. 밤에 잠도 잘 못 자고, 손이 떨린다고 합니다.",
    principles: [
      "불안 반응의 정상화 — 시험 불안은 흔한 현상",
      "인지 재구조화 — '실수=능력 부족' 프레임 전환",
      "SFBT 척도 질문 — 현재 불안 0~10 점검",
      "구체적 대처 계획(호흡·시간 분배)과 후속 상담",
    ],
    forbidden: [
      { pattern: /긴장\s*할\s*필요\s*없|별거\s*아니|겁\s*너무|쫄/, reason: "불안을 축소·조롱하면 학생이 마음을 닫습니다.", penalty: 15 },
      { pattern: /더\s*열심|노력\s*부족|공부\s*안/, reason: "불안을 게으름으로 돌리는 프레임입니다.", penalty: 12 },
      { pattern: /다\s*들\s*그래|원래\s*그래/, reason: "일반화만으로는 학생의 고유 경험이 무시됩니다.", penalty: 8 },
      { pattern: /걱정\s*마|괜찮을\s*거/, reason: "감정 축소( minimizing )는 공감을 약화시킵니다.", penalty: 10 },
    ],
    good: [
      { pattern: /힘들|떨|불안|긴장|걱정/, points: 10, label: "불안 감정 공감·명명" },
      { pattern: /많은\s*학생|흔|정상|당연|누구나/, points: 8, label: "불안 정상화" },
      { pattern: /0.*10|척도|점수|얼마나/, points: 10, label: "SFBT 척도 질문" },
      { pattern: /호흡|천천히|심호흡|이완/, points: 8, label: "구체적 대처 전략" },
      { pattern: /언제부터|어떤\s*과목|어떤\s*상황/, points: 7, label: "불안 맥락 탐색" },
      { pattern: /다음|함께|계획|연습/, points: 8, label: "후속·실행 계획" },
    ],
    phases: [
      {
        id: "anxious",
        studentMessages: [
          "선생님… 시험만 생각하면… 손이 떨려요. 공부는 하는데…",
          "…3일 남았는데… 밤에 잠도 못 자요. 머리가 하얘져요.",
          "…수학이 특히… 문제 읽다가… 아무것도 생각이 안 나요.",
        ],
        advanceIf: (a) => a.hasEmpathy && !a.hasMinimize,
        regressIf: (a) => a.hasMinimize || a.hasLecture,
      },
      {
        id: "exploring",
        studentMessages: [
          "…언제부터요? …중2 때부터… 점점 심해진 것 같아요.",
          "…0에서 10? …지금은… 8 정도…?",
          "…호흡법이요? …한번… 해볼게요.",
        ],
        advanceIf: (a) => a.hasEmpathy || a.hasOpenQuestion,
        regressIf: (a) => a.hasMinimize,
      },
      {
        id: "closure",
        studentMessages: [
          "…말하니까… 조금 가벼워요. 다음에… 시험 끝나고… 또 와도 될까요?",
          "…선생님이… 이렇게 들어줘서… 고마워요.",
          "…시험… 한번… 최선을 다해볼게요.",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "선생님… (손을 꽉 쥐며) …시험이… 너무 무서워요. 공부는 하는데… 시험만 보면…",
    badOpeningExample: "{name}야, 긴장할 필요 없잖아. 다들 그래. 더 열심히 공부해.",
    goodOpeningExample:
      "{name}아, 많이 힘들었겠다. 공부는 하는데 시험만 앞두면 손이 떨린다는 거지? 언제부터 그랬어?",
  },
  {
    id: 11,
    title: "전학 와서 아직 적응이 안 돼요",
    category: "학교 적응",
    grade: "고1",
    gender: "female",
    situation:
      "3월 전학 온 학생. 2개월째 점심을 혼자 먹고, '여기 애들이랑 잘 안 맞아요'라고 말합니다. 수업 참여도 낮습니다.",
    principles: [
      "Rogers의 무조건적 수용 — 적응 어려움을 학생 탓으로 돌리지 않기",
      "관심사 기반 joining — 새 환경에서의 연결고리 찾기",
      "작은 성공 경험 설계 — SFBT의 '예외'와 '작은 변화'",
      "단계적 학교 생활 목표 설정",
    ],
    forbidden: [
      { pattern: /적응\s*해|빨리\s*맞|노력\s*해\s*봐/, reason: "조급한 적응 압박은 위축을 키웁니다.", penalty: 12 },
      { pattern: /반\s*애들|다\s*들\s*잘|너만/, reason: "비교·일반화는 고립감을 강화합니다.", penalty: 12 },
      { pattern: /태도|소극|왜\s*그래/, reason: "문제화·추궁은 신뢰를 깨뜨립니다.", penalty: 10 },
      { pattern: /전학\s*온\s*게\s*핑계/, reason: "학생 경험을 무시하는 발언입니다.", penalty: 15 },
    ],
    good: [
      { pattern: /힘들|외로|답답|어렵/, points: 10, label: "적응 어려움 공감" },
      { pattern: /전학|새로|낯/, points: 6, label: "전환기 인정" },
      { pattern: /관심|좋아|취미|동아리|좋아하는/, points: 10, label: "관심사 탐색·joining" },
      { pattern: /작은|하나|천천히|처음/, points: 8, label: "작은 목표·단계적 접근" },
      { pattern: /다음|함께|같이|한\s*번/, points: 8, label: "후속 상담·동행" },
      { pattern: /잘\s*하고|용기|와\s*줘/, points: 7, label: "용기·강점 인정" },
    ],
    phases: [
      {
        id: "isolated",
        studentMessages: [
          "…선생님, 저… 아직… 여기 적응이… 안 돼요.",
          "…점심도… 혼자 먹어요. 반 애들이랑… 잘 안 맞는 것 같아요.",
          "…전학 오기 전 학교가… 그립기도 하고…",
        ],
        advanceIf: (a) => a.hasEmpathy && !a.hasPressure,
        regressIf: (a) => a.hasPressure || a.hasLecture,
      },
      {
        id: "opening_up",
        studentMessages: [
          "…사실… 그림 그리는 건… 좋아해요. 근데… 동아리는… 용기가…",
          "…작은 것부터요? …예를 들면…?",
          "…옆 반 애가… 미술… 좋아한다던데… 모르겠어요.",
        ],
        advanceIf: (a) => a.hasJoining || a.hasEmpathy,
        regressIf: (a) => a.hasPressure,
      },
      {
        id: "closure",
        studentMessages: [
          "…다음에… 동아리 목록… 같이 봐도 돼요?",
          "…오늘… 말하니까… 조금… 숨통이 트여요. 고마워요, 선생님.",
          "…다음 주에… 또… 올게요.",
        ],
        isClosure: true,
      },
    ],
    openingMessage: "…선생님. (망설이다) …저… 전학 온 지 두 달 됐는데… 아직… 적응이…",
    badOpeningExample: "{name}야, 벌써 두 달인데 아직도? 반 애들은 다 잘 적응하는데, 너도 노력 좀 해봐.",
    goodOpeningExample:
      "{name}야, 새 학교에 오면 적응하기까지 시간이 필요해. 많이 힘들었겠다. 요즘 학교생활에서 가장 어려운 게 뭐야?",
  },
];
