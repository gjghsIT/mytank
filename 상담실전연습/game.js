(function () {
  "use strict";

  const MAX_TURNS = 30;

  const els = {};
  let state = {
    screen: "home",
    caseId: null,
    caseData: null,
    phaseIndex: 0,
    turnCount: 0,
    history: [],
    isEnded: false,
    closureReason: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    [
      "homeScreen",
      "gameScreen",
      "resultScreen",
      "caseGrid",
      "caseTitle",
      "caseMeta",
      "caseSituation",
      "chatLog",
      "teacherInput",
      "chatForm",
      "sendBtn",
      "endBtn",
      "turnCounter",
      "typingIndicator",
      "scoreCircle",
      "scoreValue",
      "gradeLabel",
      "overallSummary",
      "feedbackStrengths",
      "feedbackImprovements",
      "legalTitle",
      "legalBody",
      "legalBulletTitle",
      "legalBullets",
      "exampleCompare",
      "apiKeyInput",
      "apiKeySaveBtn",
      "apiKeyStatus",
      "restartBtn",
      "homeBtn",
      "toast",
    ].forEach(function (id) {
      els[id] = $(id);
    });
  }

  function init() {
    cacheElements();
    renderCaseGrid();
    bindEvents();
  }

  function bindEvents() {
    if (els.chatForm) {
      els.chatForm.addEventListener("submit", function (e) {
        e.preventDefault();
        sendTeacherMessage();
      });
    }

    if (els.sendBtn) {
      els.sendBtn.addEventListener("click", function (e) {
        e.preventDefault();
        sendTeacherMessage();
      });
    }

    if (els.teacherInput) {
      els.teacherInput.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.keyCode !== 13) return;
        if (e.shiftKey || e.isComposing) return;
        e.preventDefault();
        sendTeacherMessage();
      });
    }

    if (els.endBtn) {
      els.endBtn.addEventListener("click", function () {
        endCounseling("manual");
      });
    }
    if (els.restartBtn) {
      els.restartBtn.addEventListener("click", function () {
        if (state.caseId) startCase(state.caseId);
      });
    }
    if (els.homeBtn) {
      els.homeBtn.addEventListener("click", showHome);
    }
  }

  function getClientMeta(caseData) {
    if (caseData.clientRole === "parent") {
      return {
        display: caseData.studentName + " · " + (caseData.clientLabel || "학부모"),
        speakerName: caseData.studentName,
        speakerRole: "parent",
        typingText: "AI 학부모가 답변하는 중…",
      };
    }
    return {
      display: caseData.studentName + " · " + caseData.grade,
      speakerName: caseData.studentName,
      speakerRole: "student",
      typingText: "AI 학생이 답변하는 중…",
    };
  }

  function renderCaseGrid() {
    els.caseGrid.innerHTML = "";
    COUNSELING_CASES.forEach(function (c) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "case-card";
      const metaText =
        c.clientRole === "parent"
          ? "학부모 · " + c.category
          : (c.gender === "male" ? "남학생" : "여학생") + " · " + c.grade;
      card.innerHTML =
        '<span class="case-badge">' +
        escapeHtml(c.category) +
        "</span>" +
        "<h3>사례 " +
        c.id +
        ". " +
        escapeHtml(c.title) +
        "</h3>" +
        "<p>" +
        escapeHtml(metaText) +
        "</p>" +
        '<p class="case-preview">' +
        escapeHtml(c.situation.slice(0, 60)) +
        "…</p>";
      card.addEventListener("click", function () {
        startCase(c.id);
      });
      els.caseGrid.appendChild(card);
    });
  }

  function startCase(caseId) {
    const template = COUNSELING_CASES.find(function (c) {
      return c.id === caseId;
    });
    if (!template) return;

    const caseData = assignRandomClient(template);

    state = {
      screen: "game",
      caseId: caseId,
      caseData: caseData,
      phaseIndex: 0,
      turnCount: 0,
      history: [],
      isEnded: false,
      closureReason: null,
    };

    els.caseTitle.textContent = "사례 " + caseData.id + ". " + caseData.title;
    els.caseMeta.textContent = getClientMeta(caseData).display + " · " + caseData.category;
    els.caseSituation.textContent = caseData.situation;
    els.chatLog.innerHTML = "";
    els.teacherInput.value = "";
    els.teacherInput.disabled = false;
    els.sendBtn.disabled = false;
    els.endBtn.disabled = false;

    showScreen("game");
    updateTurnCounter();

    const client = getClientMeta(state.caseData);
    els.typingIndicator.innerHTML =
      "<span></span><span></span><span></span> " + client.typingText;

    addMessage("student", client.speakerName, caseData.openingMessage);
    state.history.push({
      role: "student",
      text: caseData.openingMessage,
      phaseIndex: 0,
    });

    setTimeout(function () {
      if (els.teacherInput) els.teacherInput.focus();
    }, 100);
  }

  function sendTeacherMessage() {
    if (state.isEnded || state.screen !== "game") return;

    const input = els.teacherInput || document.getElementById("teacherInput");
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
      showToast("교사 멘트를 입력해 주세요.");
      return;
    }

    if (state.turnCount >= MAX_TURNS) {
      showToast("최대 30회 대화에 도달했습니다.");
      endCounseling("maxTurns");
      return;
    }

    try {
      const scored = window.CounselingEvaluator.scoreTeacherTurn(
        text,
        state.caseData,
        state.turnCount
      );
      state.turnCount++;

      addMessage("teacher", "교사", text);
      state.history.push({
        role: "teacher",
        text: text,
        score: scored.turnScore,
        feedback: scored.feedback,
      });

      input.value = "";
      updateTurnCounter();

      input.disabled = true;
      if (els.sendBtn) els.sendBtn.disabled = true;
      showTyping(true);
      respondAsStudent(text);
    } catch (err) {
      console.error(err);
      input.disabled = false;
      if (els.sendBtn) els.sendBtn.disabled = false;
      showToast("전송 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.");
    }
  }

  async function respondAsStudent(teacherText) {
    try {
      const response = await window.CounselingEvaluator.generateStudentResponse(
        state.caseData,
        state.phaseIndex,
        teacherText,
        state.history
      );

      showTyping(false);
      state.phaseIndex = response.phaseIndex;

      const client = getClientMeta(state.caseData);
      addMessage("student", client.speakerName, response.message);
      state.history.push({
        role: "student",
        text: response.message,
        phaseIndex: response.phaseIndex,
      });

      els.teacherInput.disabled = false;
      els.sendBtn.disabled = false;
      els.teacherInput.focus();

      if (response.isClosure || response.forcedClosure) {
        const reason = response.forcedClosure ? "shutdown" : "natural";
        setTimeout(function () {
          endCounseling(reason);
        }, 800);
        return;
      }

      if (state.turnCount >= MAX_TURNS) {
        setTimeout(function () {
          endCounseling("maxTurns");
        }, 500);
      }
    } catch (err) {
      console.error(err);
      showTyping(false);
      // AI 실패 시 로컬 대본으로 대체하지 않음 — 교사 멘트는 유지, 재전송 유도
      if (state.history.length && state.history[state.history.length - 1].role === "teacher") {
        const last = state.history.pop();
        state.turnCount = Math.max(0, state.turnCount - 1);
        updateTurnCounter();
        if (els.teacherInput && last && last.text) {
          els.teacherInput.value = last.text;
        }
        // 마지막 교사 말풍선 제거
        const bubbles = els.chatLog && els.chatLog.querySelectorAll(".message-teacher");
        if (bubbles && bubbles.length) {
          const wrap = bubbles[bubbles.length - 1];
          if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
        }
      }
      els.teacherInput.disabled = false;
      els.sendBtn.disabled = false;
      showToast("AI 응답을 받지 못했습니다. 인터넷 연결 후 다시 전송해 주세요.");
      els.teacherInput.focus();
    }
  }

  function endCounseling(reason) {
    if (state.isEnded) return;
    state.isEnded = true;
    state.closureReason = reason;

    els.teacherInput.disabled = true;
    els.sendBtn.disabled = true;
    els.endBtn.disabled = true;

    const evaluation = window.CounselingEvaluator.buildFinalEvaluation(
      state.caseData,
      state.history,
      reason
    );

    renderResults(evaluation);
    showScreen("result");
  }

  function renderResults(ev) {
    els.scoreValue.textContent = ev.finalScore;
    els.gradeLabel.textContent = ev.grade.emoji + " " + ev.grade.label;
    els.scoreCircle.style.setProperty("--grade-color", ev.grade.color);

    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (ev.finalScore / 100) * circumference;
    els.scoreCircle.style.strokeDasharray = circumference;
    els.scoreCircle.style.strokeDashoffset = offset;

    if (els.overallSummary) {
      els.overallSummary.textContent = ev.overallSummary || "";
    }

    renderList(els.feedbackStrengths, ev.strengths || [], "good");
    renderList(els.feedbackImprovements, ev.improvements || [], "bad");

    const legal = ev.legalGrounds || {};
    if (els.legalTitle) els.legalTitle.textContent = legal.title || "법적·원칙 근거";
    if (els.legalBody) els.legalBody.textContent = legal.body || "";
    if (els.legalBulletTitle) {
      els.legalBulletTitle.textContent = legal.bulletTitle || "";
      els.legalBulletTitle.classList.toggle("hidden", !legal.bulletTitle);
    }
    if (els.legalBullets) {
      els.legalBullets.innerHTML = "";
      (legal.bullets || []).forEach(function (b) {
        const li = document.createElement("li");
        li.textContent = b;
        els.legalBullets.appendChild(li);
      });
    }

    els.exampleCompare.innerHTML =
      '<div class="example bad-example"><h4>피해야 할 멘트</h4><p>' +
      escapeHtml(ev.badExample || "") +
      '</p></div><div class="example good-example"><h4>권장 멘트</h4><p>' +
      escapeHtml(ev.goodExample || "") +
      "</p></div>";
  }

  function scoreClass(score) {
    if (score >= 80) return "high";
    if (score >= 60) return "mid";
    return "low";
  }

  function renderList(el, items, type) {
    el.innerHTML = "";
    if (!items || !items.length) {
      const li = document.createElement("li");
      li.className = type === "good" ? "item-good" : "item-bad";
      li.textContent =
        type === "good"
          ? "특별히 기록된 강점이 없습니다. 다음엔 공감·안전 공간부터 시도해 보세요."
          : "큰 금기 멘트는 없었습니다. 강의원고 권장 멘트를 참고해 더 다듬어 보세요.";
      el.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      const li = document.createElement("li");
      li.className = type === "good" ? "item-good" : "item-bad";
      li.textContent = item;
      el.appendChild(li);
    });
  }

  function addMessage(role, name, text) {
    const div = document.createElement("div");
    div.className = "message " + (role === "teacher" ? "message-teacher" : "message-student");

    div.innerHTML =
      '<div class="message-header"><span class="message-name">' +
      escapeHtml(name) +
      "</span></div>" +
      '<div class="message-body">' +
      escapeHtml(text) +
      "</div>";

    els.chatLog.appendChild(div);
    els.chatLog.scrollTop = els.chatLog.scrollHeight;
  }

  function showTyping(show) {
    els.typingIndicator.classList.toggle("hidden", !show);
    if (show) els.chatLog.scrollTop = els.chatLog.scrollHeight;
  }

  function updateTurnCounter() {
    els.turnCounter.textContent = state.turnCount + " / " + MAX_TURNS + " 회";
  }

  function showScreen(name) {
    ["home", "game", "result"].forEach(function (s) {
      const el = els[s + "Screen"];
      if (el) el.classList.toggle("hidden", s !== name);
    });
    state.screen = name;
  }

  function showHome() {
    showScreen("home");
    state.isEnded = false;
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    setTimeout(function () {
      els.toast.classList.remove("show");
    }, 2200);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
