(function () {
  "use strict";

  const TOPIC_KEYWORDS = {
    academic: ["시험", "성적", "공부", "수업", "과제", "숙제", "학업", "모의고사", "내신", "등급", "공부법"],
    career: ["진로", "대학", "취업", "전공", "꿈", "진학", "입시", "적성", "희망"],
    relationship: ["친구", "관계", "갈등", "왕따", "소외", "친구관계", "동급", "선후배"],
    family: ["부모", "가정", "집", "형제", "가족", "엄마", "아빠", "부모님"],
    emotion: ["스트레스", "불안", "우울", "힘들", "걱정", "외로", "슬프", "화가", "짜증", "무기력"],
    behavior: ["지각", "결석", "수업", "태도", "규칙", "휴대폰", "게임", "수면", "잠"],
    health: ["건강", "아프", "병", "수면", "피로", "컨디션"],
  };

  const EXAMPLE_PHRASES = {
    academic: [
      "공부할 때 가장 막히는 과목이나 단원이 있니?",
      "시험 준비는 어떤 방식으로 하고 있는지 이야기해 줄래?",
      "목표 성적을 정했다면, 그걸 위해 지금 할 수 있는 한 가지는 뭐라고 생각하니?",
    ],
    career: [
      "앞으로 어떤 분야에 관심이 있는지 조금 더 이야기해 볼까?",
      "진로를 정할 때 가장 중요하게 생각하는 기준이 뭐니?",
      "관심 있는 직업이나 전공을 탐색해 본 적이 있니?",
    ],
    relationship: [
      "친구들과 있을 때 어떤 기분이 드니?",
      "갈등이 생겼을 때 보통 어떻게 해결하려고 하니?",
      "편하게 이야기할 수 있는 친구가 있니?",
    ],
    family: [
      "집에서 대화는 주로 어떤 분위기니?",
      "부모님과 이야기할 때 어려운 점이 있니?",
      "가정에서 도움이 필요하다고 느끼는 부분이 있니?",
    ],
    emotion: [
      "요즘 마음이 무거울 때는 보통 어떻게 풀니?",
      "힘들다고 느낄 때 누구에게 이야기해?",
      "스트레스를 줄이기 위해 시도해 본 방법이 있니?",
    ],
    behavior: [
      "수업 시간에 집중하기 어려운 이유가 있을까?",
      "생활 습관 중 바꾸고 싶은 부분이 있니?",
      "학교 규칙을 지키는 데 어려움이 있다면 어떤 점이니?",
    ],
    health: [
      "수면이나 식사는 규칙적으로 하고 있니?",
      "몸 상태가 학교생활에 영향을 주고 있다고 느끼니?",
      "컨디션이 안 좋을 때 어떻게 회복하니?",
    ],
    general: [
      "지난번 상담 이후에 달라진 점이 있니?",
      "앞으로 한 달 동안 작은 목표 하나를 정해 볼까?",
      "도움이 필요할 때 언제든 찾아와도 괜찮다는 걸 기억해 줘.",
      "오늘 이야기한 내용 중 가장 마음에 남는 부분이 뭐니?",
    ],
  };

  const FILLER_PATTERN = /^(음|어|그|저|아|네|예|응|뭐|이|그니까|그래서|근데|그런데)\s*/g;

  const els = {
    studentName: document.getElementById("studentName"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    statusBar: document.getElementById("statusBar"),
    statusText: document.getElementById("statusText"),
    statusDot: document.getElementById("statusDot"),
    timer: document.getElementById("timer"),
    resultSection: document.getElementById("resultSection"),
    audioPlayback: document.getElementById("audioPlayback"),
    downloadLink: document.getElementById("downloadLink"),
    summarySection: document.getElementById("summarySection"),
    summaryText: document.getElementById("summaryText"),
    examplesSection: document.getElementById("examplesSection"),
    examplesList: document.getElementById("examplesList"),
  };

  let mediaRecorder = null;
  let audioChunks = [];
  let recognition = null;
  let transcriptParts = [];
  let timerInterval = null;
  let startTime = null;
  let isRecording = false;

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function startTimer() {
    startTime = Date.now();
    els.timer.textContent = "00:00";
    timerInterval = setInterval(function () {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      els.timer.textContent = formatTime(elapsed);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function setStatus(text, recording) {
    els.statusText.textContent = text;
    els.statusBar.classList.toggle("recording", recording);
  }

  function hideResults() {
    els.resultSection.classList.add("hidden");
    els.summarySection.classList.add("hidden");
    els.examplesSection.classList.add("hidden");
  }

  function showResults() {
    els.resultSection.classList.remove("hidden");
    els.summarySection.classList.remove("hidden");
    els.examplesSection.classList.remove("hidden");
  }

  function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function initRecognition() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = function (event) {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) transcriptParts.push(text);
        }
      }
    };

    rec.onerror = function (event) {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("음성 인식 오류:", event.error);
      }
    };

    rec.onend = function () {
      if (isRecording) {
        try {
          rec.start();
        } catch (e) {
          /* 이미 실행 중 */
        }
      }
    };

    return rec;
  }

  function splitSentences(text) {
    return text
      .split(/(?<=[.!?…])\s+|[。！？]\s*|\n+/)
      .map(function (s) {
        return s.replace(FILLER_PATTERN, "").trim();
      })
      .filter(function (s) {
        return s.length >= 6;
      });
  }

  function detectTopics(text) {
    const found = [];
    const lower = text.toLowerCase();

    Object.keys(TOPIC_KEYWORDS).forEach(function (topic) {
      const matched = TOPIC_KEYWORDS[topic].some(function (kw) {
        return lower.includes(kw);
      });
      if (matched) found.push(topic);
    });

    return found.length ? found : ["general"];
  }

  function summarizeTranscript(fullText) {
    const sentences = splitSentences(fullText);

    if (!sentences.length) {
      return ["상담 내용이 충분히 인식되지 않았습니다. 녹음 파일을 확인해 주세요."];
    }

    const topics = detectTopics(fullText);
    const bullets = [];
    const used = new Set();

    topics.forEach(function (topic) {
      const keywords = TOPIC_KEYWORDS[topic] || [];
      const related = sentences.filter(function (sentence) {
        return keywords.some(function (kw) {
          return sentence.includes(kw);
        });
      });

      related.slice(0, 2).forEach(function (sentence) {
        if (!used.has(sentence)) {
          used.add(sentence);
          bullets.push(sentence);
        }
      });
    });

    sentences.forEach(function (sentence) {
      if (bullets.length >= 6) return;
      if (!used.has(sentence) && sentence.length >= 10) {
        used.add(sentence);
        bullets.push(sentence);
      }
    });

    if (!bullets.length) {
      bullets.push(sentences[0]);
    }

    return bullets.slice(0, 6);
  }

  function buildExamplePhrases(topics, summaryBullets) {
    const phrases = [];
    const seen = new Set();

    topics.forEach(function (topic) {
      const pool = EXAMPLE_PHRASES[topic] || [];
      pool.slice(0, 2).forEach(function (phrase) {
        if (!seen.has(phrase)) {
          seen.add(phrase);
          phrases.push(phrase);
        }
      });
    });

    EXAMPLE_PHRASES.general.forEach(function (phrase) {
      if (phrases.length >= 5) return;
      if (!seen.has(phrase)) {
        seen.add(phrase);
        phrases.push(phrase);
      }
    });

    if (summaryBullets.length && phrases.length < 5) {
      phrases.push("지난 상담에서 \"" + summaryBullets[0].slice(0, 30) + "...\"라고 했는데, 그 이후는 어땠니?");
    }

    return phrases.slice(0, 5);
  }

  function formatSummary(items) {
    return items.map(function (item) {
      return "- " + item;
    }).join("\n");
  }

  function renderList(listEl, items) {
    listEl.innerHTML = "";
    items.forEach(function (item) {
      const li = document.createElement("li");
      li.textContent = item;
      listEl.appendChild(li);
    });
  }

  function saveAudioFile(blob, studentName) {
    const now = new Date();
    const dateStr =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const safeName = studentName.replace(/[\\/:*?"<>|]/g, "_") || "학생";
    const filename = "상담_" + safeName + "_" + dateStr + ".webm";

    const url = URL.createObjectURL(blob);
    els.audioPlayback.src = url;
    els.downloadLink.href = url;
    els.downloadLink.download = filename;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function processResults(blob, studentName) {
    saveAudioFile(blob, studentName);

    const fullText = transcriptParts.join(" ").trim();
    const summary = summarizeTranscript(fullText);
    const topics = detectTopics(fullText);
    const examples = buildExamplePhrases(topics, summary);

    els.summaryText.textContent = formatSummary(summary);
    renderList(els.examplesList, examples);
    showResults();
  }

  async function startCounseling() {
    const name = els.studentName.value.trim();
    if (!name) {
      alert("학생 이름을 입력해 주세요.");
      els.studentName.focus();
      return;
    }

    hideResults();
    transcriptParts = [];
    audioChunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.start(1000);
      isRecording = true;

      recognition = initRecognition();
      if (recognition) {
        recognition.start();
      } else {
        alert("이 브라우저는 음성 인식을 지원하지 않습니다. 녹음은 가능하지만 요약 기능이 제한됩니다.\n(Chrome 또는 Edge 권장)");
      }

      els.startBtn.disabled = true;
      els.stopBtn.disabled = false;
      els.studentName.disabled = true;
      setStatus(name + " 학생 상담 녹음 중", true);
      startTimer();
    } catch (err) {
      alert("마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.");
      console.error(err);
    }
  }

  function stopCounseling() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    const studentName = els.studentName.value.trim();
    isRecording = false;
    stopTimer();

    if (recognition) {
      recognition.stop();
      recognition = null;
    }

    mediaRecorder.onstop = function () {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      processResults(blob, studentName);

      mediaRecorder.stream.getTracks().forEach(function (track) {
        track.stop();
      });
      mediaRecorder = null;
    };

    mediaRecorder.stop();

    els.startBtn.disabled = false;
    els.stopBtn.disabled = true;
    els.studentName.disabled = false;
    setStatus("상담 완료 · 음성 파일 저장됨", false);
  }

  els.startBtn.addEventListener("click", startCounseling);
  els.stopBtn.addEventListener("click", stopCounseling);
})();
