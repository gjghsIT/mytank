(function () {
  "use strict";

  const API_KEY_STORAGE = "haeyoon_english_helper_gemini_key";
  const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro", "gemini-1.5-flash"];

  const SAFETY_OFF = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ];

  const OCR_PROMPT = `너는 초등 영어 학습지 OCR 엔진이다.
사진에서 **인쇄된(활자/타이포/교과서·학습지 인쇄) 글자만** 읽는다.

반드시 무시할 것:
- 연필·볼펜·사인펜으로 직접 쓴 손글씨
- 학생이 적어 넣은 답, 낙서, 밑줄, 동그라미, 체크
- 손글씨로 보이는 모든 글자

읽을 것:
- 인쇄된 한국어 지시문, 문제 번호, 보기(word bank)
- 인쇄된 영어 단어·문장
- 인쇄된 빈칸은 ____ 로 유지

위→아래, 왼쪽→오른쪽 순서로 가능한 한 전부 옮긴다.
흐릿해도 인쇄 활자면 추측해서 읽는다. 손글씨는 추측하지 말고 빈칸으로 둔다.

JSON만:
{"printedText":"옮긴 전체 글","hasPrintedText":true}`;

  const STRUCTURE_PROMPT = `너는 초등학생(한국, 3~6학년) 영어 숙제 도우미야.
아래에 **인쇄된 글만 옮긴 텍스트**가 있다. 사진이 있으면 인쇄된 레이아웃 확인용이다.
손글씨·학생이 쓴 답은 이미 빠져 있다. 절대 손글씨를 문제로 쓰지 마라.

할 일:
1) 학습지를 문제 번호 순서대로 나눈다.
2) 각 문제에 **인쇄되어 있는** 영어 단어만 고른다. 빈칸 정답, 손글씨 답은 넣지 않는다.
3) 각 영어 단어의 뜻은 초등 쉬운 한국어로 1개 또는 2개만.
4) 참고자료 인쇄 글이 있으면 그 뜻을 우선한다.
5) 힌트 2개. 생각의 방향만. 정답 금지.

힌트 절대 금지:
- 정답 영어 단어, 한국어 정답, 빈칸에 넣을 말
- 철자, 첫 글자, 글자 수
- 보기에서 특정 단어를 가리키기
- 문장 전체를 완성해 주기

1단계 힌트: 문제 유형, 어디를 보면 좋은지, 품사 정도만.
2단계 힌트: 상황·문장 자리를 조금 더, 그래도 답은 말하지 않는다.

JSON만:
{
  "problems": [
    {
      "label": "1번",
      "whatToDo": "빈칸에 알맞은 말을 넣어요.",
      "englishBits": "I am ____.",
      "words": [{ "en": "happy", "meanings": ["행복한"] }],
      "hint1": "1단계 힌트",
      "hint2": "2단계 힌트"
    }
  ]
}`;

  const state = {
    captureMode: "homework",
    homeworkPrint: "",
    homeworkColor: "",
    referencePrint: "",
    referenceColor: "",
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

  function setLoading(title, text) {
    $("loadingTitle").textContent = title;
    $("loadingText").textContent = text;
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.remove("show");
    }, 2400);
  }

  function dataUrlToInline(dataUrl) {
    const parts = String(dataUrl || "").split(",");
    const header = parts[0] || "";
    const data = parts[1] || "";
    const mime = (header.match(/data:(.*?);/) || [])[1] || "image/jpeg";
    return { mimeType: mime, data: data };
  }

  function imagePart(dataUrl) {
    const inline = dataUrlToInline(dataUrl);
    return { inlineData: { mimeType: inline.mimeType, data: inline.data } };
  }

  function loadViaElement(file) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("image"));
      };
      img.src = url;
    });
  }

  async function loadOrientedSource(file) {
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (e1) {
        try {
          return await createImageBitmap(file);
        } catch (e2) {}
      }
    }
    return loadViaElement(file);
  }

  function drawToJpeg(source, options) {
    const max = options.max || 2200;
    const sw = source.width || source.naturalWidth;
    const sh = source.height || source.naturalHeight;
    const scale = Math.min(1, max / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (options.enhance) {
      ctx.filter = "contrast(1.45) brightness(1.08) saturate(0.15)";
    }
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    return canvas.toDataURL("image/jpeg", options.quality || 0.92);
  }

  async function preparePhotos(file) {
    const source = await loadOrientedSource(file);
    const color = drawToJpeg(source, { max: 2200, quality: 0.92, enhance: false });
    const print = drawToJpeg(source, { max: 2400, quality: 0.93, enhance: true });
    if (source.close) source.close();
    return { color: color, print: print };
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
    const finish =
      data && data.candidates && data.candidates[0] && data.candidates[0].finishReason;
    if (finish === "SAFETY") return "";
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

  async function callGemini(parts, options) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("key");
    options = options || {};
    let lastErr = null;

    const configs = [];
    const base = {
      temperature: options.temperature == null ? 0.15 : options.temperature,
      maxOutputTokens: options.maxOutputTokens || 8192,
    };
    if (options.json) {
      configs.push(Object.assign({}, base, { responseMimeType: "application/json", mediaResolution: "MEDIA_RESOLUTION_HIGH" }));
      configs.push(Object.assign({}, base, { mediaResolution: "MEDIA_RESOLUTION_HIGH" }));
    } else {
      configs.push(Object.assign({}, base, { mediaResolution: "MEDIA_RESOLUTION_HIGH" }));
      configs.push(base);
    }

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
              safetySettings: SAFETY_OFF,
              generationConfig: configs[c],
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            lastErr = data.error && data.error.message ? data.error.message : "api";
            if (/API_KEY_INVALID|API key not valid|provided API key/i.test(String(lastErr))) {
              throw new Error("key");
            }
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
          if (lastErr === "key") throw e;
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

  function extractEnglishWords(text) {
    const stop = {
      a: 1,
      an: 1,
      the: 1,
      i: 1,
      am: 1,
      is: 1,
      are: 1,
      to: 1,
      of: 1,
      in: 1,
      on: 1,
      at: 1,
      it: 1,
      my: 1,
      me: 1,
      we: 1,
      you: 1,
      he: 1,
      she: 1,
      and: 1,
      or: 1,
      for: 1,
      with: 1,
      this: 1,
      that: 1,
      be: 1,
      do: 1,
      did: 1,
      not: 1,
      no: 1,
      yes: 1,
    };
    const seen = {};
    const words = [];
    const matches = String(text || "").replace(/_+/g, " ").match(/[A-Za-z][A-Za-z'-]{1,}/g) || [];
    matches.forEach(function (raw) {
      const en = raw.replace(/^'+|'+$/g, "");
      const key = en.toLowerCase();
      if (en.length < 2 || stop[key] || seen[key]) return;
      seen[key] = true;
      words.push({ en: en, meanings: ["(뜻을 학습지·참고자료에서 찾아 보세요)"] });
    });
    return words.slice(0, 12);
  }

  function fallbackProblemsFromText(printedText) {
    const text = String(printedText || "").trim();
    if (text.length < 8) return [];
    const chunks = text.split(/(?=^\s*\d+\s*[.)]\s*)/m).filter(function (s) {
      return s.trim().length > 0;
    });
    const parts = chunks.length >= 2 ? chunks : [text];
    return parts.map(function (chunk, i) {
      const labelMatch = chunk.match(/^\s*(\d+)\s*[.)]/);
      const problem = {
        label: labelMatch ? labelMatch[1] + "번" : i + 1 + "번",
        whatToDo: "인쇄된 문제를 보고 풀어 보세요.",
        englishBits: chunk.trim().slice(0, 500),
        words: extractEnglishWords(chunk),
        hint1: "",
        hint2: "",
      };
      problem.hint1 = SAFE_HINTS[1];
      problem.hint2 = SAFE_HINTS[2];
      return problem;
    });
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
        if (!problem.words.length) problem.words = extractEnglishWords(problem.englishBits);
        problem.hint1 = sanitizeHint(p.hint1, problem, 1);
        problem.hint2 = sanitizeHint(p.hint2, problem, 2);
        return problem;
      })
      .filter(function (p) {
        return p.whatToDo || p.englishBits || p.words.length;
      });
  }

  function photoParts(printUrl, colorUrl) {
    const parts = [];
    if (printUrl) parts.push(imagePart(printUrl));
    if (colorUrl && colorUrl !== printUrl) parts.push(imagePart(colorUrl));
    return parts;
  }

  async function ocrPrintedText() {
    const images = photoParts(state.homeworkPrint, state.homeworkColor);
    if (state.referencePrint) {
      images.push(imagePart(state.referencePrint));
    } else if (state.referenceColor) {
      images.push(imagePart(state.referenceColor));
    }

    const attempts = [
      { label: "homework-print", parts: [imagePart(state.homeworkPrint), { text: OCR_PROMPT + "\n\n첫 사진은 글자 읽기용(대비를 높인 학습지)이다." }] },
      {
        label: "both",
        parts: images.concat([
          {
            text:
              OCR_PROMPT +
              "\n\n사진은 학습지다. 대비를 높인 사진과 원본이 있을 수 있다. 인쇄 활자만 옮겨라.",
          },
        ]),
      },
    ];

    let lastErr = null;
    for (let i = 0; i < attempts.length; i++) {
      try {
        const text = await callGemini(attempts[i].parts, { json: true, temperature: 0, maxOutputTokens: 8192 });
        const parsed = parseJsonFromText(text);
        const printed = String(parsed.printedText || parsed.text || "").trim();
        if (printed.length >= 8) return printed;
        lastErr = "short-ocr";
      } catch (e) {
        lastErr = e.message || "ocr";
      }
    }
    throw new Error(lastErr || "ocr");
  }

  async function structureProblems(printedText) {
    const parts = [
      {
        text:
          STRUCTURE_PROMPT +
          "\n\n--- 인쇄된 글 (손글씨 제외) ---\n" +
          printedText +
          "\n--- 끝 ---",
      },
    ];
    if (state.homeworkColor) parts.push(imagePart(state.homeworkColor));
    if (state.referenceColor) parts.push(imagePart(state.referenceColor));

    const text = await callGemini(parts, { json: true, temperature: 0.2, maxOutputTokens: 8192 });
    const parsed = parseJsonFromText(text);
    const problems = normalizeProblems(parsed);
    if (!problems.length) throw new Error("empty-problems");
    return problems;
  }

  async function analyzeHomework() {
    setLoading("인쇄된 글자를 읽고 있어요", "손글씨는 건너뛰고, 학습지에 인쇄된 글만 찾고 있어요.");
    const printedText = await ocrPrintedText();

    setLoading("문제를 나누고 있어요", "단어 뜻과 힌트를 준비하고 있어요. 조금만 기다려 주세요.");
    try {
      return await structureProblems(printedText);
    } catch (e) {
      const fallback = fallbackProblemsFromText(printedText);
      if (!fallback.length) throw e;
      return fallback;
    }
  }

  function startCapture(mode, fromAlbum) {
    state.captureMode = mode;
    const input = fromAlbum ? $("albumInput") : $("cameraInput");
    input.value = "";
    input.click();
  }

  async function onPhotoPicked(file) {
    if (!file) return;
    try {
      const photos = await preparePhotos(file);
      if (state.captureMode === "homework") {
        state.homeworkPrint = photos.print;
        state.homeworkColor = photos.color;
        $("homeworkThumbWrap").innerHTML = '<img alt="찍은 학습지" src="' + photos.color + '" />';
        showScreen("refScreen");
        return;
      }
      state.referencePrint = photos.print;
      state.referenceColor = photos.color;
      await runAnalysis();
    } catch (e) {
      toast("사진을 읽지 못했어요. 다시 찍어 주세요.");
    }
  }

  function friendlyError(err) {
    const msg = String((err && err.message) || err || "");
    if (msg.indexOf("API key") >= 0 || msg === "key") {
      return "API 키가 없거나 잘못됐어요. 오른쪽 위 설정에서 다시 저장해 주세요.";
    }
    if (/quota|429|resource exhausted/i.test(msg)) {
      return "지금은 조금 바빠요. 잠시 후 다시 눌러 주세요.";
    }
    return "인쇄된 글자를 아직 못 읽었어요. 학습지 전체가 나오게 다시 찍어 주세요. 손글씨는 읽지 않아요.";
  }

  async function runAnalysis() {
    showScreen("loadingScreen");
    setLoading("학습지를 준비하고 있어요", "사진을 선명하게 만든 뒤 인쇄된 글자를 읽을게요.");
    try {
      state.problems = await analyzeHomework();
      state.index = 0;
      state.hintLevel = 0;
      renderStudy();
      showScreen("studyScreen");
    } catch (e) {
      $("errorText").textContent = friendlyError(e);
      showScreen("errorScreen");
    }
  }

  function renderWords(problem) {
    const ul = $("wordList");
    ul.innerHTML = "";
    if (!problem.words.length) {
      const li = document.createElement("li");
      li.innerHTML =
        '<span class="word-ko">이 문제에는 미리 알려 줄 인쇄된 영어 단어가 거의 없어요. 학습지를 보고 생각해 보세요.</span>';
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
    state.homeworkPrint = "";
    state.homeworkColor = "";
    state.referencePrint = "";
    state.referenceColor = "";
    state.problems = [];
    state.index = 0;
    state.hintLevel = 0;
    $("homeworkThumbWrap").innerHTML = "";
    $("cameraInput").value = "";
    $("albumInput").value = "";
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
      startCapture("homework", false);
    });

    $("homeworkAlbumBtn").addEventListener("click", function () {
      if (!getApiKey()) {
        showScreen("setupScreen");
        toast("먼저 부모님께 키 저장을 부탁해요.");
        return;
      }
      startCapture("homework", true);
    });

    $("refPhotoBtn").addEventListener("click", function () {
      startCapture("reference", false);
    });

    $("refAlbumBtn").addEventListener("click", function () {
      startCapture("reference", true);
    });

    $("refSkipBtn").addEventListener("click", function () {
      state.referencePrint = "";
      state.referenceColor = "";
      runAnalysis();
    });

    $("restartBtn").addEventListener("click", resetAll);
    $("retryBtn").addEventListener("click", resetAll);

    function onFile(e) {
      const file = e.target.files && e.target.files[0];
      onPhotoPicked(file);
    }
    $("cameraInput").addEventListener("change", onFile);
    $("albumInput").addEventListener("change", onFile);
  }

  bind();
  showHomeOrSetup();
})();
