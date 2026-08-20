const QUESTIONS = [
  {
    category: "도박",
    q: "지난 3개월 동안 돈내기 게임 때문에 일상 방해, 감정·집착, 은폐·금전 문제 중 하나라도 해당된다면?",
    choices: [
      "아직 재미로 하는 단계라 괜찮다",
      "도박 문제가 시작되고 있다는 신호이다",
      "용돈을 다 쓰기 전에는 문제가 아니다",
      "친구와 한 내기면 해당하지 않는다",
    ],
    answer: 1,
    explain:
      "일상 방해, 감정·집착, 은폐·금전 문제 중 해당되는 것이 있으면 도박 문제가 시작된 신호입니다. 즉시 선생님이나 상담사에게 도움을 요청하세요.",
  },
  {
    category: "도박",
    q: "돈내기 게임 사실을 부모·선생님에게 숨기거나, 용돈·남의 돈을 게임에 쓴 것은 무엇에 해당할까요?",
    choices: ["일상 방해", "감정·집착", "은폐·금전 문제", "단순한 취미"],
    answer: 2,
    explain:
      "게임 사실을 숨기거나 용돈·남의 돈을 게임에 쓰는 것은 은폐·금전 문제입니다. 도박 문제의 자가점검 기준 중 하나입니다.",
  },
  {
    category: "도박",
    q: "도박 문제 신호가 보인다면 가장 먼저 해야 할 일은?",
    choices: [
      "혼자서 더 이상 안 하기로 다짐한다",
      "잃어버린 돈을 되찾으려고 한 판 더 한다",
      "친구에게만 비밀로 말한다",
      "즉시 선생님이나 상담사에게 도움을 요청한다",
    ],
    answer: 3,
    explain: "해당 항목이 있으면 즉시 선생님이나 상담사에게 도움을 요청하라고 안내합니다. 혼자 해결하려고 하지 마세요.",
  },
  {
    category: "학교폭력",
    q: "학교폭력예방법에서 말하는 학교폭력은 무엇인가요?",
    choices: [
      "학교 밖에서만 일어나는 폭행",
      "학교 내에서 학생을 대상으로 발생한 신체적·정신적 또는 재산상의 피해를 수반하는 행위",
      "다친 경우에만 인정되는 신체 폭행",
      "선생님과 학생 사이의 갈등만 해당한다",
    ],
    answer: 1,
    explain:
      "학교폭력은 “학교 내에서 학생을 대상으로 발생한 신체적·정신적 또는 재산상의 피해를 수반하는 행위”로 정의됩니다.",
  },
  {
    category: "학교폭력",
    q: "최근 학교폭력에 대해 특히 중요한 것은?",
    choices: [
      "오프라인에서만 일어난다",
      "온·오프라인을 통해 복합적으로 발생하므로 사이버폭력에도 문제의식을 가져야 한다",
      "명예훼손은 학교폭력이 아니다",
      "기숙사에서는 학교폭력에 해당하지 않는다",
    ],
    answer: 1,
    explain:
      "최근에는 온·오프라인을 통해 복합적으로 발생합니다. 사이버 언어폭력·명예훼손·따돌림·스토킹 등 사이버폭력에도 예방 역량이 필요합니다.",
  },
  {
    category: "학교폭력",
    q: "때리기, 감금, 약취·유인처럼 신체에 고통을 가하는 행위는 어떤 유형인가요?",
    choices: ["언어폭력", "금품갈취", "신체폭력", "따돌림"],
    answer: 2,
    explain: "신체폭력은 때리기·감금·약취·유인 등 신체에 고통을 가하는 모든 행위입니다.",
  },
  {
    category: "학교폭력",
    q: "빵 셔틀, 과제·게임 대행, 심부름을 시키기처럼 의사에 반하는 행동을 강제하는 것은?",
    choices: ["강요", "금품갈취", "언어폭력", "단순 부탁"],
    answer: 0,
    explain: "빵 셔틀, 과제·게임 대행, 심부름 강요 등 의사에 반하는 행동을 강제하는 것은 강요입니다.",
  },
  {
    category: "학교폭력",
    q: "돈 요구, 물품 강탈, 고의 파손, 돈을 걷어 오도록 시키는 행위는?",
    choices: ["따돌림", "금품갈취", "사이버폭력", "장난"],
    answer: 1,
    explain: "돈이나 물품을 강제로 빼앗거나, 빌려 간 뒤 갚지 않거나, 돈을 걷어 오도록 강요하는 행위는 금품갈취입니다.",
  },
  {
    category: "학교폭력",
    q: "집단적·반복적으로 피하거나 어울리지 못하도록 막는 행위는?",
    choices: ["신체폭력", "금품갈취", "따돌림", "일상적인 성격 차이"],
    answer: 2,
    explain: "집단적·반복적으로 피하거나 어울리지 못하도록 막는 행위는 따돌림입니다.",
  },
  {
    category: "성폭력",
    q: "장난과 성폭력을 구분하는 핵심 원칙은?",
    choices: [
      "친한 사이면 괜찮다",
      "가해자가 장난이라고 하면 된다",
      "경계를 존중하고, 친구가 싫어하는 행동은 하지 않는다",
      "다른 친구들이 웃으면 장난이다",
    ],
    answer: 2,
    explain: "경계를 존중하는 것이 핵심입니다. “친구가 싫어하는 행동은 하지 않는다”는 원칙을 기억하세요.",
  },
  {
    category: "성폭력",
    q: "상대방이 “난 재미없어!”라고 했는데 “ㅋㅋ 장난이야”라고 하면?",
    choices: [
      "친하니까 통한다",
      "가해자의 의도가 중요하므로 장난으로 본다",
      "통하지 않는다. 피해자의 감정이 기준이다",
      "한 번이면 괜찮다",
    ],
    answer: 2,
    explain:
      "“ㅋㅋ 장난이야”는 통하지 않습니다. 상대방이 재미없다고 느끼면 이미 장난이 아닌 폭력입니다. 가해자의 의도가 아니라 피해자의 감정이 기준입니다.",
  },
  {
    category: "성폭력",
    q: "다음 중 성폭력에 해당하는 행동은?",
    choices: [
      "화장실 훔쳐보기, 바지 내리기, 똥침하기",
      "과제 같이 하기",
      "친구에게 고민 상담하기",
      "동아리에서 역할 나누기",
    ],
    answer: 0,
    explain:
      "화장실 훔쳐보기, 바지 내리기, 똥침하기, 허락 없이 몸 만지기, 성적 사진 전송 요구, 성희롱 발언 등은 성폭력입니다.",
  },
  {
    category: "디지털 성폭력",
    q: "디지털 성폭력에 대한 설명으로 옳은 것은?",
    choices: [
      "온라인에서만 장난으로 보면 된다",
      "유포하지 않고 만들기만 하면 처벌되지 않는다",
      "디지털 기기와 AI로 타인의 성 관련 권리를 침해하는 중대한 범죄이다",
      "친구 동의 없이 찍어도 저장만 하면 괜찮다",
    ],
    answer: 2,
    explain:
      "디지털 기기 및 AI 기술을 이용해 타인의 성(性)과 관련된 권리를 침해하는 행위입니다. 피해자에게 심각한 정신·사회적 피해를 입히는 중대한 범죄입니다.",
  },
  {
    category: "디지털 성폭력",
    q: "상대방 동의 하에 촬영했더라도, 허락 없이 유포하거나 게시하면?",
    choices: ["문제가 되지 않는다", "무단 유포에 해당한다", "친구 사이면 괜찮다", "삭제하면 처벌되지 않는다"],
    answer: 1,
    explain: "동의 하에 촬영했더라도 상대방 허락 없이 유포·게시하는 것은 무단 유포입니다.",
  },
  {
    category: "디지털 성폭력",
    q: "일상 사진을 AI로 합성·편집해 성적 영상물로 만들어 유포하는 행위는?",
    choices: ["단순 편집", "위장 영상물 제작", "정당한 창작", "명예훼손만 해당"],
    answer: 1,
    explain: "일상 사진을 AI로 합성·편집해 성적 영상물로 만들어 유포하는 것은 위장 영상물 제작입니다.",
  },
  {
    category: "디지털 성폭력",
    q: "불법촬영·유포, 성착취물 제작·유포의 처벌 기준으로 맞는 것은?",
    choices: [
      "벌금만 낸다",
      "최대 징역 7년, 벌금 최대 5천만 원",
      "최대 징역 1년",
      "미성년자에게만 적용된다",
    ],
    answer: 1,
    explain:
      "불법촬영·유포 / 성착취물 제작·유포는 최대 징역 7년, 벌금 최대 5천만 원입니다. 유포 목적이 없어도 제작만 해도 처벌됩니다.",
  },
  {
    category: "디지털 성폭력",
    q: "불법 촬영물·아동·청소년 성착취물을 소지·구입·저장·시청하면?",
    choices: [
      "보기만 하면 처벌되지 않는다",
      "제작자와만 처벌이 같다",
      "별도로 처벌될 수 있다 (최대 징역 3년, 벌금 3천만 원)",
      "다운로드 후 바로 지우면 괜찮다",
    ],
    answer: 2,
    explain:
      "소지·구입·저장·시청도 처벌 대상입니다(최대 3년, 3천만 원). 제작물과 소지·시청은 별도로 처벌되며(2024.10.16 시행), 상습범은 형량의 1/2까지 가중됩니다.",
  },
  {
    category: "도움받기",
    q: "학교폭력·디지털 성폭력 신고 번호와 청소년 상담 번호는?",
    choices: ["112 / 119", "117 / 1388", "120 / 1330", "182 / 110"],
    answer: 1,
    explain:
      "학교폭력 신고 117, 청소년 상담 1388, 디지털 성범죄 피해자 지원센터 02-735-8994입니다. 증거는 삭제하지 말고 캡처·저장하고, 믿을 수 있는 어른에게 즉시 알리세요. 피해는 본인의 잘못이 아닙니다.",
  },
];

