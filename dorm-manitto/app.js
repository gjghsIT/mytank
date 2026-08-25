(() => {
  const STORAGE_KEY = "dorm-manitto-2026";

  const STUDENTS = [
    { id: "1101", name: "강윤슬", grade: 1 },
    { id: "1102", name: "김규리", grade: 1 },
    { id: "1107", name: "박은선", grade: 1 },
    { id: "1115", name: "이보람", grade: 1 },
    { id: "1116", name: "이아진", grade: 1 },
    { id: "1204", name: "김윤정", grade: 1 },
    { id: "1209", name: "유서윤", grade: 1 },
    { id: "1217", name: "최예나", grade: 1 },
    { id: "1301", name: "나혜윤", grade: 1 },
    { id: "1311", name: "윤정윤", grade: 1 },
    { id: "1314", name: "이효경", grade: 1 },
    { id: "1317", name: "정서연", grade: 1 },
    { id: "1319", name: "황지연", grade: 1 },
    { id: "1402", name: "김가온", grade: 1 },
    { id: "1406", name: "박소정", grade: 1 },
    { id: "1410", name: "우슬혜", grade: 1 },
    { id: "1418", name: "최서우", grade: 1 },
    { id: "1505", name: "서정원", grade: 1 },
    { id: "1512", name: "이예주", grade: 1 },
    { id: "1515", name: "임서연", grade: 1 },
    { id: "1518", name: "정하윤", grade: 1 },
    { id: "1602", name: "김사랑", grade: 1 },
    { id: "1603", name: "김예안", grade: 1 },
    { id: "1605", name: "김혜진", grade: 1 },
    { id: "1617", name: "한다은", grade: 1 },
    { id: "2109", name: "석류리", grade: 2 },
    { id: "2112", name: "윤은정", grade: 2 },
    { id: "2119", name: "조안나", grade: 2 },
    { id: "2121", name: "조윤서", grade: 2 },
    { id: "2204", name: "김지원", grade: 2 },
    { id: "2207", name: "박은비", grade: 2 },
    { id: "2212", name: "유서은", grade: 2 },
    { id: "2214", name: "이소연", grade: 2 },
    { id: "2302", name: "김다나", grade: 2 },
    { id: "2314", name: "전혜린", grade: 2 },
    { id: "2319", name: "최예원", grade: 2 },
    { id: "2403", name: "김승연", grade: 2 },
    { id: "2411", name: "이윤지", grade: 2 },
    { id: "2412", name: "이은주", grade: 2 },
    { id: "2508", name: "이시온", grade: 2 },
    { id: "2510", name: "이신영", grade: 2 },
    { id: "2611", name: "유연주", grade: 2 },
    { id: "2701", name: "강민주", grade: 2 },
    { id: "2702", name: "고은별", grade: 2 },
    { id: "2707", name: "김민정", grade: 2 },
    { id: "2709", name: "박연수", grade: 2 },
    { id: "2712", name: "윤지연", grade: 2 },
    { id: "2715", name: "한효주", grade: 2 },
  ];

  const byId = Object.fromEntries(STUDENTS.map((s) => [s.id, s]));
  const grade1 = STUDENTS.filter((s) => s.grade === 1);
  const grade2 = STUDENTS.filter((s) => s.grade === 2);

  const els = {
    stats: document.getElementById("stats"),
    grade1Btn: document.getElementById("grade1Btn"),
    grade2Btn: document.getElementById("grade2Btn"),
    nameField: document.getElementById("nameField"),
    nameSelect: document.getElementById("nameSelect"),
    formError: document.getElementById("formError"),
    drawBtn: document.getElementById("drawBtn"),
    formCard: document.getElementById("formCard"),
    resultCard: document.getElementById("resultCard"),
    resultKicker: document.getElementById("resultKicker"),
    resultName: document.getElementById("resultName"),
    resultId: document.getElementById("resultId"),
    resultNote: document.getElementById("resultNote"),
    nextBtn: document.getElementById("nextBtn"),
    resetWrap: document.getElementById("resetWrap"),
    resetBtn: document.getElementById("resetBtn"),
  };

  let selectedGrade = 0;

  function loadMatches() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveMatches(matches) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  }

  function usedIds(matches) {
    const used = new Set();
    matches.forEach((m) => {
      used.add(m.fromId);
      used.add(m.toId);
    });
    return used;
  }

  function remainingOf(grade, matches) {
    const used = usedIds(matches);
    return (grade === 1 ? grade1 : grade2).filter((s) => !used.has(s.id));
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function showError(message) {
    els.formError.hidden = !message;
    els.formError.textContent = message || "";
  }

  function renderStats() {
    const matches = loadMatches();
    const left1 = remainingOf(1, matches).length;
    const left2 = remainingOf(2, matches).length;
    els.stats.innerHTML = `
      <div class="stat"><b>${left1}</b><span>남은 1학년</span></div>
      <div class="stat"><b>${left2}</b><span>남은 2학년</span></div>
    `;
  }

  function fillNames() {
    const matches = loadMatches();
    const used = usedIds(matches);
    const list = selectedGrade === 1 ? grade1 : grade2;
    els.nameSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "이름을 선택하세요";
    els.nameSelect.append(placeholder);
    list.forEach((student) => {
      const option = document.createElement("option");
      option.value = student.id;
      const iDrew = matches.some((m) => m.fromId === student.id);
      const taken = used.has(student.id);
      option.textContent = taken
        ? `${student.name} (${student.id}) · 참여 완료`
        : `${student.name} (${student.id})`;
      option.disabled = taken && !iDrew;
      els.nameSelect.append(option);
    });
    els.nameSelect.value = "";
    els.drawBtn.disabled = true;
  }

  function selectGrade(grade) {
    selectedGrade = grade;
    els.grade1Btn.classList.toggle("selected", grade === 1);
    els.grade2Btn.classList.toggle("selected", grade === 2);
    els.nameField.classList.remove("hidden");
    els.resultCard.classList.add("hidden");
    showError("");
    fillNames();
  }

  function currentStudent() {
    return byId[els.nameSelect.value] || null;
  }

  function showResult({ kicker, name, id, note, blocked }) {
    els.resultCard.classList.remove("hidden");
    els.resultCard.classList.toggle("blocked", Boolean(blocked));
    els.resultKicker.textContent = kicker;
    els.resultName.textContent = name;
    els.resultId.textContent = id || "";
    els.resultNote.textContent = note || "";
    els.resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function draw() {
    const me = currentStudent();
    if (!me) {
      showError("내 이름을 먼저 선택해 주세요.");
      return;
    }

    const matches = loadMatches();
    const used = usedIds(matches);
    const mine = matches.find((m) => m.fromId === me.id);

    if (mine) {
      const target = byId[mine.toId];
      els.drawBtn.disabled = true;
      showResult({
        kicker: "이미 참여했습니다",
        name: target.name,
        id: `${target.id} · ${target.grade}학년`,
        note: "이미 정해진 마니또 대상입니다. 다시 뽑을 수 없습니다.",
      });
      return;
    }

    if (used.has(me.id)) {
      els.drawBtn.disabled = true;
      showResult({
        kicker: "참여할 수 없습니다",
        name: "이미 다른 친구의 마니또 대상입니다",
        id: "",
        note: "마니또와 마니또 대상은 한 번만 매칭됩니다.",
        blocked: true,
      });
      return;
    }

    const otherGrade = me.grade === 1 ? 2 : 1;
    const pool = remainingOf(otherGrade, matches);
    if (!pool.length) {
      showError(
        me.grade === 1
          ? "남은 2학년이 없습니다. 이미 모두 매칭되었습니다."
          : "남은 1학년이 없습니다. 이미 모두 매칭되었습니다."
      );
      return;
    }

    const target = pickRandom(pool);
    matches.push({ fromId: me.id, toId: target.id });
    saveMatches(matches);
    renderStats();
    fillNames();
    els.nameSelect.value = me.id;
    els.drawBtn.disabled = true;
    showError("");
    showResult({
      kicker: "나의 마니또 대상",
      name: target.name,
      id: `${target.id} · ${target.grade}학년`,
      note: "이 화면을 닫은 뒤 다음 친구가 뽑으면 됩니다.",
    });
  }

  function nextPerson() {
    selectedGrade = 0;
    els.grade1Btn.classList.remove("selected");
    els.grade2Btn.classList.remove("selected");
    els.nameField.classList.add("hidden");
    els.nameSelect.innerHTML = "";
    els.drawBtn.disabled = true;
    els.resultCard.classList.add("hidden");
    showError("");
    renderStats();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  els.grade1Btn.addEventListener("click", () => selectGrade(1));
  els.grade2Btn.addEventListener("click", () => selectGrade(2));
  els.nameSelect.addEventListener("change", () => {
    showError("");
    els.resultCard.classList.add("hidden");
    els.drawBtn.disabled = !els.nameSelect.value;
  });
  els.drawBtn.addEventListener("click", draw);
  els.nextBtn.addEventListener("click", nextPerson);
  els.resetBtn.addEventListener("click", () => {
    if (!confirm("지금까지의 마니또 추첨을 모두 지울까요?")) return;
    saveMatches([]);
    nextPerson();
  });

  if (new URLSearchParams(location.search).has("admin")) {
    els.resetWrap.classList.remove("hidden");
  }

  renderStats();
})();
