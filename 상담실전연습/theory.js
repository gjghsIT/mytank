/**
 * 상담 일반 이론 기반 피드백
 * Rogers, Egan, MI, SFBT, Carkhuff, Ivey 등 학교상담·지도상담 핵심 이론
 */
const COUNSELING_THEORIES = [
  {
    id: "rogers",
    name: "인본주의 상담 (Carl Rogers)",
    source: "Rogers, C.R. (1957). The necessary and sufficient conditions of therapeutic personality change. Journal of Consulting Psychology, 21(2), 95-103.",
    check: function (f) {
      return f.hasEmpathy && f.hasSafeSpace;
    },
    strength:
      "공감적 이해와 무조건적 긍정적 관심을 바탕으로 학생이 스스로 탐색할 수 있는 분위기를 조성했습니다. 로저스는 이 세 조건(공감·진실성·무조건적 수용)이 상담 변화의 핵심이라고 보았습니다.",
    improve:
      "Carl Rogers의 인본주의 상담에 따르면, 문제 해결보다 먼저 학생의 감정을 있는 그대로 반영(공감)하고 판단 없이 수용하는 것이 관계 형성의 출발점입니다.",
  },
  {
    id: "egan",
    name: "Egan의 숙련된 상담자 모델",
    source: "Egan, G. (2014). The Skilled Helper: A Problem-Management and Opportunity-Development Approach (10th ed.). Brooks/Cole.",
    check: function (f) {
      return f.hasOpenQuestion || f.hasEmpathy;
    },
    strength:
      "탐색(현재 상황 이해) 단계에 해당하는 개방형 질문과 경청을 활용했습니다. Egan 모델은 '현재→원하는 것→행동'의 3단계로 상담을 구조화합니다.",
    improve:
      "Egan의 숙련된 상담자 모델 1단계(현재 상황 탐색)에서 '무엇이 일어나고 있나', '어떤 느낌인가' 같은 개방형 질문으로 학생의 이야기를 넓혀 보세요.",
  },
  {
    id: "mi",
    name: "동기강화상담 (Motivational Interviewing)",
    source: "Miller, W.R., & Rollnick, S. (2013). Motivational Interviewing: Helping People Change (3rd ed.). Guilford Press.",
    check: function (f) {
      return f.hasRespect || f.hasJoining || f.hasStrength;
    },
    strength:
      "학생의 저항을 설교로 맞받지 않고, 학생 고유의 관심·강점·이유를 끌어내는 MI(Motivational Interviewing)적 접근이 보입니다.",
    improve:
      "Miller & Rollnick의 동기강화상담(OARS: Open questions, Affirmations, Reflective listening, Summaries) 원칙에 따라, 조언보다 반영적 경청을 먼저 시도해 보세요.",
  },
  {
    id: "sfbt",
    name: "해결중심 잠깐 상담 (Solution-Focused Brief Therapy)",
    source: "de Shazer, S., et al. (1986). Brief therapy: Focused solution development. Family Process, 25(2), 207-221.",
    check: function (f) {
      return f.hasNextVisit || f.hasNextSession || f.hasFlipQuestion;
    },
    strength:
      "문제 자체보다 가능성과 다음 단계에 초점을 둔 해결중심(SFBT)적 접근이 관찰됩니다. de Shazer는 '작은 변화가 큰 변화를 이끈다'고 강조했습니다.",
    improve:
      "Steve de Shazer의 해결중심 상담 기법(척도 질문, 예외 찾기, '다음에 같이' 등)을 활용하면 1회 상담에서도 학생이 실행 가능한 작은 목표를 설정할 수 있습니다.",
  },
  {
    id: "carkhuff",
    name: "Carkhuff의 핵심 상담 기술",
    source: "Carkhuff, R.R. (2000). The Art of Helping (9th ed.). Human Resource Development Press.",
    check: function (f) {
      return f.hasEmpathy;
    },
    strength:
      "Carkhuff가 강조한 공감(Empathy), respect, genuineness, concreteness 중 공감적 반응이 대화에 나타났습니다.",
    improve:
      "Carkhuff의 핵심 조건에 따라, 학생 발언을 그대로 반영하는 반영적 경청(reflective listening) — '…힘들었구나', '…그 마음이구나' — 을 더 자주 사용해 보세요.",
  },
  {
    id: "ivey",
    name: "Ivey의 마이크로상담 기술",
    source: "Ivey, A.E., Ivey, M.B., & Zalaquett, C.P. (2018). Intentional Interviewing and Counseling (9th ed.). Cengage.",
    check: function (f) {
      return f.hasOpenQuestion && !f.hasPressure;
    },
    strength:
      "Ivey의 마이크로기술 중 개방형 질문과 비추궁적 탐색을 적절히 사용했습니다. 상담은 '의도적(interviewing)' 기술의 조합입니다.",
    improve:
      "Allen Ivey의 마이크로상담 5단계(접촉→집중→이탈→개입→종결) 중, 초기에는 폐쇄형·추궁형 질문을 줄이고 개방형 질문으로 집중 단계에 머무르는 것이 좋습니다.",
  },
  {
    id: "active-listening",
    name: "적극적 경청 (Active Listening)",
    source: "Gordon, T. (1970). Parent Effectiveness Training. Wyden Books. / Ivey & Ivey (2018).",
    check: function (f) {
      return f.hasEmpathy && !f.hasMinimize;
    },
    strength:
      "적극적 경청 — 감정 반영, 요지 확인, 판단 유보 — 이 실천되었습니다. Gordon은 '들어주는 것' 자체가 치유적 관계를 만든다고 보았습니다.",
    improve:
      "적극적 경청 이론에 따르면 '조언·판단·위로·축소' 4대 장애를 피하고, 학생 말의 감정과 의미를 되비추어 주는 것이 우선입니다.",
  },
  {
    id: "crisis",
    name: "위기개입·안전 확보",
    source: "James, R.K., & Gilliland, B.E. (2017). Crisis Intervention Strategies (8th ed.). Cengage. / WHO Mental Health Gap Action Programme.",
    check: function (f) {
      return f.hasProtection || f.hasDutyNotice || f.hasProcedure;
    },
    strength:
      "James & Gilliland의 위기개입 원칙에 따라 '안전 확보 → 지지 → 대처 계획' 순서로 접근하려는 시도가 보입니다.",
    improve:
      "위기·학대·학교폭력 의심 상황에서는 Rogers식 비지시보다 '안전 확보'와 '연계·보고'가 우선입니다. 학생에게 보호 의도를 명확히 전달하세요.",
  },
];

