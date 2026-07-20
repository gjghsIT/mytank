/**
 * 다양한 한국 학생·학부모 이름 풀
 */
const KOREAN_NAME_POOL = {
  female: [
    "서연", "지우", "하은", "수빈", "예린", "다현", "소율", "채원", "유나", "민서",
    "지민", "하린", "예나", "서윤", "다은", "지아", "수아", "윤서", "채은", "나연",
    "가은", "시은", "혜원", "주아", "은서", "다연", "서아", "민지", "유진", "소연",
  ],
  male: [
    "민준", "서준", "도윤", "예준", "시우", "하준", "지호", "우진", "준서", "건우",
    "현우", "승민", "태양", "지훈", "성민", "재원", "동현", "민성", "준혁", "시현",
    "태민", "영준", "한결", "우빈", "정우", "승우", "지환", "민재", "윤호", "재민",
  ],
};

function pickRandomName(gender, seed) {
  const pool = KOREAN_NAME_POOL[gender] || KOREAN_NAME_POOL.female;
  const idx = Math.abs(seed) % pool.length;
  return pool[idx];
}

function createRandomSeed() {
  return Math.floor(Math.random() * 100000) + Date.now() % 10000;
}

function personalizeText(text, vars) {
  if (!text) return text;
  return text
    .replace(/\{name\}/g, vars.name || "")
    .replace(/\{childName\}/g, vars.childName || vars.name || "");
}

function assignRandomClient(caseTemplate) {
  const seed = createRandomSeed();
  let studentName;
  let childName;

  if (caseTemplate.clientRole === "parent") {
    childName = pickRandomName(caseTemplate.gender || "female", seed);
    studentName = childName + " 어머니";
  } else {
    studentName = pickRandomName(caseTemplate.gender || "female", seed);
    childName = studentName;
  }

  const vars = { name: studentName, childName: childName };

  return Object.assign({}, caseTemplate, {
    studentName: studentName,
    childName: childName,
    openingMessage: personalizeText(caseTemplate.openingMessage, vars),
    badOpeningExample: personalizeText(caseTemplate.badOpeningExample, vars),
    goodOpeningExample: personalizeText(caseTemplate.goodOpeningExample, vars),
    situation: personalizeText(caseTemplate.situation, vars),
    phases: caseTemplate.phases.map(function (phase) {
      return Object.assign({}, phase, {
        studentMessages: phase.studentMessages.map(function (msg) {
          return personalizeText(msg, vars);
        }),
      });
    }),
  });
}
