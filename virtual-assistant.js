(() => {
  const root = document.getElementById("virtualAssistant");
  if (!root) return;

  const panel = document.getElementById("assistantPanel");
  const speechTail = root.querySelector(".assistant-speech-tail");
  const launcher = document.getElementById("assistantLauncher");
  const messages = document.getElementById("assistantMessages");
  const input = document.getElementById("assistantInput");
  const stateLabel = document.getElementById("assistantStateLabel");
  const contextLabel = document.getElementById("assistantAccountContext");
  const voiceButton = document.getElementById("assistantVoiceButton");
  const voiceNotice = document.getElementById("assistantVoiceNotice");
  const minimizeButton = document.getElementById("assistantMinimize");
  const restoreButton = document.getElementById("assistantRestore");
  const quickNotice = document.getElementById("assistantQuickNotice");
  const quickNoticeText = document.getElementById("assistantQuickNoticeText");
  const restoreImage = restoreButton.querySelector("img");
  const assistantPoseImage = launcher.querySelector(".assistant-launcher-pose--idle");
  const stateImages = {
    listening: root.querySelector(".assistant-launcher-pose--listening"),
    thinking: root.querySelector(".assistant-launcher-pose--thinking"),
  };
  let activeAccountId = "";
  let greetedAccountId = "";
  let assistantMinimized = false;
  let recognition = null;
  let requestSequence = 0;
  let welcomeAccountId = "";
  let positionAccountId = null;
  let pointerDrag = null;
  let suppressLauncherClickUntil = 0;
  let interactionState = "idle";
  let quickNoticeItem = null;
  const quickNoticeQueue = [];
  let lastMoodChangeAt = 0;
  let currentMood = null;
  let currentExpression = "idle";
  let expressionResetTimer = 0;
  let systemThemePreset = document.body.dataset.systemTheme || "default";
  let aiRequestPending = false;
  let aiRequestController = null;
  const pendingTaskDrafts = new Map();
  const assistantExpressionAssets = {
    flower: "assets/luna-flower.webp",
    cake: "assets/luna-cake.webp",
    notes: "assets/luna-notes.webp",
    research: "assets/luna-research.webp",
    happy: "assets/luna-happy.webp",
  };
  const assistantThemeAssets = {
    default: "assets/luna-outfit-field.png",
    tet: "assets/luna-outfit-aodai-red.png",
    "national-day": "assets/luna-outfit-aodai-red.png",
    anniversary: "assets/luna-outfit-anniversary.webp",
    "women-day": "assets/luna-outfit-rose.webp",
    "vietnamese-women-day": "assets/luna-outfit-rose.webp",
    "new-year": "assets/luna-outfit-aodai-red.png",
    "hung-kings": "assets/luna-outfit-aodai-heritage.png",
    "vietnamese-culture-day": "assets/luna-outfit-aodai-heritage.png",
    "reunification-day": "assets/luna-outfit-aodai-red.png",
    "children-day": "assets/luna-outfit-anniversary.webp",
    "martyrs-day": "assets/luna-outfit-aodai-heritage.png",
    "august-revolution": "assets/luna-outfit-aodai-red.png",
    christmas: "assets/luna-outfit-festival.webp",
    custom: "assets/luna-outfit-field.png",
  };
  let assistantVisibilityEnabled = document.body.dataset.lunaEnabled !== "false";
  let customThemeOutfit = assistantThemeAssets.default;
  const assistantMoods = [
    { key: "calm", pose: "idle", label: "Sẵn sàng hỗ trợ" },
    { key: "friendly", pose: "idle", label: "Đang vui vẻ đồng hành" },
    { key: "curious", pose: "idle", label: "Đang chú ý lắng nghe" },
    { key: "attentive", pose: "idle", label: "Sẵn sàng lắng nghe" },
    { key: "bright", pose: "speaking", label: "Tràn đầy năng lượng" },
    { key: "thoughtful", pose: "idle", label: "Đang suy ngẫm" },
  ];

  function positionStorageKey(accountId = activeAccountId) {
    return `phuc-thinh-assistant-position-v1:${accountId}`;
  }

  function assistantMinimizedStorageKey(accountId = activeAccountId) {
    return `phuc-thinh-assistant-minimized-v1:${accountId}`;
  }

  function readAssistantMinimized(accountId) {
    if (!accountId) return false;
    try {
      return localStorage.getItem(assistantMinimizedStorageKey(accountId)) === "true";
    } catch {
      return null;
    }
  }

  function loadStateImage(name) {
    const image = stateImages[name];
    if (image && !image.hasAttribute("src")) {
      image.src = new URL(image.dataset.src, window.location.href).href;
    }
  }

  function currentAssistantOutfit() {
    return systemThemePreset === "custom" ? customThemeOutfit : assistantThemeAssets[systemThemePreset] || assistantThemeAssets.default;
  }

  function assistantIsEnabled() {
    return document.body.dataset.lunaEnabled !== "false";
  }

  function applyAssistantCharacterImage() {
    const source = assistantExpressionAssets[currentExpression] || currentAssistantOutfit();
    const url = new URL(`${source}?v=3.4.64`, window.location.href).href;
    if (assistantPoseImage && assistantPoseImage.src !== url) assistantPoseImage.src = url;
    root.dataset.expression = currentExpression;
    root.dataset.outfitTheme = systemThemePreset;
    if (restoreImage?.hasAttribute("src")) {
      const outfitUrl = new URL(`${currentAssistantOutfit()}?v=3.4.64`, window.location.href).href;
      if (restoreImage.src !== outfitUrl) restoreImage.src = outfitUrl;
    }
  }

  function setAssistantExpression(expression, { duration = 0 } = {}) {
    if (expressionResetTimer) window.clearTimeout(expressionResetTimer);
    expressionResetTimer = 0;
    currentExpression = assistantExpressionAssets[expression] ? expression : "idle";
    applyAssistantCharacterImage();
    if (Number(duration) > 0) {
      expressionResetTimer = window.setTimeout(() => {
        expressionResetTimer = 0;
        currentExpression = "idle";
        applyAssistantCharacterImage();
      }, Math.max(1500, Number(duration)));
    }
  }

  function applyAssistantTheme(theme = {}) {
    const preset = theme?.preset;
    systemThemePreset = Object.hasOwn(assistantThemeAssets, preset) ? preset : "default";
    if (systemThemePreset === "custom") {
      const color = String(theme.primary || "").match(/^#([\da-f]{6})$/i)?.[1];
      if (color) {
        const channels = [0, 2, 4].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255);
        const [red, green, blue] = channels.map((channel) => channel > 0.04045 ? ((channel + 0.055) / 1.055) ** 2.4 : channel / 12.92);
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const delta = max - min;
        const hue = delta === 0 ? 0 : max === red ? 60 * (((green - blue) / delta) % 6)
          : max === green ? 60 * ((blue - red) / delta + 2) : 60 * ((red - green) / delta + 4);
        const normalizedHue = (hue + 360) % 360;
        customThemeOutfit = normalizedHue < 25 || normalizedHue >= 345 ? assistantThemeAssets.tet
          : normalizedHue >= 285 && normalizedHue < 345 ? assistantThemeAssets["women-day"]
            : normalizedHue >= 70 && normalizedHue < 165 ? assistantThemeAssets["hung-kings"]
              : assistantThemeAssets.anniversary;
      }
    }
    const flowerTheme = ["women-day", "vietnamese-women-day"].includes(systemThemePreset);
    setAssistantExpression(flowerTheme && activeAccountId ? "flower" : "idle", {
      duration: flowerTheme && activeAccountId ? 8000 : 0,
    });
  }

  function setAssistantMinimized(minimized, { persist = true, focus = true } = {}) {
    const next = Boolean(minimized);
    assistantMinimized = next;
    if (next && !panel.classList.contains("is-hidden")) setPanelOpen(false, { restoreFocus: false });
    root.classList.toggle("is-minimized", next);
    restoreButton.classList.toggle("is-hidden", !next);
    restoreButton.setAttribute("aria-hidden", String(!next));
    minimizeButton.setAttribute("aria-hidden", String(next));
    if (next && restoreImage && !restoreImage.hasAttribute("src")) {
      restoreImage.src = new URL(`${currentAssistantOutfit()}?v=3.4.64`, window.location.href).href;
    }
    if (persist && activeAccountId) {
      try {
        localStorage.setItem(assistantMinimizedStorageKey(), String(next));
      } catch {
        // Keep the current minimized state for this session if storage is unavailable.
      }
    }
    if (focus) (next ? restoreButton : launcher).focus({ preventScroll: true });
    positionMinimizeButton();
  }

  function isMobileAssistantViewport() {
    return window.matchMedia?.("(max-width: 768px)").matches || window.innerWidth <= 768;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function placeLauncher(left, top, { persist = false } = {}) {
    const maxLeft = window.innerWidth - launcher.offsetWidth - 8;
    const maxTop = window.innerHeight - launcher.offsetHeight - 8;
    const position = {
      left: clamp(left, 8, maxLeft),
      top: clamp(top, 8, maxTop),
    };
    launcher.style.left = `${position.left}px`;
    launcher.style.top = `${position.top}px`;
    launcher.style.right = "auto";
    launcher.style.bottom = "auto";
    positionMinimizeButton();
    if (persist && activeAccountId) {
      try {
        localStorage.setItem(positionStorageKey(), JSON.stringify(position));
      } catch {
        // Position remains usable for this session when storage is unavailable.
      }
    }
    return position;
  }

  function positionMinimizeButton() {
    if (!launcher || !minimizeButton) return;
    const rect = launcher.getBoundingClientRect();
    const size = minimizeButton.offsetWidth || 24;
    minimizeButton.style.left = `${clamp(rect.right - size + 3, 4, window.innerWidth - size - 4)}px`;
    minimizeButton.style.top = `${clamp(rect.top + 4, 4, window.innerHeight - size - 4)}px`;
    minimizeButton.style.right = "auto";
    minimizeButton.style.bottom = "auto";
  }

  function restoreLauncherPosition(accountId) {
    launcher.style.removeProperty("left");
    launcher.style.removeProperty("top");
    launcher.style.removeProperty("right");
    launcher.style.removeProperty("bottom");
    if (!accountId || isMobileAssistantViewport()) return;
    try {
      const saved = JSON.parse(localStorage.getItem(positionStorageKey(accountId)) || "null");
      if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
        placeLauncher(saved.left, saved.top);
      }
    } catch {
      // Ignore malformed or unavailable local preferences.
    }
  }

  function positionAssistantPanel() {
    if (panel.classList.contains("is-hidden")) return;
    const anchor = launcher.getBoundingClientRect();
    const margin = 12;
    const mobile = isMobileAssistantViewport();
    const gap = mobile ? 16 : 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = Math.min(mobile ? 480 : 500, viewportWidth - margin * 2);
    const headX = anchor.left + anchor.width / 2;
    const headY = anchor.top + anchor.height * 0.08;
    panel.style.height = "auto";
    panel.style.width = `${panelWidth}px`;
    panel.style.maxWidth = `${panelWidth}px`;
    panel.style.maxHeight = `${Math.max(1, Math.min(620, viewportHeight - margin * 2))}px`;
    const naturalHeight = panel.offsetHeight;
    const roomAbove = Math.max(0, anchor.top - margin - gap);
    const roomBelow = Math.max(0, viewportHeight - margin - anchor.bottom - gap);
    const sideOptions = [
      { placement: "right", room: viewportWidth - margin - anchor.right - gap },
      { placement: "left", room: anchor.left - margin - gap },
    ].filter((option) => option.room >= 210);

    let chosen;
    if (mobile) {
      chosen = { placement: "above", room: roomAbove };
    } else if (roomAbove >= naturalHeight) {
      chosen = { placement: "above", room: roomAbove };
    } else if (sideOptions.length) {
      chosen = sideOptions.sort((left, right) => right.room - left.room)[0];
    } else if (roomBelow >= naturalHeight) {
      chosen = { placement: "below", room: roomBelow };
    } else {
      chosen = roomAbove >= roomBelow
        ? { placement: "above", room: roomAbove }
        : { placement: "below", room: roomBelow };
    }

    const width = chosen.placement === "left" || chosen.placement === "right"
      ? Math.min(panelWidth, chosen.room)
      : panelWidth;
    panel.style.width = `${width}px`;
    panel.style.maxWidth = `${width}px`;
    panel.style.maxHeight = `${Math.max(1, chosen.placement === "left" || chosen.placement === "right"
      ? viewportHeight - margin * 2
      : Math.min(620, chosen.room))}px`;
    const actualWidth = panel.offsetWidth;
    const height = panel.offsetHeight;
    panel.style.height = `${height}px`;
    let left;
    let top;
    if (chosen.placement === "above") {
      left = clamp(headX - actualWidth / 2, margin, viewportWidth - actualWidth - margin);
      top = clamp(anchor.top - height - gap, margin, viewportHeight - height - margin);
    } else if (chosen.placement === "below") {
      left = clamp(headX - actualWidth / 2, margin, viewportWidth - actualWidth - margin);
      top = clamp(anchor.bottom + gap, margin, viewportHeight - height - margin);
    } else if (chosen.placement === "right") {
      left = anchor.right + gap;
      top = clamp(headY - height * 0.16, margin, viewportHeight - height - margin);
    } else {
      left = anchor.left - actualWidth - gap;
      top = clamp(headY - height * 0.16, margin, viewportHeight - height - margin);
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.setAttribute("data-placement", chosen.placement);
    panel.style.setProperty("--assistant-tail-x", `${clamp(headX - left, 22, actualWidth - 22)}px`);
    panel.style.setProperty("--assistant-tail-y", `${clamp(headY - top, 22, height - 22)}px`);
    if (speechTail) {
      speechTail.style.position = "fixed";
      speechTail.style.right = "auto";
      speechTail.style.bottom = "auto";
      speechTail.style.zIndex = "1000002";
      speechTail.dataset.placement = chosen.placement;
      speechTail.textContent = { above: "▼", below: "▲", left: "▶", right: "◀" }[chosen.placement];
      if (chosen.placement === "above") {
        speechTail.style.left = `${headX}px`;
        speechTail.style.top = `${top + height + (mobile ? -4 : 1)}px`;
        speechTail.style.transform = "translateX(-50%)";
      } else if (chosen.placement === "below") {
        speechTail.style.left = `${headX}px`;
        speechTail.style.top = `${top - 12}px`;
        speechTail.style.transform = "translateX(-50%) rotate(180deg)";
      } else if (chosen.placement === "left") {
        speechTail.style.left = `${left + actualWidth - 3}px`;
        speechTail.style.top = `${headY - 6}px`;
        speechTail.style.transform = "rotate(-90deg)";
      } else {
        speechTail.style.left = `${left - 15}px`;
        speechTail.style.top = `${headY - 6}px`;
        speechTail.style.transform = "rotate(90deg)";
      }
    }
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function currentTasks() {
    if (typeof canViewTasks !== "function" || !canViewTasks() || typeof state === "undefined") return [];
    return (Array.isArray(state.tasks) ? state.tasks : [])
      .filter((task) => typeof canViewTaskRecord === "function" && canViewTaskRecord(task));
  }

  function currentSummaryTasks() {
    return currentTasks()
      .filter((task) => typeof taskMatchesDisplayScope !== "function" || taskMatchesDisplayScope(task))
      .filter((task) => typeof isRecurrenceStoppedTask !== "function" || !isRecurrenceStoppedTask(task));
  }

  function assistantSummaryScopeLabel() {
    return typeof taskDisplayScopeLabel === "function"
      ? taskDisplayScopeLabel()
      : "phạm vi công việc tài khoản được phép xem";
  }

  function currentPeople(searchOwnProfile = false) {
    if (typeof state === "undefined") return [];
    if (searchOwnProfile) {
      const person = typeof currentPerson === "function" ? currentPerson() : null;
      return person ? [person] : [];
    }
    if (typeof canViewPeople === "function" && canViewPeople() && typeof visiblePeopleForPeopleView === "function") {
      return visiblePeopleForPeopleView();
    }
    return [];
  }

  const searchStopWords = new Set([
    "hay", "vui", "cho", "toi", "xem", "kiem", "tra", "tim", "giup", "ve", "co", "the", "nao", "dang",
    "duoc", "giao", "cua", "minh", "va", "la", "trong", "theo", "tai", "mot", "gi", "ten",
  ]);

  function searchTerms(query) {
    return normalize(query)
      .replace(/\b(?:cong viec|nhiem vu|nhan su|nhan vien|can bo|du an|ho so|thong tin|trang thai|tien do|bao cao|danh sach|tra cuu|theo doi)\b/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 1 && !searchStopWords.has(term));
  }

  function searchMatchScore(value, terms) {
    if (!terms.length) return 0;
    const tokens = normalize(value).split(/[^a-z0-9]+/).filter(Boolean);
    let score = 0;
    for (const term of terms) {
      if (tokens.includes(term)) score += 2;
      else if (term.length >= 3 && tokens.some((token) => token.startsWith(term))) score += 1;
      else return 0;
    }
    return score;
  }

  function personSearchScore(name, context, query) {
    const terms = searchTerms(query);
    if (!terms.length) return 0;
    const nameScore = searchMatchScore(name, terms);
    if (nameScore) return nameScore + terms.length;
    const explicitContextQuery = /\b(?:phong|truong|pho|ban|bo phan)\b/.test(normalize(query));
    if (terms.length === 1 && !explicitContextQuery) return 0;
    return searchMatchScore(context, terms);
  }

  function taskStatus(task) {
    return typeof getDueStatus === "function" ? getDueStatus(task) : String(task?.status || "Chưa rõ");
  }

  function taskDueLabel(task) {
    if (!task?.due) return "Chưa có hạn";
    return typeof formatTaskDeadline === "function" ? formatTaskDeadline(task) : task.due;
  }

  function applyVisualState() {
    const visualState = interactionState === "idle" ? currentMood?.pose || "idle" : interactionState;
    const stage = root.querySelector(".assistant-character-stage");
    if (stage) stage.dataset.state = visualState;
    root.dataset.state = visualState;
    applyAssistantCharacterImage();
    if (visualState === "listening" || visualState === "thinking") loadStateImage(visualState);
  }

  function setState(name, label) {
    interactionState = name === "idle" ? "idle" : name;
    applyVisualState();
    if (stateLabel) stateLabel.textContent = label;
  }

  function changeMoodIfDue(force = false) {
    const now = Date.now();
    if (!assistantIsEnabled() || !activeAccountId || document.hidden || !panel.classList.contains("is-hidden") || recognition) return;
    if (!force && now - lastMoodChangeAt < 30 * 60 * 1000) return;
    const choices = assistantMoods.filter((mood) => mood.key !== currentMood?.key);
    currentMood = choices[Math.floor(Math.random() * choices.length)] || assistantMoods[0];
    lastMoodChangeAt = now;
    root.dataset.mood = currentMood.key;
    const moodExpressions = { calm: "idle", friendly: "happy", curious: "research", attentive: "notes", bright: "happy", thoughtful: "research" };
    setAssistantExpression(moodExpressions[currentMood.key] || "idle");
    if (currentMood.pose === "listening" || currentMood.pose === "thinking") loadStateImage(currentMood.pose);
    applyVisualState();
    if (interactionState === "idle" && stateLabel) stateLabel.textContent = currentMood.label;
  }

  function setPanelOpen(open, { restoreFocus = true } = {}) {
    const shouldOpen = Boolean(open && assistantIsEnabled() && !root.classList.contains("is-minimized") && typeof currentAccount === "function" && currentAccount());
    panel.classList.toggle("is-hidden", !shouldOpen);
    if (speechTail) speechTail.style.display = shouldOpen ? "block" : "none";
    panel.setAttribute("aria-hidden", String(!shouldOpen));
    launcher.setAttribute("aria-expanded", String(shouldOpen));
    root.classList.toggle("is-open", shouldOpen);
    if (shouldOpen) {
      syncAccountAccess();
      if (isMobileAssistantViewport()) restoreLauncherPosition(activeAccountId);
      showWelcome();
      window.requestAnimationFrame(() => {
        positionMinimizeButton();
        positionAssistantPanel();
        if (!isMobileAssistantViewport()) input.focus({ preventScroll: true });
      });
    } else {
      if (recognition) recognition.stop();
      setState("idle", "Sẵn sàng hỗ trợ");
      changeMoodIfDue();
      if (!quickNoticeItem && quickNoticeQueue.length) presentQuickNotice(quickNoticeQueue.shift());
      if (restoreFocus) launcher.focus({ preventScroll: true });
    }
  }

  function cancelLunaAiRequest() {
    if (aiRequestController) aiRequestController.abort();
    aiRequestController = null;
    aiRequestPending = false;
    input.disabled = false;
    const sendButton = root.querySelector(".assistant-send-button");
    if (sendButton) sendButton.disabled = false;
  }

  function syncAccountAccess() {
    const account = typeof currentAccount === "function" ? currentAccount() : null;
    const loggedIn = Boolean(account);
    const enabled = assistantIsEnabled();
    const visibilityChanged = enabled !== assistantVisibilityEnabled;
    assistantVisibilityEnabled = enabled;
    const canViewTasks = loggedIn && typeof window.canViewTasks === "function" && window.canViewTasks();
    const canViewPeople = loggedIn && typeof window.canViewPeople === "function" && window.canViewPeople();
    const canCreate = loggedIn && canViewTasks && typeof window.canCreateRegularTasks === "function" && window.canCreateRegularTasks();
    const nextAccountId = String(account?.id || "");
    const accountChanged = nextAccountId !== activeAccountId;
    if (accountChanged) {
      cancelLunaAiRequest();
      hideQuickNotice();
      requestSequence += 1;
      activeAccountId = nextAccountId;
      assistantMinimized = false;
      welcomeAccountId = "";
      currentMood = null;
      lastMoodChangeAt = 0;
      setAssistantExpression("idle");
      messages.replaceChildren();
    }
    root.classList.toggle("is-hidden", !loggedIn || !enabled);
    const savedMinimized = loggedIn ? readAssistantMinimized(nextAccountId) : false;
    if (savedMinimized !== null) assistantMinimized = savedMinimized;
    const minimized = loggedIn && assistantMinimized;
    root.classList.toggle("is-minimized", minimized);
    restoreButton.classList.toggle("is-hidden", !minimized);
    restoreButton.setAttribute("aria-hidden", String(!minimized));
    minimizeButton.setAttribute("aria-hidden", String(minimized));
    if (minimized && restoreImage && !restoreImage.hasAttribute("src")) {
      restoreImage.src = new URL(restoreImage.dataset.assistantMiniSrc, window.location.href).href;
    }
    document.body.classList.toggle("has-virtual-assistant", loggedIn && enabled);
    document.getElementById("assistantCreateTask")?.classList.toggle("is-hidden", !canCreate);
    root.querySelectorAll('[data-assistant-command="tình hình công việc của tôi"], [data-assistant-command="công việc quá hạn"], [data-assistant-command="công việc hôm nay"]')
      .forEach((button) => button.classList.toggle("is-hidden", !canViewTasks));
    if (contextLabel) {
      contextLabel.textContent = !loggedIn
        ? ""
        : `Tra cứu chỉ trong phạm vi dữ liệu tài khoản ${account.displayName || "hiện tại"} được phép xem${canViewPeople ? ", gồm thông tin nhân sự cơ bản" : ""}.`;
    }

    if (nextAccountId !== positionAccountId) {
      positionAccountId = nextAccountId;
      restoreLauncherPosition(nextAccountId);
    }
    if ((!loggedIn || !enabled) && !panel.classList.contains("is-hidden")) setPanelOpen(false, { restoreFocus: false });
    if (!enabled) {
      cancelLunaAiRequest();
      hideQuickNotice();
    }
    if (loggedIn && enabled && !currentMood && panel.classList.contains("is-hidden")) changeMoodIfDue(true);
    if (!loggedIn) {
      hideQuickNotice();
      greetedAccountId = "";
      try {
        sessionStorage.removeItem("phuc-thinh-luna-greeted-account-v1");
      } catch {
        // Greeting still works for this page session if storage is unavailable.
      }
    }
    positionMinimizeButton();
    if (accountChanged && loggedIn && enabled) showLoginGreeting(account);
    else if (visibilityChanged && loggedIn && enabled) showLoginGreeting(account);
  }

  function appendMessage(kind, content, { html = false } = {}) {
    const message = document.createElement("article");
    message.className = `assistant-message is-${kind}`;
    if (html) message.innerHTML = content;
    else message.textContent = content;
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function showWelcome() {
    const account = typeof currentAccount === "function" ? currentAccount() : null;
    if (!account || welcomeAccountId === account.id) return;
    welcomeAccountId = account.id;
    const taskAccess = typeof canViewTasks === "function" && canViewTasks();
    const peopleAccess = typeof canViewPeople === "function" && canViewPeople();
    const { addressee, pronoun } = assistantUserProfile(account);
    appendMessage("assistant", `Em chào ${addressee} ạ. Em có thể tra cứu công việc${taskAccess ? ` ${pronoun} được phép xem` : " được giao cho tài khoản này"}, dự án và nhân sự trong phạm vi quyền hiện tại${peopleAccess ? "" : `; tra cứu nhân sự chỉ giới hạn hồ sơ của ${pronoun}`}. Em cũng sẽ nhắc lịch, việc đến hạn, tin Bảng tin mới và thông tin liên quan ngay tại đây. Nội dung nhận dạng bằng giọng nói sẽ được điền vào ô để ${pronoun} kiểm tra trước khi gửi.`);
  }

  function showLoginGreeting(account) {
    const accountId = String(account?.id || "");
    if (!accountId || greetedAccountId === accountId) return;
    let storedAccountId = "";
    try {
      storedAccountId = sessionStorage.getItem("phuc-thinh-luna-greeted-account-v1") || "";
    } catch {
      // Continue with the in-memory guard if session storage is unavailable.
    }
    if (storedAccountId === accountId) {
      greetedAccountId = accountId;
      return;
    }
    greetedAccountId = accountId;
    try {
      sessionStorage.setItem("phuc-thinh-luna-greeted-account-v1", accountId);
    } catch {
      // The greeting remains deduplicated for this page session.
    }
    notify({
      id: `luna-greeting:${accountId}:${Date.now()}`,
      title: "Lời chào",
      message: loginGreetingMessage(account),
      messageOnly: true,
      priority: "success",
    });
  }

  function taskSummaryMetrics(tasks, todayKey) {
    const finishedStatuses = new Set(["Hoàn thành", "Đã đóng", "Đã dừng định kỳ"]);
    const overdue = tasks.filter((task) => taskStatus(task) === "Quá hạn");
    const dueToday = tasks.filter((task) => String(task.due || "").slice(0, 10) === todayKey
      && !finishedStatuses.has(taskStatus(task))
      && taskStatus(task) !== "Quá hạn");
    const completed = tasks.filter((task) => taskStatus(task) === "Hoàn thành");
    const submittedToday = tasks.filter((task) => {
      if (taskStatus(task) !== "Hoàn thành" || !task.completedAt) return false;
      const completedAt = new Date(task.completedAt);
      if (Number.isNaN(completedAt.getTime())) return false;
      const completedDate = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, "0")}-${String(completedAt.getDate()).padStart(2, "0")}`;
      return completedDate === todayKey;
    });
    const waitingReview = tasks.filter((task) => typeof taskCompletionNeedsReview === "function"
      ? taskCompletionNeedsReview(task)
      : taskStatus(task) === "Hoàn thành" && String(task.completionReviewStatus || "") === "pending");
    return { dueToday, overdue, completed, submittedToday, waitingReview };
  }

  function dailyStatusSummary(tasks, todayKey) {
    const metrics = taskSummaryMetrics(tasks, todayKey);
    return `${metrics.dueToday.length} việc đến hạn, ${metrics.overdue.length} việc quá hạn, ${metrics.submittedToday.length} việc gửi hoàn thành hôm nay và ${metrics.waitingReview.length} việc chờ đánh giá`;
  }

  function loginGreetingMessage(account) {
    const { honorific, addressee, pronoun } = assistantUserProfile(account);
    const hour = new Date().getHours();
    let greeting;
    if (hour >= 5 && hour < 12) {
      greeting = `Em chào ${addressee}, buổi sáng tốt lành ạ! Chúc ${pronoun} một ngày làm việc thật vui vẻ, thuận lợi và hiệu quả. Em luôn sẵn sàng hỗ trợ ạ.`;
    }
    else if (hour >= 12 && hour < 18) {
      greeting = `Em chào ${addressee}, buổi chiều vui vẻ ạ! Chúc ${pronoun} làm việc thật thuận lợi, hiệu quả. Em luôn sẵn sàng hỗ trợ ạ.`;
    }
    else {
      greeting = `Em chào ${addressee}, buổi tối an lành ạ! Nếu ${honorific || "bạn"} vẫn đang làm việc, em chúc mọi việc thật suôn sẻ. Em luôn sẵn sàng hỗ trợ ạ.`;
    }
    if (typeof window.canViewTasks !== "function" || !window.canViewTasks()) return greeting;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return `${greeting} Tình hình công việc (${assistantSummaryScopeLabel()}, trong phạm vi được xem): ${dailyStatusSummary(currentSummaryTasks(), todayKey)}.`;
  }

  function assistantUserProfile(account) {
    const person = typeof currentPerson === "function" ? currentPerson() : null;
    const rawGender = String(person?.gender || account?.gender || "").trim().toLocaleLowerCase("vi");
    const gender = rawGender.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const honorific = ["nam", "male", "m"].includes(gender) ? "anh"
      : ["nu", "female", "f"].includes(gender) ? "chị" : "";
    const name = String(account?.displayName || person?.name || "").trim();
    const addressee = [honorific, name].filter(Boolean).join(" ") || "bạn";
    const pronoun = honorific || "bạn";
    return { honorific, addressee, pronoun };
  }

  function hideQuickNotice() {
    quickNotice?.classList.add("is-hidden");
    quickNoticeItem = null;
    quickNoticeQueue.length = 0;
  }

  function presentQuickNotice(notice) {
    quickNoticeItem = notice;
    if (quickNoticeText) {
      quickNoticeText.textContent = notice.messageOnly
        ? notice.message
        : notice.message ? `${notice.title}: ${notice.message}` : notice.title;
    }
    if (!quickNotice) return;
    quickNotice.dataset.priority = ["warning", "danger", "success"].includes(notice.priority) ? notice.priority : "info";
    quickNotice.classList.remove("is-hidden");
    window.requestAnimationFrame(positionQuickNotice);
    const noticeExpression = notice.id.startsWith("birthday:") ? "cake"
      : notice.priority === "success" ? "happy" : "notes";
    setAssistantExpression(noticeExpression, { duration: 9000 });
    if (!panel.classList.contains("is-hidden") || recognition) return;
    setState("speaking", "Có thông báo mới");
    window.setTimeout(() => {
      if (interactionState === "speaking") setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ");
    }, 1800);
  }

  function acknowledgeQuickNotice({ showNext = true } = {}) {
    const item = quickNoticeItem;
    if (item && typeof dismissNotification === "function") dismissNotification(item);
    quickNoticeItem = null;
    const nextNotice = showNext ? quickNoticeQueue.shift() : null;
    if (nextNotice) {
      presentQuickNotice(nextNotice);
      return;
    }
    quickNotice?.classList.add("is-hidden");
    if (showNext) quickNoticeQueue.length = 0;
  }

  function positionQuickNotice() {
    if (!quickNotice || quickNotice.classList.contains("is-hidden")) return;
    const mobile = isMobileAssistantViewport();
    const anchor = assistantMinimized ? restoreButton : launcher;
    const anchorRect = anchor.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(mobile ? 350 : 430, Math.max(1, window.innerWidth - margin * 2));
    quickNotice.style.width = `${width}px`;
    quickNotice.style.removeProperty("max-height");
    const naturalHeight = quickNotice.offsetHeight || 96;
    const headX = anchorRect.left + anchorRect.width / 2;
    const headY = anchorRect.top + anchorRect.height * (assistantMinimized ? 0.18 : 0.08);
    const gap = 26;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const left = Math.max(margin, Math.min(headX - width / 2, maxLeft));
    const roomAbove = headY - margin - gap;
    const roomBelow = window.innerHeight - headY - margin - gap;
    const placement = roomAbove >= naturalHeight ? "above"
      : roomBelow >= naturalHeight ? "below"
        : roomAbove >= roomBelow ? "above" : "below";
    const availableHeight = Math.max(1, placement === "above" ? roomAbove : roomBelow);
    if (availableHeight < naturalHeight) quickNotice.style.maxHeight = `${availableHeight}px`;
    const height = quickNotice.offsetHeight || naturalHeight;
    const top = placement === "above"
      ? Math.max(margin, headY - height - gap)
      : Math.min(window.innerHeight - height - margin, headY + gap);
    quickNotice.dataset.placement = placement;
    quickNotice.style.left = `${left}px`;
    quickNotice.style.right = "auto";
    quickNotice.style.top = `${top}px`;
    quickNotice.style.bottom = "auto";
    quickNotice.style.setProperty("--assistant-notice-tail-x", `${Math.max(18, Math.min(width - 18, headX - left))}px`);
  }

  function notificationMessageMarkup(item) {
    const action = item.targetType && item.targetId
      ? `<button type="button" data-assistant-open-notification="${escapeHtml(item.id)}">Mở nội dung</button>`
      : "";
    return `<p><strong>${escapeHtml(item.title || "Thông báo")}</strong><br>${escapeHtml(item.message || "")}</p>${action}`;
  }

  function openAssistantNotificationTarget(item) {
    if (!item) return;
    if (typeof openNotificationTarget === "function") {
      openNotificationTarget(item);
      return;
    }
    if (item.targetType === "bulletin" && typeof canAccessView === "function" && canAccessView("bulletin")) {
      document.querySelector('.nav-item[data-view="bulletin"]')?.click();
      window.setTimeout(() => window.openBulletinDetailDialog?.(item.targetId), 0);
    }
  }

  function notify(item) {
    const account = typeof currentAccount === "function" ? currentAccount() : null;
    if (!assistantIsEnabled() || !account || !item || window.virtualAssistantShouldSuppressProactive?.()
      || (item.recipientAccountId && String(item.recipientAccountId) !== String(account.id))) return false;
    const notice = {
      id: String(item.id || `assistant-notice:${Date.now()}`),
      title: String(item.title || "Thông báo hệ thống"),
      message: String(item.message || ""),
      priority: String(item.priority || "info"),
      targetType: String(item.targetType || ""),
      targetId: String(item.targetId || ""),
      messageOnly: item.messageOnly === true,
    };
    if (quickNoticeItem?.id === notice.id || quickNoticeQueue.some((queued) => queued.id === notice.id)) return true;
    showWelcome();
    appendMessage("assistant", notificationMessageMarkup(notice), { html: true });
    if (quickNoticeItem) quickNoticeQueue.push(notice);
    else presentQuickNotice(notice);
    return true;
  }

  function openAssistantNotifications() {
    syncAccountAccess();
    if (!activeAccountId || !assistantIsEnabled()) return;
    if (assistantMinimized) setAssistantMinimized(false, { persist: true, focus: false });
    setPanelOpen(true);
    showWelcome();
    const items = typeof notificationItemsForCurrentAccount === "function" ? notificationItemsForCurrentAccount() : [];
    const unread = items.filter((item) => !item.readAt);
    const latest = items.slice(0, 8);
    const content = latest.length
      ? `<p>${unread.length ? `Có <strong>${unread.length}</strong> thông báo chưa đọc.` : "Các thông báo gần đây:"}</p><ul class="assistant-notification-list">${latest.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.message)}</span>${item.targetType && item.targetId ? `<button type="button" data-assistant-open-notification="${escapeHtml(item.id)}">Mở</button>` : ""}</li>`).join("")}</ul>${unread.length ? '<button type="button" data-assistant-mark-notifications-read>Đánh dấu đã đọc</button>' : ""}`
      : `Hiện chưa có thông báo mới ạ. Em sẽ nhắc ${assistantUserProfile(currentAccount()).pronoun} tại đây khi có lịch, công việc hoặc tin mới liên quan.`;
    appendMessage("assistant", content, { html: true });
  }

  window.virtualAssistantNotify = (item, options) => notify(item, options);
  window.virtualAssistantOpenNotifications = openAssistantNotifications;
  window.virtualAssistantSyncAccount = syncAccountAccess;

  function makeTaskListHtml(tasks) {
    if (!tasks.length) return "<p>Không có công việc phù hợp trong phạm vi tài khoản được xem.</p>";
    return `<ul class="assistant-task-list">${tasks.slice(0, 5).map((task) => {
      const status = taskStatus(task);
      const owner = typeof taskOwnerName === "function" ? taskOwnerName(task) : task.ownerName || "Chưa rõ người thực hiện";
      const progress = Math.max(0, Math.min(100, Number(task.progress) || 0));
      return `<li>
        <div class="assistant-task-row">
          <div><strong>${escapeHtml(task.title || "Công việc chưa có tên")}</strong><span>${escapeHtml(owner)} · Hạn ${escapeHtml(taskDueLabel(task))}</span></div>
          <button type="button" data-assistant-open-task="${escapeHtml(task.id)}" aria-label="Mở chi tiết ${escapeHtml(task.title || "công việc")}">Mở</button>
        </div>
        <div class="assistant-task-meta"><span>${escapeHtml(status)}</span><span>${progress}%</span></div>
        <div class="assistant-progress-track" aria-label="Tiến độ ${progress}%"><span style="width:${progress}%"></span></div>
      </li>`;
    }).join("")}</ul>`;
  }

  function taskSummaryHtml(tasks) {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const metrics = taskSummaryMetrics(tasks, todayKey);
    const focus = [...metrics.overdue, ...metrics.dueToday].slice(0, 5);
    return `<p>Trong phạm vi ${escapeHtml(assistantSummaryScopeLabel())} và quyền tài khoản được xem: <strong>${tasks.length}</strong> công việc; <strong>${metrics.overdue.length}</strong> quá hạn; <strong>${metrics.dueToday.length}</strong> còn hạn hôm nay; <strong>${metrics.completed.length}</strong> đã hoàn thành.</p>
      <p class="assistant-muted">${focus.length ? "Các việc cần chú ý:" : "Không có việc quá hạn hoặc đến hạn hôm nay."}</p>
      ${makeTaskListHtml(focus)}`;
  }

  function searchTasks(tasks, query) {
    const terms = searchTerms(query);
    if (!terms.length) return [];
    return tasks.map((task) => {
      const projectName = typeof projectNameForTask === "function" ? projectNameForTask(task) : task.projectName;
      const ownerName = typeof taskOwnerName === "function" ? taskOwnerName(task) : task.ownerName;
      const collaboratorNames = typeof taskCollaboratorNames === "function" ? taskCollaboratorNames(task) : task.collaboratorNames;
      const searchable = [
        task.title, task.description, task.content, task.note, task.category, projectName, ownerName, collaboratorNames,
        taskStatus(task), task.priority, task.recurrence, task.recurrenceLabel, task.startDate, task.due, task.dueTime,
        task.createdByName, task.assignedByName,
      ].filter(Boolean).join(" ");
      const score = searchMatchScore(searchable, terms);
      return { task, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.task);
  }

  function searchPeople(people, query) {
    const terms = searchTerms(query);
    if (!terms.length) return [];
    return people.map((person) => {
      const department = typeof departmentById === "function" ? departmentById(person.departmentId)?.name : "";
      const role = typeof roleById === "function" ? roleById(person.roleId)?.name : "";
      const employment = typeof personEmploymentLabel === "function" ? personEmploymentLabel(person) : "";
      const context = [department, role, employment].filter(Boolean).join(" ");
      return { person, score: personSearchScore(person.name, context, query) };
    }).filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || String(left.person.name || "").localeCompare(String(right.person.name || ""), "vi"))
      .map((item) => item.person);
  }

  function searchProjects(query, tasks) {
    const terms = searchTerms(query);
    if (!terms.length || typeof state === "undefined") return [];
    const canViewCatalog = typeof canViewProjectCatalog === "function" && canViewProjectCatalog();
    const catalog = canViewCatalog && Array.isArray(state.projectCatalog) ? state.projectCatalog : [];
    const visibleTaskProjects = tasks.map((task) => ({
      id: task.projectId || "",
      name: typeof projectNameForTask === "function" ? projectNameForTask(task) : task.projectName,
    })).filter((project) => project.name);
    const projects = new Map();
    [...catalog, ...visibleTaskProjects].forEach((project) => {
      const name = String(project?.name || "").trim();
      if (name && !projects.has(normalize(name))) projects.set(normalize(name), { ...project, name });
    });
    return [...projects.values()].map((project) => {
      const searchable = [project.name, project.code, project.shortName].filter(Boolean).join(" ");
      return { project, score: searchMatchScore(searchable, terms) };
    }).filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.project.name.localeCompare(right.project.name, "vi"))
      .map((item) => item.project);
  }

  function makePeopleListHtml(people) {
    if (!people.length) return "<p>Không tìm thấy nhân sự phù hợp trong phạm vi được phép xem.</p>";
    return `<ul class="assistant-task-list">${people.slice(0, 5).map((person) => {
      const role = typeof roleById === "function" ? roleById(person.roleId)?.name : "";
      const department = typeof departmentById === "function" ? departmentById(person.departmentId)?.name : "";
      const employment = typeof personEmploymentLabel === "function" ? personEmploymentLabel(person) : "";
      return `<li><strong>${escapeHtml(person.name || "Chưa rõ họ tên")}</strong><span class="assistant-person-meta">${escapeHtml([role, department, employment].filter(Boolean).join(" · ") || "Chưa có thông tin chức vụ")}</span></li>`;
    }).join("")}</ul>`;
  }

  function makeProjectListHtml(projects, tasks) {
    if (!projects.length) return "<p>Không tìm thấy dự án phù hợp trong phạm vi được phép xem.</p>";
    return `<ul class="assistant-task-list">${projects.slice(0, 5).map((project) => {
      const relatedCount = tasks.filter((task) => normalize(typeof projectNameForTask === "function" ? projectNameForTask(task) : task.projectName) === normalize(project.name)).length;
      return `<li><strong>${escapeHtml(project.name)}</strong><span class="assistant-person-meta">${relatedCount} công việc trong phạm vi bạn được xem</span></li>`;
    }).join("")}</ul>`;
  }

  function searchModules(query) {
    if (typeof systemModules === "undefined" || typeof canAccessView !== "function") return [];
    const terms = searchTerms(query);
    if (!terms.length) return [];
    return systemModules.filter((module) => canAccessView(module.id) && searchMatchScore(module.label, terms) > 0);
  }

  function plainText(value) {
    const template = document.createElement("template");
    template.innerHTML = String(value || "");
    return template.content.textContent || "";
  }

  function searchBulletins(query) {
    if (typeof canAccessView !== "function" || !canAccessView("bulletin") || typeof visibleBulletins !== "function") return [];
    const terms = searchTerms(query);
    if (!terms.length) return [];
    return visibleBulletins().map((post) => {
      const content = plainText(post.content);
      const voteOptions = (post.voteOptions || []).map((option) => option.label).join(" ");
      const mediaNames = (post.media || []).map((file) => file.name).join(" ");
      const searchable = [post.title, post.category, content, voteOptions, mediaNames].filter(Boolean).join(" ");
      return { post, content, score: searchMatchScore(searchable, terms) };
    }).filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || String(right.post.publishDate || "").localeCompare(String(left.post.publishDate || "")))
      .map((item) => ({ ...item.post, searchExcerpt: item.content }));
  }

  function makeBulletinListHtml(posts) {
    return `<ul class="assistant-task-list">${posts.slice(0, 5).map((post) => {
      const excerpt = String(post.searchExcerpt || "").replace(/\s+/g, " ").trim().slice(0, 180);
      const metadata = [post.category, post.publishDate].filter(Boolean).join(" · ");
      return `<li><div class="assistant-task-row"><div><strong>${escapeHtml(post.title || "Tin chưa có tiêu đề")}</strong><span>${escapeHtml(metadata)}</span></div><button type="button" data-assistant-open-view="bulletin">Mở</button></div>${excerpt ? `<span class="assistant-person-meta">${escapeHtml(excerpt)}${excerpt.length >= 180 ? "…" : ""}</span>` : ""}</li>`;
    }).join("")}</ul>`;
  }

  function makeModuleListHtml(modules) {
    return `<ul class="assistant-task-list">${modules.slice(0, 5).map((module) => `<li><div class="assistant-task-row"><strong>${escapeHtml(module.label)}</strong><button type="button" data-assistant-open-view="${escapeHtml(module.id)}">Mở</button></div></li>`).join("")}</ul>`;
  }

  function openTaskDraft(draft) {
    if (typeof canCreateRegularTasks !== "function" || !canCreateRegularTasks()) {
      appendMessage("assistant", "Tài khoản này chưa được cấp quyền tạo công việc nên em chưa thể mở biểu mẫu ạ.");
      return;
    }
    const preparedDraft = typeof draft === "string" ? { title: draft } : (draft || {});
    const taskNav = document.querySelector('.nav-item[data-view="tasks"]');
    if (taskNav && !document.getElementById("tasks")?.classList.contains("is-active")) taskNav.click();
    window.setTimeout(() => {
      if (!currentAccount() || !canCreateRegularTasks()) {
        appendMessage("assistant", "Quyền đã thay đổi trong lúc thao tác; biểu mẫu không được mở.");
        syncAccountAccess();
        return;
      }
      const trigger = document.getElementById("openTaskForm");
      if (!trigger || trigger.classList.contains("is-hidden")) {
        appendMessage("assistant", "Không thể mở biểu mẫu tạo công việc lúc này. Hãy vào mục Công việc và thử lại.");
        return;
      }
      trigger.click();
      const applied = typeof window.virtualAssistantApplyTaskDraft === "function"
        ? window.virtualAssistantApplyTaskDraft(preparedDraft)
        : false;
      const title = String(preparedDraft.title || "").trim();
      appendMessage("assistant", applied
        ? `Em đã điền bản nháp${title ? ` “${title}”` : ""} vào biểu mẫu. Anh/chị vui lòng kiểm tra lại toàn bộ thông tin rồi tự bấm Lưu công việc; Luna chưa lưu dữ liệu ạ.`
        : "Em đã mở biểu mẫu. Vui lòng kiểm tra quyền và nhập đầy đủ thông tin trước khi lưu; Luna chưa ghi dữ liệu.");
      setAssistantExpression("happy", { duration: 5000 });
      setState("speaking", "Đã mở biểu mẫu");
      window.setTimeout(() => setState("idle", "Sẵn sàng hỗ trợ"), 1400);
    }, 90);
  }

  function draftDate(value) {
    const source = String(value || "").trim();
    const iso = source.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    const local = source.match(/\b(\d{1,2})[/. \-](\d{1,2})[/. \-](20\d{2})\b/);
    const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : local ? [Number(local[3]), Number(local[2]), Number(local[1])] : null;
    if (!parts) return "";
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) return "";
    return String(parts[0]) + "-" + String(parts[1]).padStart(2, "0") + "-" + String(parts[2]).padStart(2, "0");
  }

  function uniqueDraftMatch(items, query, getName) {
    const wanted = normalize(query);
    if (!wanted) return null;
    const names = items.filter((item) => normalize(getName(item)).includes(wanted) || wanted.includes(normalize(getName(item))));
    const exact = names.filter((item) => normalize(getName(item)) === wanted);
    if (exact.length === 1) return exact[0];
    return names.length === 1 ? names[0] : null;
  }

  function createTaskDraft(raw, createMatch) {
    let details = String(createMatch && createMatch[1] || "").trim();
    const dateMatch = details.match(/(?:hạn(?: hoàn thành)?|hoàn thành trước|trước ngày)\s*(20\d{2}-\d{1,2}-\d{1,2}|\d{1,2}[/. \-]\d{1,2}[/. \-]20\d{2})/i);
    const due = draftDate(dateMatch && dateMatch[1]);
    const projectMatch = details.match(/dự án(?: là)?\s*[:\-]?\s*(.+?)(?=\s*(?:[,;]\s*)?(?:giao cho|người thực hiện|hạn|hoàn thành trước|trước ngày)\b|$)/i);
    const ownerMatch = details.match(/(?:giao cho|người thực hiện(?: là)?)\s*[:\-]?\s*(.+?)(?=\s*(?:[,;]\s*)?(?:dự án|hạn|hoàn thành trước|trước ngày)\b|$)/i);
    const projectQuery = String(projectMatch && projectMatch[1] || "").replace(/[,;]\s*$/, "").trim();
    const ownerQuery = String(ownerMatch && ownerMatch[1] || "").replace(/[,;]\s*$/, "").trim();
    if (projectMatch) details = details.replace(projectMatch[0], " ");
    if (ownerMatch) details = details.replace(ownerMatch[0], " ");
    if (dateMatch) details = details.replace(dateMatch[0], " ");
    details = details.replace(/^(?:tạo|thêm)\s+(?:một\s+)?(?:công việc|việc)\s*(?::|là|-)?\s*/i, "")
      .replace(/^(?:giúp tôi|cho tôi|mới)\s*/i, "").replace(/^[,;:\s]+|[,;:\s]+$/g, "").trim();

    const projects = searchProjects(projectQuery, currentTasks());
    const project = uniqueDraftMatch(projects, projectQuery, (item) => item.name);
    const people = typeof state !== "undefined" && typeof canCreateRegularTaskForPerson === "function"
      ? (state.people || []).filter((person) => canCreateRegularTaskForPerson(person.id)) : [];
    const owner = uniqueDraftMatch(people, ownerQuery, (item) => item.name);
    const self = typeof currentPerson === "function" ? currentPerson() : null;
    const ownerId = owner ? owner.id : ownerQuery ? "" : self && canCreateRegularTaskForPerson(self.id) ? self.id : "";
    const now = new Date();
    return {
      kind: "create",
      draftId: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "luna-draft-" + Date.now(),
      title: details,
      projectId: project && project.id || "",
      projectName: project && project.name || "",
      unresolvedProject: projectQuery && !project ? projectQuery : "",
      ownerId: ownerId,
      ownerName: owner ? owner.name : ownerId && self && self.id === ownerId ? self.name : "",
      unresolvedOwner: ownerQuery && !owner ? ownerQuery : "",
      startDate: String(now.getFullYear()) + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0"),
      due: due,
      sourceText: raw,
    };
  }

  function showTaskDraftPreview(draft) {
    const rows = [
      ["Tên công việc", draft.title || "Chưa có, cần nhập trong biểu mẫu"],
      ["Dự án", draft.projectName || draft.unresolvedProject || "Chưa xác định, vui lòng chọn"],
      ["Người thực hiện", draft.ownerName || draft.unresolvedOwner || "Mặc định là tài khoản hiện tại, vui lòng kiểm tra"],
      ["Ngày bắt đầu", draft.startDate],
      ["Hạn hoàn thành", draft.due || "Chưa nêu, vui lòng chọn"],
    ];
    const cells = rows.map((row) => "<dt>" + escapeHtml(row[0]) + "</dt><dd>" + escapeHtml(row[1]) + "</dd>").join("");
    const html = '<section class="assistant-task-preview"><h3>Kiểm tra bản nháp công việc</h3><dl>' + cells
      + '</dl><p class="assistant-ai-meta">Chưa có dữ liệu nào được lưu. Sau bước này, anh/chị vẫn cần kiểm tra và tự bấm Lưu.</p>'
      + '<div class="assistant-task-preview-actions"><button type="button" data-assistant-confirm-task="' + escapeHtml(draft.draftId)
      + '">Xem và điền biểu mẫu</button><button type="button" data-assistant-cancel-task="' + escapeHtml(draft.draftId) + '">Hủy</button></div></section>';
    pendingTaskDrafts.set(draft.draftId, draft);
    appendMessage("assistant", html, { html: true });
  }

  function showProgressDraftPreview(task, nextProgress) {
    if (!task || typeof canUpdateTaskProgress !== "function" || !canUpdateTaskProgress(task)) {
      appendMessage("assistant", "Tài khoản này không có quyền cập nhật tiến độ công việc đó.");
      return;
    }
    const draft = {
      kind: "progress",
      draftId: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "luna-update-" + Date.now(),
      taskId: String(task.id),
      title: String(task.title || "Công việc"),
      currentProgress: Math.max(0, Math.min(100, Number(task.progress) || 0)),
      nextProgress: Math.max(0, Math.min(100, Number(nextProgress) || 0)),
    };
    pendingTaskDrafts.set(draft.draftId, draft);
    const html = '<section class="assistant-task-preview"><h3>Xem trước cập nhật tiến độ</h3><dl><dt>Công việc</dt><dd>'
      + escapeHtml(draft.title) + '</dd><dt>Tiến độ hiện tại</dt><dd>' + draft.currentProgress + '%</dd><dt>Tiến độ đề xuất</dt><dd>'
      + draft.nextProgress + '%</dd></dl><p class="assistant-ai-meta">Chưa có dữ liệu nào được lưu. Sau khi xác nhận, anh/chị vẫn cần kiểm tra và tự lưu trong chi tiết công việc.</p>'
      + '<div class="assistant-task-preview-actions"><button type="button" data-assistant-confirm-update="' + escapeHtml(draft.draftId)
      + '">Mở bản cập nhật</button><button type="button" data-assistant-cancel-task="' + escapeHtml(draft.draftId) + '">Hủy</button></div></section>';
    appendMessage("assistant", html, { html: true });
  }

  function aiSourceHtml(payload) {
    const sources = Array.isArray(payload && payload.sources) ? payload.sources.slice(0, 8) : [];
    const updatedAt = payload && payload.updatedAt ? new Date(payload.updatedAt).toLocaleString("vi-VN") : "";
    const meta = [payload && payload.scope, updatedAt ? "Dữ liệu cập nhật " + updatedAt : ""].filter(Boolean).join(" · ");
    const sourceRows = sources.map((source) => {
      const type = String(source && source.type || "");
      let button = "";
      if (type === "task" && source.id) button = '<button type="button" data-assistant-open-task="' + escapeHtml(source.id) + '">Mở</button>';
      if (type === "bulletin" && source.id) button = '<button type="button" data-assistant-open-bulletin="' + escapeHtml(source.id) + '">Mở</button>';
      if (type === "calendar" && source.id) button = '<button type="button" data-assistant-open-calendar="' + escapeHtml(source.id) + '">Mở</button>';
      return "<div><span>" + escapeHtml(source.title || "Nguồn dữ liệu") + (source.detail ? " · " + escapeHtml(source.detail) : "") + "</span>" + button + "</div>";
    }).join("");
    return (meta ? '<p class="assistant-ai-meta">' + escapeHtml(meta) + "</p>" : "")
      + (sourceRows ? '<section class="assistant-ai-sources"><strong>Nguồn dữ liệu trong phạm vi được phép</strong>' + sourceRows + "</section>" : "");
  }

  async function askLunaAi(question, sequence) {
    const accountId = activeAccountId;
    const requestIsCurrent = () => sequence === requestSequence && accountId === activeAccountId && !panel.classList.contains("is-hidden");
    if (!requestIsCurrent()) return;
    if (typeof usingSupabaseSync !== "function" || !usingSupabaseSync() || typeof sharedSync === "undefined" || !sharedSync.session) {
      appendMessage("assistant", "AI Luna cần kết nối hệ thống online để trả lời. Tìm kiếm cục bộ vẫn hoạt động, nhưng câu hỏi tự do chưa thể gửi khi offline.");
      setState("speaking", "AI cần kết nối online");
      window.setTimeout(() => setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ"), 1800);
      return;
    }
    if (typeof sharedJsonRequest !== "function") {
      appendMessage("assistant", "Kênh AI chưa sẵn sàng trên phiên bản hệ thống này. Hãy tải lại trang sau khi cập nhật.");
      return;
    }
    if (aiRequestPending) {
      appendMessage("assistant", `Em đang xử lý câu hỏi trước ạ. ${assistantUserProfile(currentAccount()).pronoun} vui lòng chờ câu trả lời rồi gửi tiếp.`);
      return;
    }

    aiRequestPending = true;
    const controller = new AbortController();
    aiRequestController = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 25000);
    input.disabled = true;
    const sendButton = root.querySelector(".assistant-send-button");
    if (sendButton) sendButton.disabled = true;
    try {
      const { response, payload } = await sharedJsonRequest("luna-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
        signal: controller.signal,
      });
      if (!requestIsCurrent()) return;
      if (!response.ok) throw new Error(payload?.error || "AI Luna chưa thể trả lời lúc này.");
      const reply = String(payload?.reply || "").trim();
      if (!reply) throw new Error("AI Luna chưa trả về nội dung. Bạn hãy thử diễn đạt câu hỏi khác.");
      appendMessage("assistant", reply);
      const sourceMarkup = aiSourceHtml(payload);
      if (sourceMarkup) appendMessage("assistant", sourceMarkup, { html: true });
      setAssistantExpression("happy", { duration: 6500 });
      setState("speaking", "Luna đã trả lời");
      window.setTimeout(() => setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ"), 2200);
    } catch (error) {
      if (!requestIsCurrent()) return;
      const message = error?.name === "AbortError"
        ? timedOut ? "Yêu cầu AI mất quá nhiều thời gian. Hãy thử lại khi kết nối ổn định hơn." : "Yêu cầu AI đã được hủy."
        : error?.message || "Không kết nối được AI Luna. Tìm kiếm cục bộ vẫn dùng được.";
      appendMessage("assistant", message);
      setState("speaking", "Chưa kết nối được AI");
      window.setTimeout(() => setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ"), 2200);
    } finally {
      window.clearTimeout(timeout);
      if (aiRequestController === controller) {
        aiRequestController = null;
        aiRequestPending = false;
        input.disabled = false;
        if (sendButton) sendButton.disabled = false;
      }
    }
  }

  async function handleCommand(rawText, sequence = requestSequence) {
    const raw = String(rawText || "").trim();
    const text = normalize(raw);
    if (!raw || !currentAccount()) return;

    if (/^(mo )?(thong bao|trung tam thong bao)$/.test(text)) {
      openAssistantNotifications();
      return;
    }

    const progressUpdateMatch = raw.match(/(?:cập nhật|điều chỉnh)\s+(?:tiến độ\s+)?(?:công việc|việc)\s+(.+?)\s+(?:lên|thành|tới)\s*(\d{1,3})\s*%/i);
    if (progressUpdateMatch) {
      const requestedProgress = Number(progressUpdateMatch[2]);
      if (requestedProgress < 0 || requestedProgress > 100) {
        appendMessage("assistant", "Tiến độ cần nằm trong khoảng từ 0% đến 100%.");
        return;
      }
      if (typeof canViewTasks !== "function" || !canViewTasks()) {
        appendMessage("assistant", "Tài khoản này chưa được cấp quyền tra cứu công việc.");
        return;
      }
      const query = progressUpdateMatch[1].trim();
      const matches = searchTasks(currentTasks(), query);
      const task = uniqueDraftMatch(matches, query, (item) => item.title);
      if (!task) {
        appendMessage("assistant", matches.length > 1
          ? "Có nhiều công việc phù hợp. Vui lòng nêu rõ hơn tên công việc để em tránh cập nhật nhầm."
          : "Em chưa tìm được công việc phù hợp trong phạm vi được phép xem.");
        return;
      }
      showProgressDraftPreview(task, requestedProgress);
      return;
    }

    const createMatch = raw.match(/(?:hãy\s+)?(?:tạo|thêm)\s+(?:một\s+)?(?:công\s+việc|việc)\s*(?::|là|-)?\s*(.*)/i);
    if (createMatch) {
      if (typeof canCreateRegularTasks !== "function" || !canCreateRegularTasks()) {
        appendMessage("assistant", "Tài khoản này chưa được cấp quyền tạo công việc. Em không thể chuẩn bị bản nháp ạ.");
        return;
      }
      showTaskDraftPreview(createTaskDraft(raw, createMatch));
      return;
    }

    const taskAccess = typeof canViewTasks === "function" && canViewTasks();
    const tasks = currentTasks();
    const overdueQuery = text === "qua han" || ((text.includes("cong viec") || text.includes("nhiem vu")) && text.includes("qua han"));
    const todayQuery = text === "hom nay" || ((text.includes("cong viec") || text.includes("nhiem vu")) && (text.includes("hom nay") || text.includes("den han hom nay")));
    const summaryQuery = text === "tinh hinh" || text.includes("tinh hinh cong viec") || text.includes("tong quan cong viec") || text.includes("cong viec cua toi");
    if (overdueQuery) {
      if (!taskAccess) {
        appendMessage("assistant", "Tài khoản này chưa được cấp quyền tra cứu danh sách công việc quá hạn.");
        return;
      }
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const overdue = taskSummaryMetrics(tasks, todayKey).overdue;
      appendMessage("assistant", `<p>Có <strong>${overdue.length}</strong> công việc quá hạn mà tài khoản này được xem.</p>${makeTaskListHtml(overdue)}`, { html: true });
      setState("speaking", "Đã tra cứu công việc");
      window.setTimeout(() => setState("idle", "Sẵn sàng hỗ trợ"), 1400);
      return;
    }

    if (todayQuery) {
      if (!taskAccess) {
        appendMessage("assistant", "Tài khoản này chưa được cấp quyền tra cứu công việc đến hạn hôm nay.");
        return;
      }
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const dueToday = taskSummaryMetrics(tasks, todayKey).dueToday;
      appendMessage("assistant", `<p>Có <strong>${dueToday.length}</strong> công việc chưa hoàn tất đến hạn hôm nay trong phạm vi bạn được xem.</p>${makeTaskListHtml(dueToday)}`, { html: true });
      setState("speaking", "Đã tra cứu công việc");
      window.setTimeout(() => setState("idle", "Sẵn sàng hỗ trợ"), 1400);
      return;
    }

    if (summaryQuery) {
      if (!taskAccess) {
        appendMessage("assistant", "Tài khoản này chưa được cấp quyền xem tổng hợp công việc.");
        return;
      }
      appendMessage("assistant", taskSummaryHtml(currentSummaryTasks()), { html: true });
      setState("speaking", "Đã tra cứu công việc");
      window.setTimeout(() => setState("idle", "Sẵn sàng hỗ trợ"), 1400);
      return;
    }

    const peopleQuery = /nhan su|nhan vien|can bo|ho so nhan|ho so cua toi|thong tin ca nhan/.test(text);
    const projectQuery = /du an/.test(text);
    const taskQuery = /cong viec|nhiem vu/.test(text);
    const ownProfileQuery = peopleQuery && /(cua toi|cua minh|ban than|ho so cua toi)/.test(text);
    const people = currentPeople(ownProfileQuery);
    const taskMatches = taskAccess && !peopleQuery && (!projectQuery || taskQuery) ? searchTasks(tasks, raw) : [];
    const peopleMatches = !projectQuery && (peopleQuery || (!taskQuery && typeof canViewPeople === "function" && canViewPeople()))
      ? searchPeople(people, raw)
      : [];
    if (ownProfileQuery && people.length) peopleMatches.splice(0, peopleMatches.length, ...people);
    const projectMatches = !peopleQuery ? searchProjects(raw, tasks) : [];
    const bulletinMatches = !peopleQuery && !projectQuery && !taskQuery ? searchBulletins(raw) : [];
    const moduleMatches = !peopleQuery && !projectQuery && !taskQuery ? searchModules(raw) : [];
    const sections = [];

    if (taskMatches.length) sections.push(`<p><strong>Công việc (${taskMatches.length})</strong></p>${makeTaskListHtml(taskMatches)}`);
    if (peopleMatches.length) {
      const limitedPeople = peopleMatches.filter((person) => people.includes(person));
      sections.push(`<p><strong>Nhân sự (${limitedPeople.length})</strong></p>${makePeopleListHtml(limitedPeople)}`);
    }
    if (projectMatches.length) sections.push(`<p><strong>Dự án (${projectMatches.length})</strong></p>${makeProjectListHtml(projectMatches, tasks)}`);
    if (bulletinMatches.length) sections.push(`<p><strong>Thông tin nội bộ (${bulletinMatches.length})</strong></p>${makeBulletinListHtml(bulletinMatches)}`);
    if (moduleMatches.length) sections.push(`<p><strong>Mục hệ thống</strong></p>${makeModuleListHtml(moduleMatches)}`);

    if (sections.length) {
      appendMessage("assistant", sections.join("<hr class=\"assistant-result-divider\">"), { html: true });
    } else if (peopleQuery && !((typeof canViewPeople === "function" && canViewPeople()) || ownProfileQuery)) {
      appendMessage("assistant", "Tài khoản này chưa được cấp quyền tra cứu danh sách nhân sự. Chỉ có thể xem hồ sơ của chính mình.");
    } else if (!searchTerms(raw).length) {
      await askLunaAi(raw, sequence);
      return;
    } else {
      await askLunaAi(raw, sequence);
      return;
    }
    setState("speaking", "Đã tra cứu công việc");
    window.setTimeout(() => setState("idle", "Sẵn sàng hỗ trợ"), 1400);
  }

  document.getElementById("assistantComposer").addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    requestSequence += 1;
    const currentRequest = requestSequence;
    appendMessage("user", text);
    input.value = "";
    setState("thinking", "Đang tra cứu trong phạm vi được phép");
    window.setTimeout(() => {
      if (currentRequest === requestSequence && !panel.classList.contains("is-hidden")) handleCommand(text);
    }, 180);
  });

  root.addEventListener("click", (event) => {
    const confirmUpdateButton = event.target.closest("[data-assistant-confirm-update]");
    if (confirmUpdateButton) {
      const draftId = confirmUpdateButton.dataset.assistantConfirmUpdate;
      const draft = pendingTaskDrafts.get(draftId);
      const task = draft && currentTasks().find((item) => String(item.id) === draft.taskId);
      const currentProgress = Math.max(0, Math.min(100, Number(task && task.progress) || 0));
      if (!draft || !task || typeof canUpdateTaskProgress !== "function" || !canUpdateTaskProgress(task)) {
        pendingTaskDrafts.delete(draftId);
        appendMessage("assistant", "Công việc không còn xem được hoặc quyền cập nhật đã thay đổi. Em chưa mở bản cập nhật.");
        return;
      }
      if (currentProgress !== draft.currentProgress) {
        pendingTaskDrafts.delete(draftId);
        appendMessage("assistant", "Tiến độ công việc vừa thay đổi. Em đã hủy bản xem trước cũ; vui lòng tra cứu và xác nhận lại.");
        return;
      }
      pendingTaskDrafts.delete(draftId);
      const applied = typeof window.virtualAssistantApplyProgressDraft === "function"
        && window.virtualAssistantApplyProgressDraft(draft);
      appendMessage("assistant", applied
        ? "Em đã mở bản cập nhật tiến độ. Vui lòng kiểm tra nội dung và tự lưu trong chi tiết công việc; Luna chưa ghi thay đổi."
        : "Không thể mở bản cập nhật công việc lúc này. Không có dữ liệu nào được lưu.");
      return;
    }
    const confirmDraftButton = event.target.closest("[data-assistant-confirm-task]");
    if (confirmDraftButton) {
      const draftId = confirmDraftButton.dataset.assistantConfirmTask;
      const draft = pendingTaskDrafts.get(draftId);
      if (!draft || typeof canCreateRegularTasks !== "function" || !canCreateRegularTasks()) {
        pendingTaskDrafts.delete(draftId);
        appendMessage("assistant", "Bản nháp đã hết hiệu lực hoặc quyền tạo việc không còn. Em chưa mở biểu mẫu ạ.");
        return;
      }
      if (draft.ownerId && typeof canCreateRegularTaskForPerson === "function" && !canCreateRegularTaskForPerson(draft.ownerId)) {
        draft.ownerId = "";
        draft.ownerName = "";
        appendMessage("assistant", "Quyền giao cho người được chọn đã thay đổi. Em bỏ người nhận khỏi bản nháp; vui lòng kiểm tra và chọn lại trong biểu mẫu.");
      }
      pendingTaskDrafts.delete(draftId);
      openTaskDraft(draft);
      return;
    }
    const cancelDraftButton = event.target.closest("[data-assistant-cancel-task]");
    if (cancelDraftButton) {
      pendingTaskDrafts.delete(cancelDraftButton.dataset.assistantCancelTask);
      cancelDraftButton.closest(".assistant-task-preview")?.remove();
      appendMessage("assistant", "Em đã hủy bản nháp; không có dữ liệu nào được lưu.");
      return;
    }
    const commandButton = event.target.closest("[data-assistant-command]");
    if (commandButton) {
      const command = commandButton.dataset.assistantCommand;
      if (command === "mở thông báo") {
        handleCommand(command);
        return;
      }
      appendMessage("user", command);
      setState("thinking", "Đang tra cứu trong phạm vi được phép");
      window.setTimeout(() => handleCommand(command), 150);
      return;
    }

    const taskButton = event.target.closest("[data-assistant-open-task]");
    if (taskButton) {
      const task = currentTasks().find((item) => String(item.id) === taskButton.dataset.assistantOpenTask);
      if (task && typeof canOpenTask === "function" && canOpenTask(task) && typeof openTaskDetailDialog === "function") {
        openTaskDetailDialog(task.id);
      }
    }

    const bulletinButton = event.target.closest("[data-assistant-open-bulletin]");
    if (bulletinButton && typeof canAccessView === "function" && canAccessView("bulletin")
      && typeof visibleBulletins === "function" && visibleBulletins().some((post) => String(post.id) === bulletinButton.dataset.assistantOpenBulletin)) {
      document.querySelector('.nav-item[data-view="bulletin"]')?.click();
      window.setTimeout(() => window.openBulletinDetailDialog?.(bulletinButton.dataset.assistantOpenBulletin), 0);
    }

    const calendarButton = event.target.closest("[data-assistant-open-calendar]");
    if (calendarButton && typeof canAccessView === "function" && canAccessView("calendar")
      && typeof state !== "undefined" && (state.calendarEvents || []).some((item) => String(item.id) === calendarButton.dataset.assistantOpenCalendar)) {
      document.querySelector('.nav-item[data-view="calendar"]')?.click();
      window.setTimeout(() => window.openCalendarDetailDialog?.(calendarButton.dataset.assistantOpenCalendar), 0);
    }

    const viewButton = event.target.closest("[data-assistant-open-view]");
    if (viewButton) {
      const viewId = viewButton.dataset.assistantOpenView;
      if (typeof canAccessView === "function" && canAccessView(viewId)) {
        Array.from(document.querySelectorAll(".nav-item[data-view]"))
          .find((item) => item.dataset.view === viewId)?.click();
      }
    }

    const notificationButton = event.target.closest("[data-assistant-open-notification]");
    if (notificationButton && typeof notificationItemsForCurrentAccount === "function") {
      const item = notificationItemsForCurrentAccount().find((candidate) => candidate.id === notificationButton.dataset.assistantOpenNotification);
      if (item) openAssistantNotificationTarget(item);
    }
    if (event.target.closest("[data-assistant-mark-notifications-read]") && typeof markAllNotificationsRead === "function") {
      markAllNotificationsRead();
      appendMessage("assistant", "Đã đánh dấu các thông báo hiện có là đã đọc.");
    }
  });

  quickNoticeText?.addEventListener("click", acknowledgeQuickNotice);

  launcher.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || isMobileAssistantViewport()) return;
    suppressLauncherClickUntil = 0;
    const rect = launcher.getBoundingClientRect();
    pointerDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    launcher.setPointerCapture?.(event.pointerId);
  });

  launcher.addEventListener("pointermove", (event) => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pointerDrag.startX;
    const deltaY = event.clientY - pointerDrag.startY;
    if (!pointerDrag.moved && Math.hypot(deltaX, deltaY) < 5) return;
    pointerDrag.moved = true;
    event.preventDefault();
    launcher.dataset.dragging = "true";
    launcher.setAttribute("aria-grabbed", "true");
    placeLauncher(pointerDrag.startLeft + deltaX, pointerDrag.startTop + deltaY);
    positionAssistantPanel();
    positionQuickNotice();
  });

  function finishLauncherDrag(event) {
    if (!pointerDrag || (event && pointerDrag.pointerId !== event.pointerId)) return;
    if (pointerDrag.moved) {
      const rect = launcher.getBoundingClientRect();
      placeLauncher(rect.left, rect.top, { persist: true });
      suppressLauncherClickUntil = Date.now() + 450;
      launcher.setAttribute("aria-grabbed", "false");
      window.setTimeout(() => launcher.removeAttribute("data-dragging"), 180);
      positionAssistantPanel();
      positionQuickNotice();
    }
    pointerDrag = null;
  }

  launcher.addEventListener("pointerup", finishLauncherDrag);
  launcher.addEventListener("pointercancel", finishLauncherDrag);
  launcher.addEventListener("lostpointercapture", finishLauncherDrag);
  launcher.addEventListener("click", (event) => {
    if (Date.now() < suppressLauncherClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (quickNoticeItem) acknowledgeQuickNotice({ showNext: false });
    setPanelOpen(true);
  });
  minimizeButton.addEventListener("click", () => setAssistantMinimized(true));
  restoreButton.addEventListener("click", () => setAssistantMinimized(false));
  document.getElementById("assistantClose").addEventListener("click", () => setPanelOpen(false));

  voiceButton.addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceNotice.textContent = "Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Bạn có thể dùng nhập liệu bằng bàn phím hoặc công cụ đọc chính tả của thiết bị.";
      return;
    }
    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      voiceNotice.textContent = "Nhập giọng nói cần kết nối HTTPS an toàn.";
      return;
    }
    if (recognition) {
      recognition.stop();
      recognition = null;
      return;
    }
    try {
      recognition = new SpeechRecognition();
      recognition.lang = "vi-VN";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setState("listening", "Đang nghe tiếng Việt");
      recognition.onresult = (event) => {
        const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
        if (transcript) {
          input.value = transcript;
          input.focus({ preventScroll: true });
          voiceNotice.textContent = "Đã nhận dạng. Hãy kiểm tra nội dung rồi bấm Gửi; trợ lý không tự lưu công việc.";
        }
      };
      recognition.onerror = (event) => {
        const message = event.error === "not-allowed"
          ? "Chưa được cấp quyền micro. Cho phép micro trong trình duyệt rồi thử lại."
          : event.error === "no-speech"
            ? "Chưa nghe rõ tiếng nói. Hãy thử lại ở nơi yên tĩnh hơn."
            : "Không thể nhận dạng giọng nói lúc này. Bạn có thể nhập bằng bàn phím.";
        voiceNotice.textContent = message;
        setState("idle", "Sẵn sàng hỗ trợ");
      };
      recognition.onend = () => {
        recognition = null;
        if (!panel.classList.contains("is-hidden")) setState("idle", "Sẵn sàng hỗ trợ");
      };
      voiceNotice.textContent = "Đang nghe...";
      recognition.start();
    } catch {
      recognition = null;
      voiceNotice.textContent = "Không thể khởi động micro. Hãy kiểm tra quyền micro và thử lại.";
      setState("idle", "Sẵn sàng hỗ trợ");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target === launcher && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      if (isMobileAssistantViewport()) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const rect = launcher.getBoundingClientRect();
      const step = event.shiftKey ? 40 : 16;
      const delta = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
      }[event.key];
      placeLauncher(rect.left + delta[0], rect.top + delta[1], { persist: true });
      positionAssistantPanel();
      return;
    }
    if (event.key === "Escape" && !panel.classList.contains("is-hidden")) setPanelOpen(false);
  });
  window.addEventListener("resize", () => {
    if (isMobileAssistantViewport()) {
      restoreLauncherPosition(activeAccountId);
    } else if (launcher.style.left && launcher.style.top) {
      const rect = launcher.getBoundingClientRect();
      placeLauncher(rect.left, rect.top, { persist: true });
    }
    positionMinimizeButton();
    positionAssistantPanel();
    positionQuickNotice();
  });
  window.addEventListener("storage", () => { syncAccountAccess(); changeMoodIfDue(); });
  window.addEventListener("phuc-thinh-theme-change", (event) => applyAssistantTheme(event.detail));
  window.addEventListener("phuc-thinh-luna-visibility-change", syncAccountAccess);
  window.addEventListener("focus", () => { syncAccountAccess(); changeMoodIfDue(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) changeMoodIfDue(); });
  window.setInterval(() => changeMoodIfDue(), 60 * 1000);
  const accountObserver = new MutationObserver(syncAccountAccess);
  ["currentUserLabel", "currentUserMeta"].forEach((id) => {
    const node = document.getElementById(id);
    if (node) accountObserver.observe(node, { childList: true, characterData: true, subtree: true });
  });

  window.virtualAssistantSetExpression = (expression, options) => setAssistantExpression(expression, options);
  applyAssistantCharacterImage();
  setState("idle", "Sẵn sàng hỗ trợ");
  syncAccountAccess();
})();