const THEORY_REFERENCES = [
  "Rogers, C.R. (1957). The necessary and sufficient conditions of therapeutic personality change.",
  "Egan, G. (2014). The Skilled Helper (10th ed.). Brooks/Cole.",
  "Miller, W.R., & Rollnick, S. (2013). Motivational Interviewing (3rd ed.). Guilford Press.",
  "de Shazer, S., et al. (1986). Brief therapy: Focused solution development. Family Process, 25(2).",
  "Carkhuff, R.R. (2000). The Art of Helping (9th ed.). HRD Press.",
  "Ivey, A.E., et al. (2018). Intentional Interviewing and Counseling (9th ed.). Cengage.",
  "Gordon, T. (1970). Parent Effectiveness Training. Wyden Books.",
  "James, R.K., & Gilliland, B.E. (2017). Crisis Intervention Strategies (8th ed.). Cengage.",
  "Clark, A.J. (2010). Empathy and Sympathy: Therapeutic Distinctions in Counseling. Journal of Mental Health Counseling, 32(2).",
  "Beck, J.S. (2011). Cognitive Behavior Therapy: Basics and Beyond (2nd ed.). Guilford Press.",
  "Bronfenbrenner, U. (1979). The Ecology of Human Development. Harvard University Press.",
  "ERIC: Person-Centered Counseling and Solution-Focused Brief Therapy — An Integrative Model for School Counselors (EJ1119270).",
];

function buildTheoryFeedback(flags, caseData, turnHistory) {
  const applied = [];
  const suggestions = [];

  COUNSELING_THEORIES.forEach(function (theory) {
    if (theory.check(flags)) {
      applied.push({ name: theory.name, text: theory.strength, source: theory.source });
    } else {
      suggestions.push({ name: theory.name, text: theory.improve, source: theory.source });
    }
  });

  const relevant = getCaseTheoryFocus(caseData.category);
  const focusApplied = applied.filter(function (a) {
    return relevant.indexOf(a.name) >= 0;
  });
  const focusSuggest = suggestions.filter(function (s) {
    return relevant.indexOf(s.name) >= 0;
  });

  return {
    applied: (focusApplied.length ? focusApplied : applied).slice(0, 4),
    suggestions: (focusSuggest.length ? focusSuggest : suggestions).slice(0, 4),
    references: THEORY_REFERENCES,
  };
}

function getCaseTheoryFocus(category) {
  const map = {
    "생활지도": ["인본주의 상담 (Carl Rogers)", "적극적 경청 (Active Listening)", "Egan의 숙련된 상담자 모델"],
    "아동학대 의심": ["위기개입·안전 확보", "인본주의 상담 (Carl Rogers)", "Carkhuff의 핵심 상담 기술"],
    "무기력·의미 상실": ["동기강화상담 (Motivational Interviewing)", "해결중심 잠깐 상담 (Solution-Focused Brief Therapy)"],
    "학교폭력": ["위기개입·안전 확보", "적극적 경청 (Active Listening)", "Carkhuff의 핵심 상담 기술"],
    "학교폭력·학부모 면담": ["위기개입·안전 확보", "적극적 경청 (Active Listening)", "Egan의 숙련된 상담자 모델"],
    "진로·학부모 갈등": ["Egan의 숙련된 상담자 모델", "해결중심 잠깐 상담 (Solution-Focused Brief Therapy)"],
    "진로 탐색": ["해결중심 잠깐 상담 (Solution-Focused Brief Therapy)", "동기강화상담 (Motivational Interviewing)"],
    "수학 학습상담": ["동기강화상담 (Motivational Interviewing)", "인본주의 상담 (Carl Rogers)"],
    "수학 학습동기": ["동기강화상담 (Motivational Interviewing)", "Ivey의 마이크로상담 기술"],
    "시험 불안": ["인본주의 상담 (Carl Rogers)", "해결중심 잠깐 상담 (Solution-Focused Brief Therapy)", "Carkhuff의 핵심 상담 기술"],
    "학교 적응": ["인본주의 상담 (Carl Rogers)", "동기강화상담 (Motivational Interviewing)", "적극적 경청 (Active Listening)"],
  };
  return map[category] || ["인본주의 상담 (Carl Rogers)", "적극적 경청 (Active Listening)"];
}
