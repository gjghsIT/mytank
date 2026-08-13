(function () {
  "use strict";

  const API_KEY_STORAGE = "haeyoon_english_helper_gemini_key";
  const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];

  const ANALYZE_PROMPT = `너는 초등학생(한국, 3~6학년) 영어 숙제 도우미야.
첨부한 사진 중 첫 번째는 영어 학습지(숙제)다. 두 번째 사진이 있으면 교과서·단어장·참고자료다.

할 일:
1) 학습지를 문제 번호 순서대로 나눈다.
2) 각 문제에 이미 적혀 있는 영어 단어만 고른다. 빈칸에 들어갈 정답, 아직 안 나온 답은 절대 넣지 않는다.
3) 각 영어 단어의 뜻은 초등학생이 아는 쉬운 한국어로 1개 또는 2개만. 사전처럼 길게 쓰지 않는다.
4) 참고자료 사진이 있으면 그 자료의 뜻을 우선한다.
5) 힌트 2개를 만든다. 힌트는 생각의 방향만 알려 준다.

힌트 절대 금지:
- 정답 영어 단어, 한국어 정답, 빈칸에 넣을 말
- 철자, 첫 글자, 글자 수, 빈칸 개수로 답을 맞히게 하기
- 보기(word bank) 중에서 고르라고 특정 단어를 가리키기
- "정답은 ~예요", "~를 쓰세요", 문장 전체를 완성해 주기
- 번역 문제에서 우리말 문장 전체를 영어로 바꿔 주기

1단계 힌트: 문제 유형, 어디를 보면 좋은지, 품사(명사/동사/형용사 등) 정도만.
2단계 힌트: 상황·문장 자리를 조금 더 알려 주되, 여전히 답을 말하지 않는다.
whatToDo는 '무엇을 하는 문제인지'만 쉽게. 정답을 섞지 않는다.
englishBits는 학습지에 보이는 문제 글자(빈칸은 빈칸 그대로). 답을 채우지 않는다.

JSON만 출력:
{
  "problems": [
    {
      "label": "1번",
      "whatToDo": "빈칸에 알맞은 말을 넣어요.",
      "englishBits": "I am ____.",
      "words": [{ "en": "happy", "meanings": ["행복한"] }],
      "hint1": "초등학생 말로 된 1단계 힌트",
      "hint2": "초등학생 말로 된 2단계 힌트"
    }
  ]
}`;

  const state = {
    captureMode: "homework",
    homeworkDataUrl: "",
    referenceDataUrl: "",
    problems: [],
    index: 0,
    hintLevel: 0,
  };

  const $ = function (id) {
    return document.getElementById(id);
  };

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

  function showScreen(id) {
    ["setupScreen", "homeScreen", "refScreen", "loadingScreen", "studyScreen", "doneScreen", "errorScreen"].forEach(
      function (screenId) {
        $(screenId).classList.toggle("hidden", screenId !== id);
      }
    );
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.remove("show");
    }, 2200);
  }

  function dataUrlToInline(dataUrl) {
    const parts = String(dataUrl || "").split(",");
    const header = parts[0] || "";
    const data = parts[1] || "";
    const mime = (header.match(/data:(.*?);/) || [])[1] || "image/jpeg";
    return { mimeType: mime, data: data };
  }

  function compressFile(file) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = function () {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.74));
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("image"));
      };
      img.src = url;
    });
  }

  function parseJsonFromText(text) {
    const cleaned = String(text || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("json");
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  function geminiText(data) {
    const parts =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts;
    if (!parts || !parts.length) return "";
    return parts
      .map(function (p) {
        return p.text || "";
      })
      .join("\n")
      .trim();
  }

  async function callGemini(parts) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("key");
    let lastErr = null;
    const configs = [
      { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: "application/json" },
      { temperature: 0.3, maxOutputTokens: 4096 },
    ];

    for (let i = 0; i < GEMINI_MODELS.length; i++) {
      for (let c = 0; c < configs.length; c++) {
        const url =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          GEMINI_MODELS[i] +
          ":generateContent?key=" +
          encodeURIComponent(apiKey);
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: parts }],
              generationConfig: configs[c],
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            lastErr = data.error && data.error.message ? data.error.message : "api";
            continue;
          }
          const text = geminiText(data);
          if (!text) {
            lastErr = "empty";
            continue;
          }
          return text;
        } catch (e) {
          lastErr = e.message || "net";
        }
      }
    }
    throw new Error(lastErr || "api");
  }

  function normalizeMeanings(raw) {
    const list = Array.isArray(raw) ? raw : String(raw || "").split(/[,/·]| 그리고 /);
    const out = [];
    list.forEach(function (item) {
      const s = String(item || "")
        .replace(/[.]/g, "")
        .trim();
      if (s && out.indexOf(s) < 0) out.push(s);
    });
    return out.slice(0, 2);
  }

  function looksLikeAnswerLeak(hint, problem) {
    const t = String(hint || "");
    if (!t) return true;
    if (/(정답은|답은|쓰면 돼요|쓰세요|입니다)\s*[A-Za-z]/.test(t)) return true;
    if (/["“'][A-Za-z]{2,}["”']/.test(t)) return true;
    const englishInHint = t.match(/\b[A-Za-z]{3,}\b/g) || [];
    const allowed = {};
    (problem.words || []).forEach(function (w) {
      allowed[String(w.en || "").toLowerCase()] = true;
    });
    String(problem.englishBits || "")
      .replace(/_+/g, " ")
      .split(/\b/)
      .forEach(function (w) {
        if (/^[A-Za-z]{3,}$/.test(w)) allowed[w.toLowerCase()] = true;
      });
    for (let i = 0; i < englishInHint.length; i++) {
      const w = englishInHint[i].toLowerCase();
      if (
        ["the", "and", "for", "you", "are", "this", "that", "with", "from", "your"].indexOf(w) >= 0
      ) {
        continue;
      }
      if (!allowed[w]) return true;
    }
    return false;
  }

  const SAFE_HINTS = {
    1: "학습지 그림을 다시 보고, 빈칸이 문장의 어디에 있는지만 먼저 생각해 보세요.",
    2: "보기나 단어 뜻이 있으면 품사(사람·물건·행동·기분)를 맞춰 본 뒤, 문장에 자연스러운 말을 골라 보세요.",
  };

  function sanitizeHint(hint, problem, level) {
    if (!looksLikeAnswerLeak(hint, problem)) return String(hint || "").trim();
    return SAFE_HINTS[level] || SAFE_HINTS[1];
  }

  function normalizeProblems(raw) {
    const list = (raw && raw.problems) || [];
    return list
      .map(function (p, i) {
        const words = (p.words || [])
          .map(function (w) {
            const en = String((w && w.en) || "").trim();
            const meanings = normalizeMeanings(w && (w.meanings || w.ko || w.meaning));
            if (!en || !meanings.length) return null;
            return { en: en, meanings: meanings };
          })
          .filter(Boolean);
        const problem = {
          label: String(p.label || i + 1 + "번"),
          whatToDo: String(p.whatToDo || "이 문제를 학습지에서 찾아 풀어 보세요."),
          englishBits: String(p.englishBits || "").trim(),
          words: words,
          hint1: "",
          hint2: "",
        };
        problem.hint1 = sanitizeHint(p.hint1, problem, 1);
        problem.hint2 = sanitizeHint(p.hint2, problem, 2);
        return problem;
      })
      .filter(function (p) {
        return p.whatToDo || p.englishBits || p.words.length;
      });
  }

  async function analyzeHomework() {
    const hw = dataUrlToInline(state.homeworkDataUrl);
    const parts = [
      { text: ANALYZE_PROMPT },
      { inlineData: { mimeType: hw.mimeType, data: hw.data } },
    ];
    if (state.referenceDataUrl) {
      const ref = dataUrlToInline(state.referenceDataUrl);
      parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
    }
    const text = await callGemini(parts);
    const parsed = parseJsonFromText(text);
    const problems = normalizeProblems(parsed);
    if (!problems.length) throw new Error("empty-problems");
    return problems;
  }

  function startCapture(mode) {
    state.captureMode = mode;
    $("cameraInput").value = "";
    $("cameraInput").click();
  }

  async function onPhotoPicked(file) {
    if (!file) return;
    try {
      const dataUrl = await compressFile(file);
      if (state.captureMode === "homework") {
        state.homeworkDataUrl = dataUrl;
        $("homeworkThumbWrap").innerHTML = '<img alt="찍은 학습지" src="' + dataUrl + '" />';
        showScreen("refScreen");
        return;
      }
      state.referenceDataUrl = dataUrl;
      await runAnalysis();
    } catch (e) {
      toast("사진을 읽지 못했어요. 다시 찍어 주세요.");
    }
  }

  async function runAnalysis() {
    showScreen("loadingScreen");
    $("loadingTitle").textContent = "학습지를 읽고 있어요";
    $("loadingText").textContent = "문제를 찾고 단어를 고르고 있어요. 조금만 기다려 주세요.";
    try {
      state.problems = await analyzeHomework();
      state.index = 0;
      state.hintLevel = 0;
      renderStudy();
      showScreen("studyScreen");
    } catch (e) {
      if (String(e.message || "").indexOf("API key") >= 0 || e.message === "key") {
        $("errorText").textContent = "API 키가 없거나 잘못됐어요. 오른쪽 위 설정에서 다시 저장해 주세요.";
      } else {
        $("errorText").textContent = "글자를 잘 못 읽었어요. 학습지를 가까이, 밝게 찍어 주세요.";
      }
      showScreen("errorScreen");
    }
  }

  function renderWords(problem) {
    const ul = $("wordList");
    ul.innerHTML = "";
    if (!problem.words.length) {
      const li = document.createElement("li");
      li.innerHTML = '<span class="word-ko">이 문제에는 미리 알려 줄 영어 단어가 거의 없어요. 학습지를 보고 생각해 보세요.</span>';
      ul.appendChild(li);
      return;
    }
    problem.words.forEach(function (w) {
      const li = document.createElement("li");
      const en = document.createElement("span");
      en.className = "word-en";
      en.textContent = w.en;
      const ko = document.createElement("span");
      ko.className = "word-ko";
      ko.textContent = w.meanings.join(", ");
      li.appendChild(en);
      li.appendChild(ko);
      ul.appendChild(li);
    });
  }

  function renderHints(problem) {
    const box = $("hintBox");
    box.innerHTML = "";
    if (state.hintLevel >= 1) {
      const card = document.createElement("div");
      card.className = "hint-card level-1";
      card.innerHTML = "<h3>1단계 힌트</h3>";
      const p = document.createElement("p");
      p.textContent = problem.hint1;
      card.appendChild(p);
      box.appendChild(card);
    }
    if (state.hintLevel >= 2) {
      const card = document.createElement("div");
      card.className = "hint-card level-2";
      card.innerHTML = "<h3>2단계 힌트</h3>";
      const p = document.createElement("p");
      p.textContent = problem.hint2;
      card.appendChild(p);
      box.appendChild(card);
    }
  }

  function renderActions() {
    const wrap = $("studyActions");
    wrap.innerHTML = "";
    const last = state.index >= state.problems.length - 1;
    const nextLabel = last ? "숙제 끝내기" : "다음문제";

    function addBtn(label, className, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn " + className;
      btn.textContent = label;
      btn.addEventListener("click", onClick);
      wrap.appendChild(btn);
    }

    if (state.hintLevel === 0) {
      addBtn("1단계 힌트", "btn-hint", function () {
        state.hintLevel = 1;
        renderStudy();
      });
      addBtn(nextLabel, "btn-next", goNext);
      return;
    }
    if (state.hintLevel === 1) {
      addBtn("2단계 힌트", "btn-hint", function () {
        state.hintLevel = 2;
        renderStudy();
      });
      addBtn(nextLabel, "btn-next", goNext);
      return;
    }
    addBtn(nextLabel, "btn-next", goNext);
  }

  function goNext() {
    if (state.index >= state.problems.length - 1) {
      showScreen("doneScreen");
      return;
    }
    state.index += 1;
    state.hintLevel = 0;
    renderStudy();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderStudy() {
    const total = state.problems.length;
    const problem = state.problems[state.index];
    const n = state.index + 1;
    $("progressLabel").textContent = "문제 " + n + " / " + total;
    $("progressFill").style.width = Math.round((n / total) * 100) + "%";
    $("problemNo").textContent = problem.label;
    $("problemWhat").textContent = problem.whatToDo;
    $("problemBits").textContent = problem.englishBits;
    $("problemBits").style.display = problem.englishBits ? "block" : "none";
    renderWords(problem);
    renderHints(problem);
    renderActions();
  }

  function resetAll() {
    state.homeworkDataUrl = "";
    state.referenceDataUrl = "";
    state.problems = [];
    state.index = 0;
    state.hintLevel = 0;
    $("homeworkThumbWrap").innerHTML = "";
    $("cameraInput").value = "";
    showHomeOrSetup();
  }

  function showHomeOrSetup() {
    if (!getApiKey()) {
      $("apiKeyInput").value = "";
      $("setupBackBtn").classList.add("hidden");
      showScreen("setupScreen");
      return;
    }
    showScreen("homeScreen");
  }

  function bind() {
    $("settingsBtn").addEventListener("click", function () {
      $("apiKeyInput").value = getApiKey();
      $("setupBackBtn").classList.toggle("hidden", !getApiKey());
      showScreen("setupScreen");
    });

    $("setupBackBtn").addEventListener("click", function () {
      showScreen("homeScreen");
    });

    $("saveKeyBtn").addEventListener("click", function () {
      const key = $("apiKeyInput").value.trim();
      if (key.length < 10) {
        toast("키가 너무 짧아요. 다시 붙여 넣어 주세요.");
        return;
      }
      setApiKey(key);
      toast("저장했어요!");
      showScreen("homeScreen");
    });

    $("homeworkBtn").addEventListener("click", function () {
      if (!getApiKey()) {
        showScreen("setupScreen");
        toast("먼저 부모님께 키 저장을 부탁해요.");
        return;
      }
      startCapture("homework");
    });

    $("refPhotoBtn").addEventListener("click", function () {
      startCapture("reference");
    });

    $("refSkipBtn").addEventListener("click", function () {
      state.referenceDataUrl = "";
      runAnalysis();
    });

    $("restartBtn").addEventListener("click", resetAll);
    $("retryBtn").addEventListener("click", resetAll);

    $("cameraInput").addEventListener("change", function (e) {
      const file = e.target.files && e.target.files[0];
      onPhotoPicked(file);
    });
  }

  bind();
  showHomeOrSetup();
})();
