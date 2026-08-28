(() => {
  const STORE_URL = String(window.MANITTO_STORE_URL || "").trim();
  const REPO = "gjghsIT/mytank";
  const STATE_PATH = "dorm-manitto/state.json";
  const TOKEN = String(
    new URLSearchParams(location.search).get("token") ||
    (window.localStorage && localStorage.getItem("manittoToken")) ||
    window.MANITTO_TOKEN ||
    ""
  ).trim();
  if (TOKEN) {
    try {
      localStorage.setItem("manittoToken", TOKEN);
    } catch (error) {
      /* ignore private-mode storage */
    }
  }

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
  let cachedMatches = [];
  let drawing = false;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalize(data) {
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    return {
      version: Number(data?.version) || 0,
      lock: data?.lock || null,
      matches,
    };
  }

  function encodeB64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function hasAllMatches(actual, expected) {
    const got = new Set((actual || []).map((m) => `${m.fromId}>${m.toId}`));
    return (expected || []).every((m) => got.has(`${m.fromId}>${m.toId}`));
  }

  async function getState() {
    if (STORE_URL) {
      const res = await fetch(`${STORE_URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (res.status === 404) return { version: 0, lock: null, matches: [] };
      if (!res.ok) throw new Error("load");
      return normalize(await res.json());
    }
    const res = await fetch(
      `https://api.github.com/repos/gjghsIT/mytank/contents/dorm-manitto/state.json?t=${Date.now()}`,
      { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }
    );
    if (!res.ok) throw new Error("load");
    const meta = await res.json();
    const binary = atob(String(meta.content || "").replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const data = normalize(JSON.parse(new TextDecoder().decode(bytes)));
    data.sha = meta.sha;
    return data;
  }

  async function putState(state) {
    const payload = {
      version: state.version || 0,
      lock: null,
      matches: state.matches || [],
    };
    if (STORE_URL) {
      const res = await fetch(STORE_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save");
      return;
    }
    if (!TOKEN) throw new Error("save");
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${STATE_PATH}`, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Update manitto matches.",
        content: encodeB64(JSON.stringify(payload)),
        sha: state.sha,
      }),
    });
    if (res.status === 409 || res.status === 422) throw new Error("conflict");
    if (!res.ok) throw new Error("save");
  }

  async function updateState(mutator) {
    for (let i = 0; i < 18; i += 1) {
      const state = await getState();
      const result = mutator(state.matches.slice());
      if (result.status === "mine" || result.status === "taken" || result.status === "empty") {
        cachedMatches = state.matches;
        return result;
      }
      const nextVersion = (state.version || 0) + 1;
      try {
        await putState({
          version: nextVersion,
          matches: result.matches,
          sha: state.sha,
        });
      } catch (error) {
        if (error.message === "conflict") {
          await sleep(150 + Math.random() * 400);
          continue;
        }
        throw error;
      }
      if (STORE_URL) {
        const verify = await getState();
        const landed =
          result.status === "reset"
            ? verify.matches.length === 0
            : hasAllMatches(verify.matches, result.matches);
        if (!landed) {
          await sleep(150 + Math.random() * 400);
          continue;
        }
        cachedMatches = verify.matches;
        return result;
      }
      cachedMatches = result.matches;
      return result;
    }
    throw new Error("busy");
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

  function renderStats(matches) {
    const list = matches || cachedMatches;
    const left1 = remainingOf(1, list).length;
    const left2 = remainingOf(2, list).length;
    els.stats.innerHTML = `
      <div class="stat"><b>${left1}</b><span>남은 1학년</span></div>
      <div class="stat"><b>${left2}</b><span>남은 2학년</span></div>
    `;
  }

  function fillNames(matches) {
    const list = matches || cachedMatches;
    const used = usedIds(list);
    const people = selectedGrade === 1 ? grade1 : grade2;
    const previous = els.nameSelect.value;
    els.nameSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "이름을 선택하세요";
    els.nameSelect.append(placeholder);
    people.forEach((student) => {
      const option = document.createElement("option");
      option.value = student.id;
      const iDrew = list.some((m) => m.fromId === student.id);
      const taken = used.has(student.id);
      option.textContent = taken
        ? `${student.name} (${student.id}) · 참여 완료`
        : `${student.name} (${student.id})`;
      option.disabled = taken && !iDrew;
      els.nameSelect.append(option);
    });
    if (previous && [...els.nameSelect.options].some((o) => o.value === previous && !o.disabled)) {
      els.nameSelect.value = previous;
    } else {
      els.nameSelect.value = "";
    }
    els.drawBtn.disabled = drawing || !els.nameSelect.value;
  }

  async function refreshFromStore() {
    try {
      const state = await getState();
      cachedMatches = state.matches;
      renderStats(cachedMatches);
      if (selectedGrade) fillNames(cachedMatches);
      if (!drawing) showError("");
    } catch {
      showError("공통 명단에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.");
    }
  }

  function selectGrade(grade) {
    selectedGrade = grade;
    els.grade1Btn.classList.toggle("selected", grade === 1);
    els.grade2Btn.classList.toggle("selected", grade === 2);
    els.nameField.classList.remove("hidden");
    els.resultCard.classList.add("hidden");
    showError("");
    fillNames(cachedMatches);
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

  async function draw() {
    const me = currentStudent();
    if (!me || drawing) {
      if (!me) showError("내 이름을 먼저 선택해 주세요.");
      return;
    }

    drawing = true;
    els.drawBtn.disabled = true;
    els.drawBtn.textContent = "뽑는 중...";
    showError("");

    try {
      const result = await updateState((matches) => {
        const used = usedIds(matches);
        const mine = matches.find((m) => m.fromId === me.id);
        if (mine) return { matches, status: "mine", toId: mine.toId };
        if (used.has(me.id)) return { matches, status: "taken" };
        const pool = remainingOf(me.grade === 1 ? 2 : 1, matches);
        if (!pool.length) return { matches, status: "empty" };
        const target = pickRandom(pool);
        return {
          matches: matches.concat({ fromId: me.id, toId: target.id }),
          status: "ok",
          toId: target.id,
        };
      });

      renderStats(cachedMatches);
      fillNames(cachedMatches);
      els.nameSelect.value = me.id;
      els.drawBtn.disabled = true;

      if (result.status === "mine") {
        const target = byId[result.toId];
        showResult({
          kicker: "이미 참여했습니다",
          name: target.name,
          id: `${target.id} · ${target.grade}학년`,
          note: "이미 정해진 마니또 대상입니다. 다시 뽑을 수 없습니다.",
        });
        return;
      }
      if (result.status === "taken") {
        showResult({
          kicker: "참여할 수 없습니다",
          name: "이미 다른 친구의 마니또 대상입니다",
          id: "",
          note: "마니또와 마니또 대상은 한 번만 매칭됩니다.",
          blocked: true,
        });
        return;
      }
      if (result.status === "empty") {
        showError(
          me.grade === 1
            ? "남은 2학년이 없습니다. 이미 모두 매칭되었습니다."
            : "남은 1학년이 없습니다. 이미 모두 매칭되었습니다."
        );
        return;
      }
      const target = byId[result.toId];
      showResult({
        kicker: "나의 마니또 대상",
        name: target.name,
        id: `${target.id} · ${target.grade}학년`,
        note: "이 화면을 닫은 뒤 다음 친구가 뽑으면 됩니다.",
      });
    } catch (error) {
      showError(
        error.message === "busy"
          ? "다른 친구가 뽑고 있습니다. 잠시 후 다시 눌러 주세요."
          : "공통 명단에 저장하지 못했습니다. 다시 시도해 주세요."
      );
    } finally {
      drawing = false;
      els.drawBtn.textContent = "내 마니또 대상은?";
      els.drawBtn.disabled =
        !els.nameSelect.value || cachedMatches.some((m) => m.fromId === els.nameSelect.value);
    }
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
    renderStats(cachedMatches);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  els.grade1Btn.addEventListener("click", () => selectGrade(1));
  els.grade2Btn.addEventListener("click", () => selectGrade(2));
  els.nameSelect.addEventListener("change", () => {
    showError("");
    els.resultCard.classList.add("hidden");
    els.drawBtn.disabled = drawing || !els.nameSelect.value;
  });
  els.drawBtn.addEventListener("click", () => {
    draw();
  });
  els.nextBtn.addEventListener("click", nextPerson);
  els.resetBtn.addEventListener("click", async () => {
    if (!confirm("지금까지의 마니또 추첨을 모두 지울까요?")) return;
    try {
      await updateState(() => ({ matches: [], status: "reset" }));
      nextPerson();
    } catch {
      showError("초기화에 실패했습니다. 다시 시도해 주세요.");
    }
  });

  if (new URLSearchParams(location.search).has("admin")) {
    els.resetWrap.classList.remove("hidden");
  }

  refreshFromStore();
  setInterval(() => {
    if (document.visibilityState === "visible") refreshFromStore();
  }, 8000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshFromStore();
  });
})();
