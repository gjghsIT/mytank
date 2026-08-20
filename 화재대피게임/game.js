(() => {
  const COLS = 15;
  const ROWS = 15;
  const RAW = [
    "###############",
    "#btg##A.b##FFF#",
    "#P.n##...##FFF#",
    "#...##...##...#",
    "#oo####oo###h##",
    "#~~..m....~~.!#",
    "#~~.......~~..#",
    "#.............#",
    "#oo####.......#",
    "#C.b##.TG##...#",
    "#...##...##...#",
    "#.............#",
    "#.U##.N##.U##E#",
    "#.U##.S##.U##E#",
    "###############",
  ];

  const T = {
    WALL: 1,
    FLOOR: 0,
    BED: 2,
    TOWEL: 4,
    FIRE: 5,
    ELEVATOR: 6,
    DOOR: 8,
    HOT: 9,
    SMOKE: 13,
    ALARM: 14,
    TABLET: 15,
    BAG: 16,
    PHONE: 17,
    MONEY: 18,
    EXIT_HOT: 20,
    EXIT_COOL: 21,
    STAIRS: 22,
  };

  const FRIEND_INFO = {
    A: { name: "민지", hair: "#3d2a2c", hoodie: "#7ed9c0" },
    C: { name: "수아", hair: "#7a4a2b", hoodie: "#ffd56a" },
    G: { name: "하은", hair: "#5b3d8f", hoodie: "#c9b6ff" },
  };

  const ITEMS = {
    tablet: { name: "태블릿", score: -60, tile: T.TABLET, btn: "btnTablet" },
    bag: { name: "가방", score: -60, tile: T.BAG, btn: "btnBag" },
    phone: { name: "핸드폰", score: -60, tile: T.PHONE, btn: "btnPhone" },
    money: { name: "돈", score: -80, tile: T.MONEY, btn: "btnMoney" },
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const ui = {
    title: document.getElementById("titleScreen"),
    rules: document.getElementById("rulesScreen"),
    game: document.getElementById("gameScreen"),
    pause: document.getElementById("pauseScreen"),
    result: document.getElementById("resultScreen"),
    time: document.getElementById("timeLabel"),
    score: document.getElementById("scoreLabel"),
    friends: document.getElementById("friendLabel"),
    hp: document.getElementById("hpFill"),
    hint: document.getElementById("hintText"),
    toast: document.getElementById("toast"),
    alarm: document.getElementById("alarmBanner"),
    crouch: document.getElementById("crouchBtn"),
    action: document.getElementById("actionBtn"),
    kicker: document.getElementById("resultKicker"),
    stars: document.getElementById("resultStars"),
    alive: document.getElementById("aliveText"),
    resultScore: document.getElementById("resultScore"),
    breakdown: document.getElementById("breakdown"),
  };

  let map = [];
  let smoke = [];
  let closedDoors = new Set();
  let exitDoors = [];
  let checkedRoomHot = false;
  let openedRoomHot = false;
  let stairsOpen = false;
  let tile = 32;
  let originX = 0;
  let originY = 0;

  const input = { up: false, down: false, left: false, right: false };
  let keys = {};
  let playing = false;
  let paused = false;
  let lastTs = 0;
  let toastTimer = 0;
  let alarmTimer = 0;
  let fireTick = 0;
  let audioCtx = null;

  const state = resetState();

  function resetState() {
    return {
      px: 2.5,
      py: 2.5,
      dir: 2,
      crouched: false,
      towel: false,
      usedElevator: false,
      alarmPressed: false,
      items: { tablet: false, bag: false, phone: false, money: false },
      smokeBonus: { 1: false, 2: false },
      hp: 100,
      score: 0,
      time: 0,
      friends: [],
      rescued: [],
      trail: [],
      popups: [],
      particles: [],
      breakdown: [],
      won: false,
      lost: false,
    };
  }

  function parseMap() {
    map = [];
    smoke = [];
    exitDoors = [
      { id: "A", label: "1번 문", hot: true, checked: false, open: false, tiles: [] },
      { id: "B", label: "2번 문", hot: false, checked: false, open: false, tiles: [] },
      { id: "C", label: "3번 문", hot: true, checked: false, open: false, tiles: [] },
    ];
    const friends = [];
    let start = { x: 2.5, y: 2.5 };
    closedDoors = new Set();

    for (let y = 0; y < ROWS; y++) {
      map[y] = [];
      smoke[y] = [];
      for (let x = 0; x < COLS; x++) {
        const ch = RAW[y][x];
        smoke[y][x] = 0;
        let t = T.FLOOR;
        if (ch === "#") t = T.WALL;
        else if (ch === "b") t = T.BED;
        else if (ch === "T") t = T.TOWEL;
        else if (ch === "F") t = T.FIRE;
        else if (ch === "E") t = T.ELEVATOR;
        else if (ch === "o") t = T.DOOR;
        else if (ch === "h") t = T.HOT;
        else if (ch === "~") t = T.SMOKE;
        else if (ch === "!") t = T.ALARM;
        else if (ch === "t") t = T.TABLET;
        else if (ch === "g") t = T.BAG;
        else if (ch === "n") t = T.PHONE;
        else if (ch === "m") t = T.MONEY;
        else if (ch === "U") t = T.EXIT_HOT;
        else if (ch === "N") t = T.EXIT_COOL;
        else if (ch === "S") t = T.STAIRS;
        else if (ch === "P") start = { x: x + 0.5, y: y + 0.5 };
        else if (FRIEND_INFO[ch]) {
          friends.push({
            id: ch,
            x: x + 0.5,
            y: y + 0.5,
            rescued: false,
            bob: Math.random() * 6,
            ...FRIEND_INFO[ch],
          });
        }
        map[y][x] = t;
        if (t === T.FIRE) smoke[y][x] = 0.45;
        if (t === T.SMOKE) smoke[y][x] = 0.62;
        if (t === T.HOT || t === T.EXIT_HOT || t === T.EXIT_COOL) closedDoors.add(x + "," + y);
        if (t === T.EXIT_HOT) {
          const door = x < 5 ? exitDoors[0] : exitDoors[2];
          door.tiles.push([x, y]);
        }
        if (t === T.EXIT_COOL) exitDoors[1].tiles.push([x, y]);
      }
    }
    checkedRoomHot = false;
    openedRoomHot = false;
    stairsOpen = false;
    return { start, friends };
  }

  function show(el) {
    [ui.title, ui.rules, ui.game, ui.pause, ui.result].forEach((s) => s.classList.add("hidden"));
    el.classList.remove("hidden");
  }

  function toast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.remove("hidden");
    toastTimer = 1.7;
  }

  function addScore(amount, reason, x, y) {
    if (!amount) return;
    state.score += amount;
    state.breakdown.push({ reason, amount });
    if (x != null) {
      state.popups.push({
        x,
        y,
        text: (amount > 0 ? "+" : "") + amount,
        life: 1.1,
        color: amount > 0 ? "#2f9e78" : "#f05248",
      });
    }
    ui.score.textContent = String(state.score);
  }

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq, dur, type = "square", vol = 0.06) {
    const ac = ensureAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }

  function playAlarm() {
    let n = 0;
    const id = setInterval(() => {
      beep(n % 2 ? 880 : 698, 0.18, "square", 0.05);
      n += 1;
      if (n > 7) clearInterval(id);
    }, 200);
    if (navigator.vibrate) navigator.vibrate([180, 80, 180, 80, 240]);
  }

  function doorKey(x, y) {
    return x + "," + y;
  }

  function findExitDoor(x, y) {
    return exitDoors.find((d) => d.tiles.some(([dx, dy]) => dx === x && dy === y));
  }

  function nearbyExitDoor() {
    return exitDoors.find((d) =>
      d.tiles.some(([x, y]) => Math.hypot(state.px - (x + 0.5), state.py - (y + 0.5)) < 1.2)
    );
  }

  function tileAt(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return T.WALL;
    const t = map[ty][tx];
    if (
      (t === T.DOOR || t === T.HOT || t === T.EXIT_HOT || t === T.EXIT_COOL) &&
      closedDoors.has(doorKey(tx, ty))
    ) {
      return T.WALL;
    }
    if (t === T.STAIRS && !stairsOpen) return T.WALL;
    return t;
  }

  function blocked(x, y) {
    const t = tileAt(x, y);
    return t === T.WALL || t === T.FIRE || t === T.BED;
  }

  function canWalk(nx, ny) {
    const r = 0.28;
    return !(
      blocked(nx - r, ny - r) ||
      blocked(nx + r, ny - r) ||
      blocked(nx - r, ny + r) ||
      blocked(nx + r, ny + r)
    );
  }

  function nearTiles() {
    const tx = Math.floor(state.px);
    const ty = Math.floor(state.py);
    const near = [];
    for (let y = ty - 1; y <= ty + 1; y++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
        if (Math.hypot(state.px - (x + 0.5), state.py - (y + 0.5)) > 1.2) continue;
        near.push({ x, y, t: map[y][x], closed: closedDoors.has(doorKey(x, y)) });
      }
    }
    return near;
  }

  function currentAction() {
    const near = nearTiles();
    const friend = state.friends.find(
      (f) => !f.rescued && Math.hypot(f.x - state.px, f.y - state.py) < 1.05
    );
    if (friend) return { type: "rescue", friend, label: friend.name + " 구하기" };

    const towel = near.find((n) => n.t === T.TOWEL);
    if (towel && !state.towel) return { type: "towel", tile: towel, label: "수건 집기" };

    const alarm = near.find((n) => n.t === T.ALARM);
    if (alarm && !state.alarmPressed) return { type: "alarm", tile: alarm, label: "경보기 누르기" };

    const exitDoor = nearbyExitDoor();
    if (exitDoor && !exitDoor.checked) return { type: "checkExit", door: exitDoor, label: exitDoor.label + " 확인" };
    if (exitDoor && exitDoor.checked && !exitDoor.open) return { type: "openExit", door: exitDoor, label: exitDoor.label + " 열기" };

    const roomHot = near.find((n) => n.t === T.HOT);
    if (roomHot && roomHot.closed && !checkedRoomHot) return { type: "checkRoom", tile: roomHot, label: "문 확인" };

    const door = near.find((n) => n.t === T.DOOR && !n.closed);
    if (door) return { type: "close", tile: door, label: "문 닫기" };

    const elev = near.find((n) => n.t === T.ELEVATOR);
    if (elev) return { type: "elev", label: "엘베 타기" };

    const stairs = near.find((n) => n.t === T.STAIRS);
    if (stairs && stairsOpen) return { type: "stairs", label: "계단으로 탈출" };

    return { type: "none", label: "행동" };
  }

  function doAction() {
    if (!playing || paused) return;
    const act = currentAction();
    if (act.type === "none") return;
    if (act.type === "rescue") {
      act.friend.rescued = true;
      state.rescued.push(act.friend.name);
      addScore(200, act.friend.name + "를 구함", act.friend.x, act.friend.y);
      toast("👭 " + act.friend.name + "를 구했어요!");
      beep(523, 0.1, "sine", 0.07);
      beep(784, 0.16, "sine", 0.07);
    } else if (act.type === "towel") {
      state.towel = true;
      map[act.tile.y][act.tile.x] = T.FLOOR;
      addScore(150, "젖은 수건 사용", act.tile.x, act.tile.y);
      toast("🧴 코와 입을 가렸어요!");
      beep(660, 0.12, "triangle");
    } else if (act.type === "alarm") {
      pressAlarm();
    } else if (act.type === "checkExit") {
      checkExitDoor(act.door);
    } else if (act.type === "openExit") {
      openExitDoor(act.door);
    } else if (act.type === "checkRoom") {
      checkedRoomHot = true;
      addScore(120, "103호 문 온도 확인", act.tile.x, act.tile.y);
      toast("✋ 103호 문이 뜨거워요! 열지 마세요");
      beep(330, 0.2, "sawtooth", 0.04);
    } else if (act.type === "close") {
      closeDoorCluster(act.tile.x, act.tile.y);
      addScore(80, "문 닫아 불 차단", act.tile.x, act.tile.y);
      toast("🚪 문을 닫아 연기를 막았어요");
      beep(392, 0.1);
      if (!canWalk(state.px, state.py)) state.py += state.py < 6.5 ? 0.45 : -0.45;
    } else if (act.type === "elev") {
      useElevator();
    } else if (act.type === "stairs") {
      winGame();
    }
    refreshAction();
  }

  function checkExitDoor(door) {
    if (door.checked) return;
    door.checked = true;
    addScore(100, door.label + " 온도 확인", door.tiles[0][0], door.tiles[0][1]);
    if (door.hot) toast("✋ " + door.label + "이 뜨거워요! 다른 문을 고르세요");
    else toast("✅ " + door.label + "은 미지근해요. 비상계단이에요!");
    beep(door.hot ? 280 : 620, 0.18, "triangle", 0.06);
  }

  function openExitDoor(door) {
    if (door.open) return;
    if (!door.checked) {
      toast("문을 열기 전 손등으로 온도를 확인하세요!");
      return;
    }
    door.open = true;
    door.tiles.forEach(([x, y]) => closedDoors.delete(doorKey(x, y)));
    if (door.hot) {
      door.tiles.forEach(([x, y]) => {
        map[y][x] = T.FIRE;
        smoke[y][x] = 1;
      });
      state.hp = Math.max(8, state.hp - 22);
      addScore(-50, door.label + "을 열어 불이 번짐", door.tiles[0][0], door.tiles[0][1]);
      toast("🔥 뜨거운 문이에요! 불이 새어 나왔어요");
      beep(160, 0.28, "sawtooth", 0.05);
      if (navigator.vibrate) navigator.vibrate([120, 40, 120]);
    } else {
      stairsOpen = true;
      addScore(80, "안전한 계단 문을 선택", door.tiles[0][0], door.tiles[0][1]);
      toast("🏃 비상계단이에요! 이 문으로 나가세요");
      beep(784, 0.16, "sine", 0.07);
    }
  }

  function pressAlarm() {
    if (state.alarmPressed) {
      toast("이미 경보기를 눌렀어요");
      return;
    }
    const near = nearTiles().some((n) => n.t === T.ALARM);
    if (!near) {
      toast("복도 오른쪽의 화재경보기를 찾아 누르세요");
      return;
    }
    state.alarmPressed = true;
    addScore(200, "화재경보기 작동", 13.5, 5.5);
    toast("🚨 경보기를 눌렀어요! 친구들이 들을 거예요");
    playAlarm();
    document.getElementById("btnAlarm").classList.add("used");
  }

  function grabItem(key) {
    if (!playing || paused) return;
    if (state.items[key]) {
      toast("이미 챙긴 물건이에요");
      return;
    }
    const spec = ITEMS[key];
    state.items[key] = true;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (map[y][x] === spec.tile) map[y][x] = T.FLOOR;
      }
    }
    addScore(spec.score, spec.name + "을 챙김", state.px, state.py);
    toast("📦 " + spec.name + "은(는) 두고 나와야 안전해요!");
    beep(180, 0.2, "square", 0.05);
    document.getElementById(spec.btn).classList.add("used");
    if (navigator.vibrate) navigator.vibrate(40);
  }

  function useElevator() {
    if (!state.usedElevator) {
      state.usedElevator = true;
      state.hp = Math.max(10, state.hp - 20);
      addScore(-80, "엘리베이터 이용", state.px, state.py);
      toast("🚫 화재 때 엘리베이터는 금지! 계단으로 가세요");
      beep(140, 0.3, "square", 0.06);
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    } else {
      toast("엘리베이터는 위험해요. 2번 문(계단)을 찾으세요");
    }
    state.px = 11.5;
    state.py = 11.4;
    state.dir = 3;
  }

  function closeDoorCluster(x, y) {
    [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (map[ny] && map[ny][nx] === T.DOOR) closedDoors.add(doorKey(nx, ny));
    });
  }

  function smokeZoneId() {
    const x = Math.floor(state.px);
    const y = Math.floor(state.py);
    if (!map[y] || map[y][x] !== T.SMOKE) return 0;
    if (x <= 3) return 1;
    if (x >= 10) return 2;
    return 0;
  }

  function refreshAction() {
    const act = currentAction();
    ui.action.textContent = act.label;
    ui.action.disabled = act.type === "none";
  }

  function updateHint() {
    if (state.lost || state.won) return;
    const zone = smokeZoneId();
    const onSmoke = map[Math.floor(state.py)] && map[Math.floor(state.py)][Math.floor(state.px)] === T.SMOKE;
    if (onSmoke && !state.crouched) ui.hint.textContent = "연기구간! 숙이기를 눌러 낮게 이동하세요";
    else if (!state.alarmPressed) ui.hint.textContent = "복도 화재경보기를 누르고 친구를 구하세요";
    else if (state.rescued.length < 3) ui.hint.textContent = "방에 남은 친구들을 구해주세요";
    else if (!exitDoors.some((d) => d.checked)) ui.hint.textContent = "아래쪽 출구 문들의 온도를 확인하세요";
    else if (!stairsOpen) ui.hint.textContent = "미지근한 문(비상계단)만 열고 나가세요";
    else ui.hint.textContent = "2번 문 뒤 비상계단으로 탈출하세요";
    if (zone && state.crouched && !state.smokeBonus[zone]) {
      /* scored in update */
    }
  }

  function spreadSmokeAndFire(dt) {
    fireTick += dt;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (map[y][x] === T.SMOKE) smoke[y][x] = 0.62;
        else if (map[y][x] === T.FIRE) smoke[y][x] = 0.45;
        else smoke[y][x] = 0;
      }
    }

    if (fireTick > 10) {
      fireTick = 0;
      const fires = [];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) if (map[y][x] === T.FIRE) fires.push([x, y]);
      }
      fires.forEach(([x, y]) => {
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].forEach(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (closedDoors.has(doorKey(nx, ny))) return;
          const t = map[ny] && map[ny][nx];
          if (t === T.FLOOR || t === T.DOOR) {
            if (Math.random() < 0.28) map[ny][nx] = T.FIRE;
          }
        });
      });
    }
  }

  function spawnParticles(dt) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (map[y][x] === T.FIRE && Math.random() < dt * 8) {
          state.particles.push({
            x: x + Math.random(),
            y: y + Math.random() * 0.4 + 0.2,
            vy: -0.7 - Math.random(),
            life: 0.7,
            kind: "ember",
          });
        }
        if (map[y][x] === T.SMOKE && Math.random() < dt * 1.6) {
          state.particles.push({
            x: x + Math.random(),
            y: y + Math.random(),
            vy: -0.28,
            life: 0.8,
            kind: "smoke",
          });
        }
      }
    }
  }

  function update(dt) {
    if (!playing || paused) return;
    state.time += dt;
    if (alarmTimer > 0) {
      alarmTimer -= dt;
      if (alarmTimer <= 0) ui.alarm.classList.add("hidden");
    }
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) ui.toast.classList.add("hidden");
    }

    const crouch = state.crouched || keys.Shift;
    state.crouched = crouch;
    ui.crouch.classList.toggle("on", crouch);

    let vx = 0;
    let vy = 0;
    if (input.left || keys.ArrowLeft || keys.a || keys.A) vx -= 1;
    if (input.right || keys.ArrowRight || keys.d || keys.D) vx += 1;
    if (input.up || keys.ArrowUp || keys.w || keys.W) vy -= 1;
    if (input.down || keys.ArrowDown || keys.s || keys.S) vy += 1;
    if (vx || vy) {
      const len = Math.hypot(vx, vy) || 1;
      const speed = (crouch ? 1.65 : 3.1) / len;
      const nx = state.px + vx * speed * dt;
      const ny = state.py + vy * speed * dt;
      if (canWalk(nx, state.py)) state.px = nx;
      if (canWalk(state.px, ny)) state.py = ny;
      if (Math.abs(vx) > Math.abs(vy)) state.dir = vx > 0 ? 1 : 3;
      else state.dir = vy > 0 ? 2 : 0;
    }

    const tileNow = tileAt(state.px, state.py);
    if (tileNow === T.STAIRS && stairsOpen) {
      winGame();
      return;
    }
    if (tileNow === T.ELEVATOR) useElevator();

    const zone = smokeZoneId();
    if (crouch && zone && !state.smokeBonus[zone]) {
      state.smokeBonus[zone] = true;
      addScore(120, "연기구간에서 숙여 이동", state.px, state.py);
      toast("🙇 연기를 피해 낮게 지나갔어요! +120");
      beep(700, 0.12, "sine", 0.06);
    }

    const sm = smoke[Math.min(ROWS - 1, Math.floor(state.py))][Math.min(COLS - 1, Math.floor(state.px))];
    if (sm > 0.25) {
      let dmg = 8 * sm;
      if (state.towel) dmg *= 0.45;
      if (crouch) dmg *= 0.4;
      state.hp -= dmg * dt;
    }
    if (tileNow === T.FIRE) state.hp -= 28 * dt;
    state.hp = Math.max(0, Math.min(100, state.hp));
    ui.hp.style.width = state.hp + "%";
    if (state.hp <= 0) {
      loseGame();
      return;
    }

    state.trail.unshift({ x: state.px, y: state.py, dir: state.dir });
    if (state.trail.length > 80) state.trail.pop();
    let followIdx = 10;
    state.friends.forEach((f) => {
      if (!f.rescued) return;
      const target = state.trail[followIdx] || { x: state.px, y: state.py, dir: state.dir };
      f.x += (target.x - f.x) * Math.min(1, dt * 8);
      f.y += (target.y - f.y) * Math.min(1, dt * 8);
      f.dir = target.dir;
      followIdx += 12;
    });

    spreadSmokeAndFire(dt);
    spawnParticles(dt);
    state.particles.forEach((p) => {
      p.life -= dt;
      p.y += p.vy * dt;
    });
    state.particles = state.particles.filter((p) => p.life > 0);
    state.popups.forEach((p) => {
      p.life -= dt;
      p.y -= dt * 0.6;
    });
    state.popups = state.popups.filter((p) => p.life > 0);

    const m = Math.floor(state.time / 60);
    const s = Math.floor(state.time % 60);
    ui.time.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    ui.friends.textContent = state.rescued.length + "/3";
    refreshAction();
    updateHint();
  }

  function winGame() {
    if (state.won || state.lost) return;
    state.won = true;
    playing = false;
    const sec = state.time;
    const timeBonus = Math.max(0, Math.round((100 - sec) * 8));
    addScore(200, "비상계단으로 탈출");
    if (timeBonus) addScore(timeBonus, "빠른 대피 (" + Math.round(sec) + "초)");
    if (!state.items.tablet && !state.items.bag && !state.items.phone && !state.items.money) addScore(150, "물건을 두고 대피");
    if (!state.usedElevator) addScore(120, "엘리베이터 이용 안 함");
    if (state.smokeBonus[1] && state.smokeBonus[2]) addScore(80, "연기구간을 모두 숙여 통과");
    if (checkedRoomHot && !openedRoomHot) addScore(60, "불난 방 문을 열지 않음");
    if (state.rescued.length === 3) addScore(150, "친구 모두 구조");
    beep(523, 0.12, "sine", 0.07);
    setTimeout(() => beep(659, 0.12, "sine", 0.07), 90);
    setTimeout(() => beep(784, 0.28, "sine", 0.08), 180);
    showResult(true);
  }

  function loseGame() {
    if (state.won || state.lost) return;
    state.lost = true;
    playing = false;
    beep(196, 0.45, "sawtooth", 0.05);
    showResult(false);
  }

  function showResult(success) {
    const sec = Math.round(state.time);
    let stars = 0;
    if (success) stars = 1;
    if (success && state.rescued.length >= 2 && state.score >= 600) stars = 2;
    if (success && state.rescued.length === 3 && state.alarmPressed && !state.usedElevator && sec <= 90) stars = 3;
    ui.kicker.textContent = success ? "탈출 성공" : "대피 실패";
    ui.alive.textContent = success ? "살았다" : "아깝다";
    ui.alive.classList.toggle("fail", !success);
    ui.stars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    ui.resultScore.textContent = String(state.score);
    ui.breakdown.innerHTML = "";
    const rows = [{ reason: "경과 시간", amount: sec + "초" }, ...mergeBreakdown(state.breakdown)];
    rows.forEach((r) => {
      const li = document.createElement("li");
      const val = typeof r.amount === "number" ? (r.amount > 0 ? "+" + r.amount : String(r.amount)) : r.amount;
      li.innerHTML = "<span>" + r.reason + "</span><strong>" + val + "</strong>";
      ui.breakdown.appendChild(li);
    });
    show(ui.result);
    ui.result.classList.remove("hidden");
    ui.game.classList.remove("hidden");
  }

  function mergeBreakdown(list) {
    const mapR = new Map();
    list.forEach((i) => mapR.set(i.reason, (mapR.get(i.reason) || 0) + i.amount));
    return [...mapR.entries()].map(([reason, amount]) => ({ reason, amount }));
  }

  function worldX(x) {
    return originX + x * tile;
  }
  function worldY(y) {
    return originY + y * tile;
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawLabel(x, y, text, color) {
    ctx.fillStyle = color || "rgba(90,40,30,0.6)";
    ctx.font = "bold " + Math.max(9, tile * 0.26) + "px 'Noto Sans KR'";
    ctx.textAlign = "center";
    ctx.fillText(text, worldX(x), worldY(y));
  }

  function drawGirl(gx, gy, opt) {
    const s = tile * (opt.crouch ? 0.78 : 1.02);
    const x = worldX(gx);
    const y = worldY(gy) + (opt.crouch ? tile * 0.12 : 0);
    const bob = Math.sin(performance.now() / 180 + (opt.phase || 0)) * 1.4;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.48, s * 0.28, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = opt.hoodie;
    roundRect(-s * 0.22, s * 0.02, s * 0.44, s * 0.34, 8);
    ctx.fill();
    ctx.fillStyle = "#6ec8ff";
    roundRect(-s * 0.12, s * 0.3, s * 0.24, s * 0.16, 5);
    ctx.fill();
    ctx.fillStyle = "#ffd8c4";
    ctx.beginPath();
    ctx.arc(0, -s * 0.16, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = opt.hair;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.28, s * 0.22, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    if (opt.pigtails) {
      ctx.beginPath();
      ctx.ellipse(-s * 0.24, -s * 0.18, s * 0.08, s * 0.14, 0.4, 0, Math.PI * 2);
      ctx.ellipse(s * 0.24, -s * 0.18, s * 0.08, s * 0.14, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (opt.dir !== 0) {
      ctx.fillStyle = "#3d2a2c";
      ctx.beginPath();
      ctx.arc(-s * 0.07, -s * 0.16, s * 0.035, 0, Math.PI * 2);
      ctx.arc(s * 0.07, -s * 0.16, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff9aa2";
      ctx.beginPath();
      ctx.ellipse(-s * 0.12, -s * 0.1, s * 0.04, s * 0.02, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.12, -s * 0.1, s * 0.04, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (opt.towel) {
      ctx.fillStyle = "#d7f1ff";
      roundRect(-s * 0.2, -s * 0.12, s * 0.4, s * 0.12, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBag(px, py) {
    const cx = px + tile / 2;
    ctx.strokeStyle = "#6b3a2a";
    ctx.lineWidth = Math.max(2.5, tile * 0.07);
    ctx.beginPath();
    ctx.arc(cx, py + tile * 0.3, tile * 0.16, Math.PI * 1.05, -0.05);
    ctx.stroke();
    ctx.fillStyle = "#e07a5f";
    roundRect(px + tile * 0.2, py + tile * 0.28, tile * 0.6, tile * 0.58, 8);
    ctx.fill();
    ctx.fillStyle = "#c05640";
    roundRect(px + tile * 0.24, py + tile * 0.32, tile * 0.52, tile * 0.2, 5);
    ctx.fill();
    ctx.fillStyle = "#ffd56a";
    roundRect(cx - tile * 0.07, py + tile * 0.48, tile * 0.14, tile * 0.1, 3);
    ctx.fill();
    ctx.fillStyle = "#6b3a2a";
    ctx.font = "bold " + Math.max(8, tile * 0.2) + "px Jua, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("가방", cx, py + tile * 0.96);
  }

  function drawTablet(px, py) {
    ctx.fillStyle = "#3a3a46";
    roundRect(px + tile * 0.1, py + tile * 0.2, tile * 0.8, tile * 0.58, 7);
    ctx.fill();
    ctx.fillStyle = "#8ec5ff";
    roundRect(px + tile * 0.16, py + tile * 0.27, tile * 0.68, tile * 0.4, 4);
    ctx.fill();
    ctx.fillStyle = "#2a2a32";
    ctx.beginPath();
    ctx.arc(px + tile * 0.22, py + tile * 0.48, Math.max(1.6, tile * 0.04), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a5a68";
    roundRect(px + tile * 0.42, py + tile * 0.7, tile * 0.16, tile * 0.045, 2);
    ctx.fill();
    ctx.fillStyle = "#3a3a46";
    ctx.font = "bold " + Math.max(8, tile * 0.2) + "px Jua, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("태블릿", px + tile / 2, py + tile * 0.96);
  }

  function drawPhone(px, py) {
    ctx.fillStyle = "#22222c";
    roundRect(px + tile * 0.32, py + tile * 0.08, tile * 0.36, tile * 0.78, 9);
    ctx.fill();
    ctx.fillStyle = "#7ed9c0";
    roundRect(px + tile * 0.36, py + tile * 0.16, tile * 0.28, tile * 0.54, 4);
    ctx.fill();
    ctx.fillStyle = "#111118";
    roundRect(px + tile * 0.44, py + tile * 0.1, tile * 0.12, tile * 0.04, 2);
    ctx.fill();
    ctx.fillStyle = "#eee";
    ctx.beginPath();
    ctx.arc(px + tile / 2, py + tile * 0.78, Math.max(2.2, tile * 0.055), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#22222c";
    ctx.font = "bold " + Math.max(8, tile * 0.2) + "px Jua, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("핸드폰", px + tile / 2, py + tile * 0.98);
  }

  function drawMoney(px, py) {
    const stack = [
      { ox: 4, oy: 10, c: "#2f7a4a" },
      { ox: 1, oy: 5, c: "#3d9a5c" },
      { ox: -2, oy: 0, c: "#62d08a" },
    ];
    stack.forEach((b) => {
      ctx.fillStyle = b.c;
      roundRect(px + tile * 0.12 + b.ox, py + tile * 0.26 + b.oy, tile * 0.74, tile * 0.3, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + tile * 0.16 + b.ox, py + tile * 0.3 + b.oy, tile * 0.66, tile * 0.22);
    });
    ctx.fillStyle = "#14532d";
    ctx.font = "bold " + Math.max(12, tile * 0.32) + "px Jua, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("₩", px + tile / 2, py + tile * 0.5);
    ctx.font = "bold " + Math.max(8, tile * 0.2) + "px Jua, sans-serif";
    ctx.fillText("돈", px + tile / 2, py + tile * 0.96);
  }

  function drawItem(px, py, kind) {
    if (kind === T.BAG) drawBag(px, py);
    else if (kind === T.TABLET) drawTablet(px, py);
    else if (kind === T.PHONE) drawPhone(px, py);
    else if (kind === T.MONEY) drawMoney(px, py);
  }

  function draw() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    tile = Math.min(w / COLS, h / ROWS);
    originX = (w - tile * COLS) / 2;
    originY = (h - tile * ROWS) / 2;

    ctx.fillStyle = "#2a1816";
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = map[y][x];
        const px = worldX(x);
        const py = worldY(y);
        if (t === T.WALL) {
          ctx.fillStyle = "#e8b39a";
          ctx.fillRect(px, py, tile + 0.5, tile + 0.5);
          ctx.fillStyle = "#f3c7b2";
          ctx.fillRect(px + 2, py + 2, tile - 4, tile - 4);
          continue;
        }

        const isRoom = y <= 3 || (y >= 9 && y <= 10);
        ctx.fillStyle = isRoom ? "#f8e1c8" : "#f0d3b8";
        if (t === T.SMOKE) ctx.fillStyle = "#d9cfc6";
        if (t === T.STAIRS) ctx.fillStyle = "#b8f0c8";
        ctx.fillRect(px, py, tile + 0.5, tile + 0.5);

        if (t === T.BED) {
          ctx.fillStyle = "#8ec5ff";
          roundRect(px + 4, py + 6, tile - 8, tile - 10, 6);
          ctx.fill();
          ctx.fillStyle = "#fff";
          roundRect(px + 6, py + 8, tile * 0.35, tile * 0.22, 4);
          ctx.fill();
        }
        if (t === T.TOWEL) {
          ctx.fillStyle = "#bfe9ff";
          roundRect(px + 6, py + 6, tile - 12, tile - 12, 6);
          ctx.fill();
          ctx.fillStyle = "#3a9ad8";
          ctx.font = "bold " + tile * 0.24 + "px Jua, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("수건", px + tile / 2, py + tile * 0.62);
        }
        if (t === T.TABLET || t === T.BAG || t === T.PHONE || t === T.MONEY) drawItem(px, py, t);
        if (t === T.ALARM) {
          ctx.fillStyle = "#ff4d4d";
          roundRect(px + 6, py + 6, tile - 12, tile - 12, 6);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold " + tile * 0.22 + "px Jua, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("경보", px + tile / 2, py + tile * 0.58);
        }
        if (t === T.ELEVATOR) {
          ctx.fillStyle = "#cfd5de";
          ctx.fillRect(px, py, tile, tile);
          ctx.fillStyle = "#7b8492";
          ctx.fillRect(px + 3, py + 3, tile - 6, tile - 6);
          ctx.fillStyle = "#ff4d4d";
          ctx.font = "bold " + Math.max(10, tile * 0.28) + "px Jua, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("엘베", px + tile / 2, py + tile * 0.45);
          ctx.fillText("×", px + tile / 2, py + tile * 0.78);
        }
        if (t === T.STAIRS) {
          const glow = 0.55 + Math.sin(performance.now() / 280) * 0.25;
          ctx.fillStyle = "rgba(47,158,120," + glow + ")";
          ctx.fillRect(px, py, tile, tile);
          ctx.fillStyle = "#146c4a";
          ctx.font = "bold " + Math.max(9, tile * 0.24) + "px Jua, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("계단", px + tile / 2, py + tile * 0.62);
        }
        if (t === T.DOOR || t === T.HOT || t === T.EXIT_HOT || t === T.EXIT_COOL) {
          const closed = closedDoors.has(doorKey(x, y));
          const ex = findExitDoor(x, y);
          let col = "#d9a074";
          if (t === T.HOT) col = "#c45c5c";
          if (ex && ex.checked) col = ex.hot ? "#e85d5d" : "#3ecf8e";
          ctx.fillStyle = col;
          if (closed) {
            ctx.fillRect(px + tile * 0.18, py, tile * 0.64, tile);
            ctx.fillStyle = "#ffe08a";
            ctx.beginPath();
            ctx.arc(px + tile * 0.64, py + tile * 0.5, 3, 0, Math.PI * 2);
            ctx.fill();
            if (ex) {
              ctx.fillStyle = "#fff";
              ctx.font = "bold " + tile * 0.22 + "px Jua, sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(ex.id === "A" ? "1" : ex.id === "B" ? "2" : "3", px + tile / 2, py + tile * 0.58);
            }
          } else {
            ctx.strokeStyle = col;
            ctx.lineWidth = 3;
            ctx.strokeRect(px + 2, py + 2, tile - 4, tile - 4);
          }
        }
        if (t === T.FIRE) {
          const flick = 0.7 + Math.sin(performance.now() / 90 + x * 2 + y) * 0.3;
          ctx.fillStyle = "rgba(255,110,40," + flick + ")";
          ctx.beginPath();
          ctx.ellipse(px + tile / 2, py + tile * 0.7, tile * 0.34, tile * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,210,70," + flick + ")";
          ctx.beginPath();
          ctx.ellipse(px + tile / 2, py + tile * 0.42, tile * 0.18, tile * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        const sm = smoke[y][x];
        if (t === T.SMOKE) {
          ctx.fillStyle = "rgba(90,90,105,0.22)";
          ctx.fillRect(px, py, tile + 0.5, tile + 0.5);
        } else if (t === T.FIRE && sm > 0.05) {
          ctx.fillStyle = "rgba(80,80,95,0.16)";
          ctx.fillRect(px, py, tile + 0.5, tile + 0.5);
        }
      }
    }

    drawLabel(2.5, 1.32, "101 내 방");
    drawLabel(7.5, 1.32, "102");
    drawLabel(12.5, 1.32, "103 불");
    drawLabel(2.5, 9.35, "105");
    drawLabel(7.5, 9.35, "욕실");
    drawLabel(2.5, 12.28, "1번", exitDoors[0] && exitDoors[0].checked ? (exitDoors[0].hot ? "#c0392b" : "#146c4a") : "rgba(90,40,30,0.55)");
    drawLabel(6.5, 12.28, "2 계단", exitDoors[1] && exitDoors[1].checked ? "#146c4a" : "rgba(90,40,30,0.55)");
    drawLabel(10.5, 12.28, "3번", exitDoors[2] && exitDoors[2].checked ? (exitDoors[2].hot ? "#c0392b" : "#146c4a") : "rgba(90,40,30,0.55)");
    drawLabel(13.5, 12.28, "엘베", "#c0392b");
    drawLabel(2.0, 5.7, "연기구간", "rgba(60,60,80,0.55)");
    drawLabel(11.0, 5.7, "연기구간", "rgba(60,60,80,0.55)");

    state.friends.forEach((f) => {
      if (f.rescued) return;
      drawGirl(f.x, f.y, { dir: 2, hoodie: f.hoodie, hair: f.hair, crouch: false, phase: f.bob });
    });
    state.friends
      .filter((f) => f.rescued)
      .forEach((f) => {
        drawGirl(f.x, f.y, { dir: f.dir ?? 2, hoodie: f.hoodie, hair: f.hair, crouch: state.crouched, phase: f.bob });
      });
    drawGirl(state.px, state.py, {
      dir: state.dir,
      hoodie: "#ff9ec0",
      hair: "#4a2e24",
      pigtails: true,
      crouch: state.crouched,
      towel: state.towel,
    });

    state.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.kind === "ember" ? "#ffb703" : "#9aa0aa";
      ctx.beginPath();
      ctx.arc(worldX(p.x), worldY(p.y), p.kind === "ember" ? 2.2 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    state.popups.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = "bold 14px 'Noto Sans KR'";
      ctx.textAlign = "center";
      ctx.fillText(p.text, worldX(p.x), worldY(p.y));
      ctx.globalAlpha = 1;
    });
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    update(dt);
    if (!ui.game.classList.contains("hidden")) draw();
    requestAnimationFrame(loop);
  }

  function resetItemButtons() {
    ["btnAlarm", "btnTablet", "btnBag", "btnPhone", "btnMoney"].forEach((id) => {
      document.getElementById(id).classList.remove("used");
    });
  }

  function startGame() {
    const parsed = parseMap();
    Object.assign(state, resetState());
    state.px = parsed.start.x;
    state.py = parsed.start.y;
    state.friends = parsed.friends;
    playing = true;
    paused = false;
    alarmTimer = 2.4;
    fireTick = 0;
    ui.alarm.classList.remove("hidden");
    ui.score.textContent = "0";
    ui.friends.textContent = "0/3";
    ui.hp.style.width = "100%";
    ui.crouch.classList.remove("on");
    resetItemButtons();
    show(ui.game);
    ensureAudio();
    playAlarm();
    toast("🚨 불이야! 문 온도를 확인하고 계단으로!");
  }

  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("rulesBtn").onclick = () => show(ui.rules);
  document.getElementById("rulesBackBtn").onclick = () => show(ui.title);
  document.getElementById("rulesStartBtn").onclick = startGame;
  document.getElementById("pauseBtn").onclick = () => {
    if (!playing) return;
    paused = true;
    ui.pause.classList.remove("hidden");
  };
  document.getElementById("resumeBtn").onclick = () => {
    paused = false;
    ui.pause.classList.add("hidden");
  };
  document.getElementById("quitBtn").onclick = () => {
    playing = false;
    paused = false;
    ui.pause.classList.add("hidden");
    show(ui.title);
  };
  document.getElementById("retryBtn").onclick = startGame;
  document.getElementById("homeBtn").onclick = () => {
    playing = false;
    show(ui.title);
  };

  ui.crouch.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.crouched = !state.crouched;
    ui.crouch.classList.toggle("on", state.crouched);
  });
  ui.action.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    doAction();
  });
  document.getElementById("btnAlarm").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (playing && !paused) pressAlarm();
  });
  document.getElementById("btnTablet").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    grabItem("tablet");
  });
  document.getElementById("btnBag").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    grabItem("bag");
  });
  document.getElementById("btnPhone").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    grabItem("phone");
  });
  document.getElementById("btnMoney").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    grabItem("money");
  });

  document.querySelectorAll(".dpad button").forEach((btn) => {
    const dir = btn.dataset.dir;
    const set = (v) => {
      input[dir] = v;
      btn.classList.toggle("held", v);
    };
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      set(true);
    });
    btn.addEventListener("pointerup", () => set(false));
    btn.addEventListener("pointercancel", () => set(false));
    btn.addEventListener("lostpointercapture", () => set(false));
  });

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (e.key === " " || e.key === "Enter") doAction();
    if (e.key === "Shift") state.crouched = true;
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    if (e.key === "Shift") state.crouched = false;
  });

  let touchStart = null;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (!e.changedTouches[0]) return;
      touchStart = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    },
    { passive: true }
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (!touchStart || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      input.left = input.right = input.up = input.down = false;
      if (Math.hypot(dx, dy) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) input[dx > 0 ? "right" : "left"] = true;
      else input[dy > 0 ? "down" : "up"] = true;
    },
    { passive: true }
  );
  const clearSwipe = () => {
    touchStart = null;
    input.left = input.right = input.up = input.down = false;
  };
  canvas.addEventListener("touchend", clearSwipe);
  canvas.addEventListener("touchcancel", clearSwipe);

  window.addEventListener("resize", draw);
  requestAnimationFrame(loop);
})();
