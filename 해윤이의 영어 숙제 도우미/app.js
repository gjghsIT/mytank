(function () {
  "use strict";

  const API_KEY_STORAGE = "haeyoon_english_helper_gemini_key";
  const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash"];

  const OCR_PROMPT =
    "이 사진은 초등 영어 학습지다.\n" +
    "인쇄된 활자(교과서·학습지에 찍힌 글)만 위부터 아래로 그대로 옮겨 적어라.\n" +
    "연필·볼펜 손글씨, 학생이 쓴 답, 낙서, 손그림 동그라미는 무시하라.\n" +
    "인쇄된 빈칸은 ____ 로 남겨라.\n" +
    "설명, JSON, 인사 없이 옮긴 글만 출력하라.";

  const STRUCTURE_PROMPT = `너는 초등학생 영어 숙제 도우미야.
아래 글은 학습지에서 인쇄된 글만 옮긴 것이다. 손글씨는 이미 빠져 있다.

할 일:
1) 문제 번호 순서로 나눈다.
2) 각 문제에 인쇄된 영어 단어만 고른다. 빈칸 정답은 넣지 않는다.
3) 뜻은 초등 쉬운 한국어로 1~2개만.
4) 힌트 2개. 정답·철자·빈칸에 넣을 말은 쓰지 않는다.
1단계: 문제 유형, 품사, 어디를 보면 좋은지만.
2단계: 상황·문장 자리만 조금 더.

JSON만:
{"problems":[{"label":"1번","whatToDo":"빈칸에 알맞은 말을 넣어요.","englishBits":"I am ____.","words":[{"en":"happy","meanings":["행복한"]}],"hint1":"1단계","hint2":"2단계"}]}`;

  const state = {
    captureMode: "homework",
    homeworkImage: "",
    referenceImage: "",
    lastError: "",
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

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = function () {
        reject(new Error("image"));
      };
      reader.readAsDataURL(file);
    });
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

  function drawToJpeg(source, max, quality) {
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
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  async function prepareImage(file) {
    const type = String(file.type || "").toLowerCase();
    const okType = type === "image/jpeg" || type === "image/jpg" || type === "image/png" || type === "image/webp";
    if (okType && file.size > 0 && file.size <= 3.5 * 1024 * 1024) {
      return fileToDataUrl(file);
    }
    const source = await loadOrientedSource(file);
    const jpeg = drawToJpeg(source, 2000, 0.9);
    if (source.close) source.close();
    return jpeg;
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

  function looksLikeWorksheetText(text) {
    const t = String(text || "").trim();
    if (t.length < 8) return false;
    if (/sorry|cannot|can't read|unable to|이미지를 읽을|글자를 찾을 수 없|보이지 않|no (visible )?text/i.test(t)) {
      return false;
    }
    if (/^\s*\{/.test(t) && t.indexOf("printedText") < 0 && t.indexOf("problems") < 0) return false;
    return /[A-Za-z가-힣]/.test(t);
  }

  function extractOcrText(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    try {
      const parsed = parseJsonFromText(text);
      const printed = String(parsed.printedText || parsed.text || "").trim();
      if (printed.length >= 8) return printed;
    } catch (e) {}
    if (looksLikeWorksheetText(text)) return text;
    return "";
  }

  function geminiText(data) {
    const cand = data && data.candidates && data.candidates[0];
    if (!cand) return "";
    const parts = cand.content && cand.content.parts;
    if (!parts || !parts.length) return "";
    return parts
      .filter(function (p) {
        return !p.thought;
      })
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
    let lastErr = "";

    for (let i = 0; i < GEMINI_MODELS.length; i++) {
      const model = GEMINI_MODELS[i];
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        encodeURIComponent(apiKey);
      const generationConfig = {
        temperature: options.temperature == null ? 0.1 : options.temperature,
        maxOutputTokens: options.maxOutputTokens || 8192,
      };
      if (model.indexOf("2.5") >= 0) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      const ctrl = new AbortController();
      const timer = setTimeout(function () {
        ctrl.abort();
      }, 28000);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: parts }],
            generationConfig: generationConfig,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          lastErr = data.error && data.error.message ? data.error.message : "api " + res.status;
          if (/API_KEY_INVALID|API key not valid|provided API key/i.test(lastErr)) {
            throw new Error("key");
          }
          continue;
        }
        const text = geminiText(data);
        if (!text) {
          lastErr = candFinish(data) || "empty";
          continue;
        }
        return text;
      } catch (e) {
        if (e.message === "key") throw e;
        lastErr = e.name === "AbortError" ? "timeout" : e.message || "net";
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(lastErr || "api");
  }

  function candFinish(data) {
    const reason = data && data.candidates && data.candidates[0] && data.candidates[0].finishReason;
    return reason ? String(reason) : "";
  }

  function tesseractPrintedOnly(data) {
    const lines = (data && data.lines) || [];
    if (!lines.length) return String((data && data.text) || "").trim();
    const out = [];
    lines.forEach(function (line) {
      const words = (line.words || []).filter(function (w) {
        const t = String(w.text || "").trim();
        return t && w.confidence >= 58;
      });
      if (!words.length) return;
      out.push(
        words
          .map(function (w) {
            return w.text;
          })
          .join(" ")
      );
    });
    const joined = out.join("\n").trim();
    if (joined.length >= 8) return joined;
    return String((data && data.text) || "").trim();
  }

  async function ocrWithTesseract(dataUrl) {
    if (!window.Tesseract || !window.Tesseract.createWorker) return "";
    async function run(langs) {
      const worker = await window.Tesseract.createWorker(langs, 1, {
        logger: function (m) {
          if (m.status === "recognizing text") {
            setLoading("인쇄된 글자를 읽고 있어요", "학습지 활자를 살펴보는 중 " + Math.round((m.progress || 0) * 100) + "%");
          } else if (m.status && m.status.indexOf("loading") >= 0) {
            setLoading("글자 읽는 준비를 하고 있어요", "처음 한 번은 조금 걸릴 수 있어요.");
          }
        },
      });
      try {
        const res = await worker.recognize(dataUrl);
        return tesseractPrintedOnly(res.data);
      } finally {
        await worker.terminate();
      }
    }
    try {
      return await run("eng+kor");
    } catch (e1) {
      try {
        return await run("eng");
      } catch (e2) {
        state.lastError = e2.message || e1.message || "tesseract";
        return "";
      }
    }
  }

  async function ocrWithGemini(dataUrl) {
    const parts = [imagePart(dataUrl), { text: OCR_PROMPT }];
    const raw = await callGemini(parts, { temperature: 0, maxOutputTokens: 8192 });
    return extractOcrText(raw);
  }

  function betterText(a, b) {
    const ta = String(a || "").trim();
    const tb = String(b || "").trim();
    if (ta.length >= tb.length) return ta;
    return tb;
  }

  async function ocrPrintedText() {
    let geminiTextResult = "";
    let tessText = "";

    setLoading("인쇄된 글자를 읽고 있어요", "학습지의 활자만 찾고 있어요. 손글씨는 건너뛰어요.");
    try {
      geminiTextResult = await ocrWithGemini(state.homeworkImage);
    } catch (e) {
      state.lastError = e.message || "gemini-ocr";
    }

    if (!looksLikeWorksheetText(geminiTextResult)) {
      setLoading("한 번 더 읽고 있어요", "인쇄된 글자를 천천히 살펴보고 있어요.");
      tessText = await ocrWithTesseract(state.homeworkImage);
    }

    let printed = betterText(geminiTextResult, tessText);

    if (state.referenceImage && looksLikeWorksheetText(printed)) {
      try {
        const refG = await ocrWithGemini(state.referenceImage);
        if (looksLikeWorksheetText(refG)) printed += "\n\n[참고자료]\n" + refG;
      } catch (e) {
        const refT = await ocrWithTesseract(state.referenceImage);
        if (looksLikeWorksheetText(refT)) printed += "\n\n[참고자료]\n" + refT;
      }
    }

    if (!looksLikeWorksheetText(printed)) {
      throw new Error(state.lastError || "ocr");
    }
    return printed;
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
      if (["the", "and", "for", "you", "are", "this", "that", "with", "from", "your"].indexOf(w) >= 0) continue;
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
        englishBits: chunk.trim().slice(0, 800),
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

  async function structureProblems(printedText) {
    const raw = await callGemini(
      [
        {
          text: STRUCTURE_PROMPT + "\n\n--- 인쇄된 글 ---\n" + printedText + "\n--- 끝 ---",
        },
      ],
      { temperature: 0.2, maxOutputTokens: 8192 }
    );
    const parsed = parseJsonFromText(raw);
    const problems = normalizeProblems(parsed);
    if (!problems.length) throw new Error("empty-problems");
    return problems;
  }

  async function analyzeHomework() {
    const printedText = await ocrPrintedText();
    setLoading("문제를 나누고 있어요", "단어 뜻과 힌트를 준비하고 있어요.");
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
      const dataUrl = await prepareImage(file);
      if (state.captureMode === "homework") {
        state.homeworkImage = dataUrl;
        $("homeworkThumbWrap").innerHTML = '<img alt="찍은 학습지" src="' + dataUrl + '" />';
        showScreen("refScreen");
        return;
      }
      state.referenceImage = dataUrl;
      await runAnalysis();
    } catch (e) {
      toast("사진을 읽지 못했어요. 다시 찍어 주세요.");
    }
  }

  function friendlyError(err) {
    const msg = String((err && err.message) || err || "");
    if (msg === "key" || /API key/i.test(msg)) {
      return "API 키가 없거나 잘못됐어요. 오른쪽 위 설정에서 다시 저장해 주세요.";
    }
    if (/quota|429|resource exhausted/i.test(msg)) {
      return "지금은 조금 바빠요. 잠시 후 다시 눌러 주세요.";
    }
    return "인쇄된 글자를 아직 못 읽었어요. 학습지 전체가 나오게 다시 찍어 주세요.";
  }

  async function runAnalysis() {
    showScreen("loadingScreen");
    setLoading("학습지를 준비하고 있어요", "인쇄된 글자만 읽을게요. 손글씨는 읽지 않아요.");
    state.lastError = "";
    try {
      state.problems = await analyzeHomework();
      state.index = 0;
      state.hintLevel = 0;
      renderStudy();
      showScreen("studyScreen");
    } catch (e) {
      $("errorText").textContent = friendlyError(e);
      $("errorDetail").textContent = String((e && e.message) || state.lastError || "");
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
    state.homeworkImage = "";
    state.referenceImage = "";
    state.problems = [];
    state.index = 0;
    state.hintLevel = 0;
    state.lastError = "";
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
      state.referenceImage = "";
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