const els = {
  title: document.getElementById("titleScreen"),
  help: document.getElementById("helpScreen"),
  quiz: document.getElementById("quizScreen"),
  result: document.getElementById("resultScreen"),
  startBtn: document.getElementById("startBtn"),
  helpBtn: document.getElementById("helpBtn"),
  helpStartBtn: document.getElementById("helpStartBtn"),
  helpBackBtn: document.getElementById("helpBackBtn"),
  catLabel: document.getElementById("catLabel"),
  countLabel: document.getElementById("countLabel"),
  timerNum: document.getElementById("timerNum"),
  timerBar: document.getElementById("timerBar"),
  timerFill: document.getElementById("timerFill"),
  progressFill: document.getElementById("progressFill"),
  questionText: document.getElementById("questionText"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  feedbackTitle: document.getElementById("feedbackTitle"),
  feedbackBody: document.getElementById("feedbackBody"),
  nextBtn: document.getElementById("nextBtn"),
  scoreLabel: document.getElementById("scoreLabel"),
  resultKicker: document.getElementById("resultKicker"),
  resultMsg: document.getElementById("resultMsg"),
  retryBtn: document.getElementById("retryBtn"),
  homeBtn: document.getElementById("homeBtn"),
};

const LIMIT_MS = 5000;

let order = [];
let index = 0;
let score = 0;
let locked = false;
let timerId = 0;
let deadline = 0;

function show(screen) {
  [els.title, els.help, els.quiz, els.result].forEach((el) => el.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function stopTimer() {
  if (timerId) {
    cancelAnimationFrame(timerId);
    timerId = 0;
  }
}

function startTimer() {
  stopTimer();
  deadline = performance.now() + LIMIT_MS;
  els.timerBar.classList.remove("urgent");
  els.timerNum.classList.remove("urgent");
  els.timerNum.textContent = "5";
  els.timerFill.style.transform = "scaleX(1)";
  timerId = requestAnimationFrame(tickTimer);
}

function tickTimer() {
  const left = Math.max(0, deadline - performance.now());
  const ratio = left / LIMIT_MS;
  const sec = Math.max(0, Math.ceil(left / 1000));
  els.timerFill.style.transform = `scaleX(${ratio})`;
  els.timerNum.textContent = String(sec);
  const urgent = left <= 2000;
  els.timerBar.classList.toggle("urgent", urgent);
  els.timerNum.classList.toggle("urgent", urgent);
  if (left <= 0) {
    timerId = 0;
    onTimeout();
    return;
  }
  timerId = requestAnimationFrame(tickTimer);
}

function startQuiz() {
  stopTimer();
  order = shuffle(QUESTIONS.map((_, i) => i));
  index = 0;
  score = 0;
  show(els.quiz);
  renderQuestion();
}

function current() {
  return QUESTIONS[order[index]];
}

function renderQuestion() {
  const item = current();
  locked = false;
  els.catLabel.textContent = item.category;
  els.countLabel.textContent = `${index + 1} / ${QUESTIONS.length}`;
  els.progressFill.style.width = `${((index + 1) / QUESTIONS.length) * 100}%`;
  els.questionText.textContent = item.q;
  els.feedback.classList.add("hidden");
  els.nextBtn.classList.add("hidden");
  els.nextBtn.textContent = index === QUESTIONS.length - 1 ? "결과 보기" : "다음 문제";
  els.choices.innerHTML = "";

  item.choices.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = text;
    btn.addEventListener("click", () => selectChoice(i, btn));
    els.choices.appendChild(btn);
  });
  startTimer();
}

function onTimeout() {
  if (locked) return;
  locked = true;
  revealAnswer(-1, true);
}

function selectChoice(choiceIndex, btn) {
  if (locked) return;
  locked = true;
  stopTimer();
  revealAnswer(choiceIndex, false);
}

function revealAnswer(choiceIndex, timedOut) {
  const item = current();
  const buttons = [...els.choices.querySelectorAll(".choice")];
  const correct = choiceIndex === item.answer;
  if (correct) score += 1;

  buttons.forEach((el, i) => {
    if (i === item.answer) el.classList.add("correct");
    else if (i === choiceIndex) el.classList.add("wrong");
    else el.classList.add("dim");
  });

  els.feedback.classList.remove("hidden", "ok", "bad");
  els.feedback.classList.add(correct ? "ok" : "bad");
  els.feedbackTitle.textContent = timedOut ? "시간 초과" : correct ? "정답이에요" : "다시 기억해 봐요";
  els.feedbackBody.textContent = item.explain;
  els.nextBtn.classList.remove("hidden");
  els.nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function next() {
  if (index < QUESTIONS.length - 1) {
    index += 1;
    renderQuestion();
    els.quiz.scrollTop = 0;
  } else {
    showResult();
  }
}

function showResult() {
  stopTimer();
  const total = QUESTIONS.length;
  const ratio = score / total;
  els.scoreLabel.textContent = String(score);
  if (ratio === 1) {
    els.resultKicker.textContent = "완벽하게 지켰어요";
    els.resultMsg.textContent = "기숙사에서 서로를 지키는 약속을 잘 알고 있어요. 주변 친구에게도 알려 주세요.";
  } else if (ratio >= 0.7) {
    els.resultKicker.textContent = "잘 이해하고 있어요";
    els.resultMsg.textContent = "핵심은 기억났습니다. 헷갈린 부분은 도움 전화와 함께 한 번 더 확인해 보세요.";
  } else {
    els.resultKicker.textContent = "한 번 더 익혀 봐요";
    els.resultMsg.textContent = "도박 NO, 폭력 NO, 디지털 성폭력 NO. 친구가 싫어하는 행동은 하지 않는 것이 진짜 배려입니다.";
  }
  show(els.result);
}

els.startBtn.addEventListener("click", startQuiz);
els.helpBtn.addEventListener("click", () => {
  stopTimer();
  show(els.help);
});
els.helpStartBtn.addEventListener("click", startQuiz);
els.helpBackBtn.addEventListener("click", () => show(els.title));
els.nextBtn.addEventListener("click", next);
els.retryBtn.addEventListener("click", startQuiz);
els.homeBtn.addEventListener("click", () => {
  stopTimer();
  show(els.title);
});
