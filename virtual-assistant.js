(() => {
  const root = document.getElementById("virtualAssistant");
  if (!root) return;
  const assistantAssetVersion = document.querySelector('meta[name="application-version"]')?.content || "1";

  function assistantAssetUrl(path) {
    const url = new URL(path, window.location.href);
    url.searchParams.set("v", assistantAssetVersion);
    return url.href;
  }

  const panel = document.getElementById("assistantPanel");
  const speechTail = root.querySelector(".assistant-speech-tail");
  const launcher = document.getElementById("assistantLauncher");
  const messages = document.getElementById("assistantMessages");
  const input = document.getElementById("assistantInput");
  const stateLabel = document.getElementById("assistantStateLabel");
  const voiceButton = document.getElementById("assistantVoiceButton");
  const voiceNotice = document.getElementById("assistantVoiceNotice");
  const speechToggle = document.getElementById("lunaSpeechEnabled");
  const announcementSpeechToggle = document.getElementById("lunaAnnouncementSpeechEnabled");
  const wakeWordToggle = document.getElementById("lunaWakeWordEnabled");
  const wakeWordStatus = document.getElementById("lunaWakeWordStatus");
  const speechStopButton = document.getElementById("lunaSpeechStop");
  const taskForm = document.getElementById("taskForm");
  const taskVoiceWizard = document.getElementById("taskVoiceWizard");
  const taskVoiceWizardPrompt = document.getElementById("taskVoiceWizardPrompt");
  const taskVoiceWizardStatus = document.getElementById("taskVoiceWizardStatus");
  const taskVoiceWizardSpeak = document.getElementById("taskVoiceWizardSpeak");
  const taskVoiceWizardContinue = document.getElementById("taskVoiceWizardContinue");
  const taskVoiceWizardSkip = document.getElementById("taskVoiceWizardSkip");
  const taskVoiceWizardCancel = document.getElementById("taskVoiceWizardCancel");
  const taskWizardConversation = document.getElementById("taskWizardConversation");
  const taskWizardReplyForm = document.getElementById("taskWizardReplyForm");
  const taskWizardReply = document.getElementById("taskWizardReply");
  const taskWizardCompactPrompt = document.getElementById("taskVoiceWizardCompactPrompt");
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
  let wakeRecognition = null;
  let voiceCaptureMode = "assistant";
  let voiceRecognitionTimer = 0;
  let wakeRestartTimer = 0;
  let pendingSpeechItem = null;
  let wakeListeningEnabled = false;
  let wakePausedForSpeech = false;
  const speechQueue = [];
  let speechPlaybackSequence = 0;
  let speechActive = false;
  let speechActiveKind = "";
  let activeSpeechItem = null;
  let activeSpeechUtterance = null;
  let speechPlaybackWatchdog = 0;
  let speechRetryItem = null;
  let speechWaitingForGesture = false;
  let requestSequence = 0;
  let welcomeAccountId = "";
  let positionAccountId = null;
  let pointerDrag = null;
  let suppressLauncherClickUntil = 0;
  let interactionState = "idle";
  let quickNoticeItem = null;
  const quickNoticeQueue = [];
  const assistantHistoryRetentionMs = 7 * 24 * 60 * 60 * 1000;
  let assistantHistoryAccountId = "";
  let assistantHistoryEntries = [];
  let lastMoodChangeAt = 0;
  let currentMood = null;
  let currentExpression = "idle";
  let expressionResetTimer = 0;
  let systemThemePreset = document.body.dataset.systemTheme || "default";
  let aiRequestPending = false;
  let aiRequestController = null;
  const pendingTaskDrafts = new Map();
  const taskWizard = { active: false, mode: "create", steps: [], index: 0, applyingAnswer: false, awaitingConfirmation: false, accountId: "", taskId: "", kind: "", form: null };
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
    const url = assistantAssetUrl(source);
    if (assistantPoseImage && assistantPoseImage.src !== url) assistantPoseImage.src = url;
    root.dataset.expression = currentExpression;
    root.dataset.outfitTheme = systemThemePreset;
    if (restoreImage?.hasAttribute("src")) {
      const outfitUrl = assistantAssetUrl(currentAssistantOutfit());
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
      restoreImage.src = assistantAssetUrl(currentAssistantOutfit());
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

  function positionTaskWizardBubble() {
    if (!taskVoiceWizard || taskVoiceWizard.classList.contains("is-hidden")) return;
    const mobile = isMobileAssistantViewport();
    const margin = 12;
    const gap = 18;
    const width = Math.min(mobile ? 360 : 390, window.innerWidth - margin * 2);
    taskVoiceWizard.style.width = `${width}px`;
    taskVoiceWizard.style.maxHeight = `${Math.max(1, window.innerHeight - margin * 2)}px`;
    const anchor = launcher.getBoundingClientRect();
    const height = taskVoiceWizard.offsetHeight;
    const centerX = anchor.left + anchor.width / 2;
    const roomAbove = anchor.top - margin - gap;
    const roomBelow = window.innerHeight - anchor.bottom - margin - gap;
    const left = clamp(centerX - width / 2, margin, window.innerWidth - width - margin);
    let placement = roomAbove >= height ? "above" : roomBelow >= height ? "below" : roomAbove >= roomBelow ? "above" : "below";
    let top = placement === "above"
      ? clamp(anchor.top - height - gap, margin, window.innerHeight - height - margin)
      : clamp(anchor.bottom + gap, margin, window.innerHeight - height - margin);
    const activeTarget = taskForm?.querySelector("[data-luna-current-step]");
    if (taskWizard.active && !taskWizard.awaitingConfirmation && activeTarget) {
      const targetRect = activeTarget.getBoundingClientRect();
      const openPickerPanels = ["taskOwnerPanel", "taskCollaboratorPanel"]
        .map((id) => document.getElementById(id))
        .filter((element) => element && !element.classList.contains("is-hidden"))
        .map((element) => element.getBoundingClientRect());
      const targetBottom = Math.max(targetRect.bottom, ...openPickerPanels.map((rect) => rect.bottom));
      const targetTop = Math.min(targetRect.top, ...openPickerPanels.map((rect) => rect.top));
      const fitsBetweenTargetAndLuna = targetBottom + gap + height <= anchor.top + anchor.height * 0.08 - gap;
      if (fitsBetweenTargetAndLuna) {
        placement = "above";
        top = anchor.top + anchor.height * 0.08 - height - gap;
      } else {
        const currentRect = { left, right: left + width, top, bottom: top + height };
        const overlapsTarget = currentRect.left < targetRect.right && currentRect.right > targetRect.left
          && currentRect.top < targetBottom && currentRect.bottom > targetTop;
        if (overlapsTarget && targetTop - height - gap >= margin) {
          top = targetTop - height - gap;
        } else if (overlapsTarget && targetBottom + height + gap <= window.innerHeight - margin) {
          placement = "below";
          top = targetBottom + gap;
        }
      }
    }
    taskVoiceWizard.dataset.placement = placement;
    taskVoiceWizard.style.left = `${left}px`;
    taskVoiceWizard.style.top = `${top}px`;
    taskVoiceWizard.style.setProperty("--task-wizard-tail-x", `${clamp(centerX - left, 20, width - 20)}px`);
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

  function assistantHistoryStorageKey(accountId) {
    return `phuc-thinh-luna-history-v1:${accountId}`;
  }

  function assistantHistoryAccessSignature() {
    const account = typeof currentAccount === "function" ? currentAccount() : null;
    return JSON.stringify({
      role: String(account?.role || ""),
      personId: String(account?.personId || account?.person_id || ""),
      departmentId: String(account?.departmentId || account?.department_id || ""),
      accessGrants: account?.accessGrants || account?.permissions || {},
      canViewTasks: typeof canViewTasks === "function" && canViewTasks(),
      canViewPeople: typeof canViewPeople === "function" && canViewPeople(),
      canViewBulletins: typeof canViewBulletins === "function" && canViewBulletins(),
      canViewCalendar: typeof canViewCalendar === "function" && canViewCalendar(),
    });
  }

  function restoreAssistantHistory(accountId) {
    assistantHistoryAccountId = String(accountId || "");
    assistantHistoryEntries = [];
    if (!assistantHistoryAccountId) return;
    const cutoff = Date.now() - assistantHistoryRetentionMs;
    const accessSignature = assistantHistoryAccessSignature();
    try {
      const stored = JSON.parse(localStorage.getItem(assistantHistoryStorageKey(assistantHistoryAccountId)) || "[]");
      assistantHistoryEntries = (Array.isArray(stored) ? stored : [])
        .filter((entry) => entry && ["user", "assistant"].includes(entry.kind)
          && typeof entry.text === "string"
          && entry.accessSignature === accessSignature
          && Number.isFinite(Date.parse(entry.createdAt))
          && Date.parse(entry.createdAt) >= cutoff)
        .map((entry) => ({ kind: entry.kind, text: entry.text.slice(0, 4000), accessSignature, createdAt: entry.createdAt }))
        .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
      assistantHistoryEntries.forEach((entry) => {
        const message = document.createElement("article");
        message.className = `assistant-message is-${entry.kind}`;
        message.dataset.createdAt = entry.createdAt;
        message.textContent = entry.text;
        messages.append(message);
      });
      localStorage.setItem(assistantHistoryStorageKey(assistantHistoryAccountId), JSON.stringify(assistantHistoryEntries));
      messages.scrollTop = messages.scrollHeight;
    } catch {
      assistantHistoryEntries = [];
    }
  }

  function persistAssistantMessage(kind, message) {
    if (!assistantHistoryAccountId || assistantHistoryAccountId !== activeAccountId || !["user", "assistant"].includes(kind)) return;
    const copy = message.cloneNode(true);
    copy.querySelectorAll("button, script, style").forEach((node) => node.remove());
    copy.querySelectorAll("a[href]").forEach((anchor) => {
      try {
        const url = new URL(anchor.href, window.location.href);
        if (["http:", "https:"].includes(url.protocol) && url.origin !== window.location.origin) {
          anchor.textContent = `${anchor.textContent} (${url.href})`;
        }
      } catch {
      }
    });
    const text = String(copy.innerText || copy.textContent || "").trim().slice(0, 4000);
    if (!text) return;
    const entry = { kind, text, accessSignature: assistantHistoryAccessSignature(), createdAt: new Date().toISOString() };
    const cutoff = Date.now() - assistantHistoryRetentionMs;
    assistantHistoryEntries = assistantHistoryEntries
      .filter((item) => Date.parse(item.createdAt) >= cutoff)
      .concat(entry);
    message.dataset.createdAt = entry.createdAt;
    try {
      localStorage.setItem(assistantHistoryStorageKey(assistantHistoryAccountId), JSON.stringify(assistantHistoryEntries));
    } catch (error) {
      console.warn("Luna conversation history could not be saved in this browser.", error?.name || "storage-error");
    }
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
    const status = root.querySelector(".assistant-character-status");
    if (status) status.dataset.state = visualState;
    root.dataset.state = visualState;
    applyAssistantCharacterImage();
    if (visualState === "listening" || visualState === "thinking") loadStateImage(visualState);
  }

  function setState(name, label) {
    if (name === "idle" && speechActive) {
      name = "speaking";
      label = "Luna đang đọc";
    }
    interactionState = name === "idle" ? "idle" : name;
    applyVisualState();
    if (stateLabel) stateLabel.textContent = label;
  }

  function setVoiceButtonMode(mode) {
    const labels = { idle: "Nói", listening: "Dừng", processing: "Đang xử lý" };
    const label = labels[mode] || labels.idle;
    voiceButton.textContent = label;
    voiceButton.setAttribute("aria-label", mode === "listening" ? "Dừng nhận dạng giọng nói" : "Nhập bằng giọng nói");
    voiceButton.title = voiceButton.getAttribute("aria-label");
    voiceButton.disabled = mode === "processing";
    voiceButton.dataset.state = mode;
  }

  function stopVoiceCapture({ discard = false } = {}) {
    if (voiceRecognitionTimer) window.clearTimeout(voiceRecognitionTimer);
    voiceRecognitionTimer = 0;
    const capture = recognition;
    if (!capture) return;
    capture.discard = Boolean(discard || capture.discard);
    if (capture.discard) pendingSpeechItem = null;
    if (!capture.engine || capture.finished) return;
    try {
      if (capture.discard) capture.engine.abort();
      else capture.engine.stop();
    } catch {
      finishVoiceCapture(capture);
    }
    if (!capture.finished && !capture.endTimer) {
      capture.endTimer = window.setTimeout(() => finishVoiceCapture(capture), 1200);
    }
  }

  function speechPreferenceKey(accountId = activeAccountId) {
    return `phuc-thinh-luna-speech-v1:${accountId}`;
  }

  function announcementSpeechPreferenceKey(accountId = activeAccountId) {
    return `phuc-thinh-luna-announcement-speech-v1:${accountId}`;
  }

  function wakeWordPreferenceKey(accountId = activeAccountId) {
    return `phuc-thinh-luna-wake-word-v1:${accountId}`;
  }

  function readBooleanPreference(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : stored === "true";
    } catch {
      return fallback;
    }
  }

  function writeBooleanPreference(key, value) {
    try {
      localStorage.setItem(key, String(Boolean(value)));
    } catch {
      // The setting remains active for this page session.
    }
  }

  function syncSpeechPreference(accountId = activeAccountId) {
    if (speechToggle) speechToggle.checked = readBooleanPreference(speechPreferenceKey(accountId), true);
    if (announcementSpeechToggle) announcementSpeechToggle.checked = readBooleanPreference(announcementSpeechPreferenceKey(accountId), true);
    const supported = typeof window.SpeechSynthesisUtterance === "function" && typeof window.speechSynthesis?.speak === "function";
    if (speechToggle) {
      speechToggle.disabled = !supported;
      if (!supported) speechToggle.title = "Trình duyệt hoặc thiết bị này chưa hỗ trợ đọc giọng nói.";
    }
    if (announcementSpeechToggle) {
      announcementSpeechToggle.disabled = !supported;
      if (!supported) announcementSpeechToggle.title = "Trình duyệt hoặc thiết bị này chưa hỗ trợ đọc giọng nói.";
    }
  }

  function microphoneSecureContext() {
    return Boolean(window.isSecureContext || ["localhost", "127.0.0.1"].includes(window.location.hostname));
  }

  function setWakeWordStatus(message, error = false) {
    if (!wakeWordStatus) return;
    wakeWordStatus.textContent = message;
    wakeWordStatus.classList.toggle("is-error", Boolean(error));
  }

  function syncWakePreference(accountId = activeAccountId) {
    wakeListeningEnabled = false;
    if (accountId) writeBooleanPreference(wakeWordPreferenceKey(accountId), false);
    if (wakeWordToggle) {
      wakeWordToggle.checked = false;
      wakeWordToggle.disabled = true;
    }
    if (!microphoneSecureContext()) setWakeWordStatus("Nghe giọng nói cần HTTPS hoặc localhost.", true);
    else if (accountId) setWakeWordStatus("Luna không nghe nền liên tục. Bấm Nói rồi gọi “Luna ơi” để bắt đầu trao đổi.");
    else setWakeWordStatus("");
  }

  function stopLunaSpeech({ resetState = true, resumeWake = true } = {}) {
    const shouldResumeWake = resumeWake && wakePausedForSpeech;
    pendingSpeechItem = null;
    speechQueue.length = 0;
    speechPlaybackSequence += 1;
    speechActive = false;
    speechActiveKind = "";
    activeSpeechItem = null;
    wakePausedForSpeech = false;
    speechRetryItem = null;
    speechWaitingForGesture = false;
    if (speechPlaybackWatchdog) window.clearTimeout(speechPlaybackWatchdog);
    speechPlaybackWatchdog = 0;
    activeSpeechUtterance = null;
    window.speechSynthesis?.cancel();
    speechStopButton?.classList.add("is-hidden");
    if (resetState && !recognition && interactionState === "speaking") {
      setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ");
    }
    if (shouldResumeWake) scheduleWakeListener(180);
  }

  function speechChannelEnabled(kind = "assistant") {
    return kind === "announcement" ? Boolean(announcementSpeechToggle?.checked) : Boolean(speechToggle?.checked);
  }

  function speakLunaText(value, { kind = "assistant", onEnd = null, announcementId = "" } = {}) {
    if (!speechChannelEnabled(kind) || !currentAccount()) return false;
    if (typeof window.SpeechSynthesisUtterance !== "function" || typeof window.speechSynthesis?.speak !== "function") {
      if (voiceNotice && speechChannelEnabled(kind)) voiceNotice.textContent = "Trình duyệt hoặc thiết bị này chưa hỗ trợ đọc giọng nói; nội dung vẫn hiển thị bằng chữ ạ.";
      return false;
    }
    const template = document.createElement("template");
    template.innerHTML = String(value || "");
    template.content.querySelectorAll("button, .assistant-ai-meta, .assistant-ai-sources, script, style").forEach((node) => node.remove());
    let text = (template.content.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return false;
    if (text.length > 650) {
      const end = text.lastIndexOf(" ", 620);
      const pronoun = assistantUserProfile(currentAccount()).pronoun;
      text = text.slice(0, end > 400 ? end : 620).replace(/[ ,;:]+$/, "") + `. Còn nội dung khác, ${pronoun} có thể xem trong hội thoại ạ.`;
    }
    if (recognition) {
      pendingSpeechItem = { text, kind, onEnd, announcementId };
      return true;
    }
    speechQueue.push({ text, kind, onEnd, announcementId });
    if (speechQueue.length > 8) speechQueue.shift();
    playNextLunaSpeech();
    return true;
  }

  function removeQueuedSpeechKind(kind) {
    for (let index = speechQueue.length - 1; index >= 0; index -= 1) {
      if (speechQueue[index]?.kind === kind) speechQueue.splice(index, 1);
    }
  }

  function cancelSpeechKind(kind) {
    removeQueuedSpeechKind(kind);
    if (pendingSpeechItem?.kind === kind) pendingSpeechItem = null;
    let retryCancelled = false;
    if (speechRetryItem?.kind === kind) {
      speechRetryItem = null;
      speechWaitingForGesture = false;
      retryCancelled = true;
    }
    if (speechActiveKind === kind) {
      speechPlaybackSequence += 1;
      speechActive = false;
      speechActiveKind = "";
      activeSpeechItem = null;
      if (speechPlaybackWatchdog) window.clearTimeout(speechPlaybackWatchdog);
      speechPlaybackWatchdog = 0;
      activeSpeechUtterance = null;
      window.speechSynthesis?.cancel();
      speechStopButton?.classList.add("is-hidden");
      if (!speechQueue.length && wakePausedForSpeech) {
        wakePausedForSpeech = false;
        scheduleWakeListener(180);
      } else {
        window.setTimeout(playNextLunaSpeech, 0);
      }
    } else if (retryCancelled) {
      window.setTimeout(playNextLunaSpeech, 0);
    }
  }

  function retrySpeechAfterUserGesture(event) {
    if (!speechWaitingForGesture || !speechRetryItem || !event.isTrusted) return;
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    const queuedSpeech = speechRetryItem;
    speechRetryItem = null;
    speechWaitingForGesture = false;
    speechQueue.unshift(queuedSpeech);
    if (speechQueue.length > 8) speechQueue.pop();
    if (voiceNotice) voiceNotice.textContent = "Đang phát lời thoại của Luna ạ.";
    playNextLunaSpeech();
  }

  function playNextLunaSpeech() {
    if (!currentAccount() || document.hidden || recognition || speechActive || speechWaitingForGesture) return;
    let queuedSpeech = speechQueue.shift();
    while (queuedSpeech && !speechChannelEnabled(queuedSpeech.kind)) queuedSpeech = speechQueue.shift();
    if (!queuedSpeech) {
      if (wakePausedForSpeech || wakeListeningEnabled) {
        wakePausedForSpeech = false;
        scheduleWakeListener(180);
      }
      return;
    }
    const text = queuedSpeech.text;
    const sequence = ++speechPlaybackSequence;
    speechActive = true;
    speechActiveKind = queuedSpeech.kind;
    activeSpeechItem = queuedSpeech;
    setState("thinking", "Đang chuẩn bị giọng đọc");
    const finish = ({ retry = false, error = "" } = {}) => {
      if (sequence !== speechPlaybackSequence) return;
      speechActive = false;
      speechActiveKind = "";
      activeSpeechItem = null;
      if (speechPlaybackWatchdog) window.clearTimeout(speechPlaybackWatchdog);
      speechPlaybackWatchdog = 0;
      activeSpeechUtterance = null;
      speechStopButton?.classList.add("is-hidden");
      if (retry) {
        speechRetryItem = { ...queuedSpeech, gestureRetryCount: 1 };
        speechWaitingForGesture = true;
        if (voiceNotice) voiceNotice.textContent = "Chạm hoặc bấm màn hình để Luna phát lời thoại.";
      } else if (error && voiceNotice && queuedSpeech.kind === "announcement") {
        voiceNotice.textContent = "Thiết bị chưa phát được lời nhắc bằng giọng nói; nội dung vẫn hiển thị trên màn hình ạ.";
      } else if (!recognition && interactionState === "speaking") {
        setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ");
      } else if (!recognition && interactionState === "thinking") {
        setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ");
      }
      if (queuedSpeech.onEnd && !retry) {
        wakePausedForSpeech = false;
        queuedSpeech.onEnd();
      }
      window.setTimeout(playNextLunaSpeech, 120);
    };
    let utterance;
    try {
      utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.06;
      utterance.pitch = 1.04;
      utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const vietnameseVoices = voices.filter((voice) => /^vi(?:-|$)/i.test(String(voice.lang || "")));
      const preferredVoice = vietnameseVoices.find((voice) => /female|hoai|linh|mai|lan|huyen|thao|vy/i.test(voice.name || ""));
      if (preferredVoice || vietnameseVoices[0]) utterance.voice = preferredVoice || vietnameseVoices[0];
      activeSpeechUtterance = utterance;
      utterance.onstart = () => {
        if (sequence !== speechPlaybackSequence) return;
        speechStopButton?.classList.remove("is-hidden");
        setState("speaking", "Luna đang đọc");
        if (voiceNotice?.textContent === "Đang phát lời thoại của Luna ạ.") {
          voiceNotice.textContent = "Nói để trò chuyện với Luna. Khi tạo việc, em sẽ hỏi từng mục và chờ xác nhận trước khi lưu.";
        }
      };
      utterance.onend = () => finish();
      utterance.onerror = (event) => {
        if (sequence !== speechPlaybackSequence) return;
        if (event.error === "not-allowed" && queuedSpeech.gestureRetryCount !== 1) finish({ retry: true });
        else finish({ error: event.error || "speech-error" });
      };
      speechPlaybackWatchdog = window.setTimeout(() => {
        if (sequence !== speechPlaybackSequence) return;
        window.speechSynthesis?.cancel();
        finish({ error: "timeout" });
      }, 120_000);
      window.speechSynthesis.speak(utterance);
    } catch {
      finish({ error: "unavailable" });
    }
  }

  function stopWakeRecognition() {
    if (wakeRestartTimer) window.clearTimeout(wakeRestartTimer);
    wakeRestartTimer = 0;
    wakeRecognition = null;
  }

  function scheduleWakeListener() {
    stopWakeRecognition();
  }

  function setWakeListeningEnabled(enabled, { persist = true, status = "" } = {}) {
    wakeListeningEnabled = false;
    if (wakeWordToggle) {
      wakeWordToggle.checked = false;
      wakeWordToggle.disabled = true;
    }
    if (persist && activeAccountId) writeBooleanPreference(wakeWordPreferenceKey(), false);
    stopWakeRecognition();
    setWakeWordStatus(status || (enabled
      ? "Luna không nghe nền liên tục. Bấm Nói rồi gọi “Luna ơi” để bắt đầu trao đổi."
      : "Đã tắt chờ giọng nói."));
  }

  function wakePhraseRemainder(transcript) {
    const match = String(transcript || "").match(/\bLuna(?:\s+ơi)?\b[\s,.;:!?-]*([\s\S]*)$/i);
    return match ? String(match[1] || "").trim() : null;
  }

  function respondToWakePhrase(transcript, accountId) {
    const remainder = wakePhraseRemainder(transcript);
    stopWakeRecognition();
    if (remainder === null || !currentAccount() || String(currentAccount().id) !== accountId) {
      scheduleWakeListener();
      return;
    }
    if (root.classList.contains("is-minimized")) setAssistantMinimized(false);
    if (!taskWizard.active) setPanelOpen(true, { restoreFocus: false });
    stopLunaSpeech({ resetState: false, resumeWake: false });
    const greeting = "Dạ, có em đây ạ";
    if (taskWizard.active) appendTaskWizardMessage("assistant", greeting);
    else appendMessage("assistant", greeting, { speak: false });
    setAssistantExpression("happy", { duration: 3200 });
    const listenForRequest = () => {
      if (!currentAccount() || String(currentAccount().id) !== accountId) return;
      if (remainder) {
        if (taskWizard.active) handleTaskWizardTranscript(remainder, accountId);
        else {
          input.value = remainder;
          voiceNotice.textContent = "Đã nhận yêu cầu sau lời gọi Luna. Em đang xử lý; thao tác thay đổi vẫn cần xác nhận.";
          input.form?.requestSubmit();
        }
        scheduleWakeListener(1600);
      } else {
        const status = taskWizard.active ? taskVoiceWizardStatus : voiceNotice;
        status.textContent = "Dạ, có em đây ạ. Bấm Nói để tiếp tục trao đổi bằng giọng nói nhé.";
      }
    };
    if (!speakLunaText(greeting, { onEnd: listenForRequest })) listenForRequest();
  }

  function startWakeListener() {
    setWakeListeningEnabled(false, { status: "Luna không nghe nền liên tục. Bấm Nói rồi gọi “Luna ơi” để bắt đầu trao đổi." });
  }

  function submitVoiceTranscript(transcript, accountId) {
    const text = String(transcript || "").trim();
    if (!text || !currentAccount() || String(currentAccount().id) !== accountId || panel.classList.contains("is-hidden")) return false;
    input.value = text;
    voiceNotice.textContent = "Đã nhận dạng. Luna đang xử lý; các thao tác thay đổi vẫn cần xác nhận.";
    input.form?.requestSubmit();
    return true;
  }

  function flushPendingSpeech() {
    const queuedSpeech = pendingSpeechItem;
    pendingSpeechItem = null;
    if (!queuedSpeech || !speechChannelEnabled(queuedSpeech.kind) || !currentAccount()) return;
    speechQueue.push(queuedSpeech);
    if (speechQueue.length > 8) speechQueue.shift();
    playNextLunaSpeech();
  }

  function changeMoodIfDue(force = false) {
    const now = Date.now();
    if (!assistantIsEnabled() || !activeAccountId || document.hidden || !panel.classList.contains("is-hidden") || recognition || wakeRecognition) return;
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
    if (!shouldOpen) document.getElementById("assistantSettings")?.removeAttribute("open");
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
      stopVoiceCapture({ discard: true });
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
    const nextAccountId = String(account?.id || "");
    const accountChanged = nextAccountId !== activeAccountId;
    if (accountChanged) {
      exitTaskWizard();
      cancelLunaAiRequest();
      stopWakeRecognition();
      wakePausedForSpeech = false;
      stopVoiceCapture({ discard: true });
      stopLunaSpeech({ resetState: false });
      hideQuickNotice();
      requestSequence += 1;
      activeAccountId = nextAccountId;
      syncSpeechPreference(nextAccountId);
      syncWakePreference(nextAccountId);
      assistantMinimized = false;
      welcomeAccountId = "";
      currentMood = null;
      lastMoodChangeAt = 0;
      setAssistantExpression("idle");
      messages.replaceChildren();
      restoreAssistantHistory(nextAccountId);
    }
    if (!enabled && (taskWizard.active || !taskVoiceWizard.classList.contains("is-hidden"))) exitTaskWizard();
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
    root.querySelectorAll('[data-assistant-command="tình hình công việc của tôi"], [data-assistant-command="công việc quá hạn"], [data-assistant-command="công việc hôm nay"]')
      .forEach((button) => button.classList.toggle("is-hidden", !canViewTasks));
    if (nextAccountId !== positionAccountId) {
      positionAccountId = nextAccountId;
      restoreLauncherPosition(nextAccountId);
    }
    if ((!loggedIn || !enabled) && !panel.classList.contains("is-hidden")) setPanelOpen(false, { restoreFocus: false });
    if (!loggedIn || !enabled) stopWakeRecognition();
    if (!enabled) {
      cancelLunaAiRequest();
      stopLunaSpeech({ resetState: false });
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
    if (loggedIn && enabled && wakeListeningEnabled) scheduleWakeListener(220);
  }

  function appendMessage(kind, content, { html = false, speak = true } = {}) {
    const message = document.createElement("article");
    message.className = `assistant-message is-${kind}`;
    if (html) message.innerHTML = content;
    else message.textContent = content;
    if (kind === "assistant" && html && message.querySelector(".assistant-task-list, .assistant-notification-list, .assistant-task-preview, .assistant-ai-sources, .assistant-ai-external-sources, .assistant-ai-inline-citations, .assistant-report-preview")) {
      message.classList.add("is-rich");
    }
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
    persistAssistantMessage(kind, message);
    if (kind === "assistant" && speak) speakLunaText(message.innerHTML);
    return message;
  }

  function showWelcome({ speak = true } = {}) {
    const account = typeof currentAccount === "function" ? currentAccount() : null;
    if (!account || welcomeAccountId === account.id) return;
    welcomeAccountId = account.id;
    if (messages.childElementCount) return;
    const taskAccess = typeof canViewTasks === "function" && canViewTasks();
    const peopleAccess = typeof canViewPeople === "function" && canViewPeople();
    const { addressee, pronoun } = assistantUserProfile(account);
    appendMessage("assistant", `Em chào ${addressee} ạ. Em có thể tra cứu công việc${taskAccess ? ` ${pronoun} được phép xem` : " được giao cho tài khoản này"}, dự án và nhân sự trong phạm vi quyền hiện tại${peopleAccess ? "" : `; tra cứu nhân sự chỉ giới hạn hồ sơ của ${pronoun}`}. Em cũng sẽ nhắc lịch, việc đến hạn, tin Bảng tin mới và thông tin liên quan ngay tại đây. Khi ${pronoun} muốn tạo việc, em sẽ mở biểu mẫu, hỏi và điền từng mục rồi chờ ${pronoun} kiểm tra, xác nhận trước khi lưu ạ.`, { speak });
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
    const speechQueued = speakLunaText(quickNoticeText?.textContent || notice.message || notice.title, {
      kind: "announcement",
      announcementId: notice.id,
    });
    if (!speechQueued && announcementSpeechToggle?.checked && voiceNotice && !usingSupabaseSync()) {
      voiceNotice.textContent = "Đọc thông báo cần kết nối hệ thống online; bong bóng vẫn hiển thị ạ.";
    }
    if (!panel.classList.contains("is-hidden") || recognition) return;
    setState("speaking", "Có thông báo mới");
    window.setTimeout(() => {
      if (interactionState === "speaking") setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ");
    }, 1800);
  }

  function acknowledgeQuickNotice({ showNext = true } = {}) {
    const item = quickNoticeItem;
    const noticeSpeechRetrying = speechActiveKind === "announcement"
      && activeSpeechItem?.announcementId === item?.id
      && activeSpeechItem?.gestureRetryCount === 1;
    if (!noticeSpeechRetrying) stopLunaSpeech();
    if (item && typeof dismissNotification === "function") dismissNotification(item);
    quickNoticeItem = null;
    const nextNotice = showNext ? quickNoticeQueue.shift() : null;
    if (nextNotice) {
      presentQuickNotice(nextNotice);
      return;
    }
    quickNotice?.classList.add("is-hidden");
    if (showNext) quickNoticeQueue.length = 0;
    if (noticeSpeechRetrying) window.setTimeout(playNextLunaSpeech, 0);
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
    showWelcome({ speak: false });
    appendMessage("assistant", notificationMessageMarkup(notice), { html: true, speak: false });
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

  function parseModuleNavigationCommand(value) {
    const phrase = normalize(value).replace(/^(?:luna\s+oi\s*[,;:]?\s*)/, "").replace(/[.!?]+$/g, "").trim();
    const command = phrase.match(/^(?:(?:hay|lam on)\s+)?(?:mo|vao|truy cap|chuyen sang|chuyen toi|chuyen den|di den|dua toi(?: den)?|hien thi|cho toi xem|cho toi vao|toi muon mo|toi muon vao)\s+(.+)$/);
    if (!command) return null;

    const target = command[1]
      .replace(/^(?:giup toi|giup minh|giup em)\s+/, "")
      .replace(/^(?:muc|trang|phan|man hinh)\s+/, "")
      .replace(/\s+(?:giup toi|giup minh|nhe|nha|a|voi|di)$/, "")
      .replace(/^(?:muc|trang|phan|man hinh)\s+/, "")
      .trim();
    if (!target) return null;

    const aliases = {
      dashboard: ["tong quan", "trang tong quan", "trang chu"],
      bulletin: ["bang tin", "tin tuc", "ban tin"],
      archive: ["luu tru", "kho ho so", "ho so luu tru"],
      people: ["nhan su", "nhan vien", "ho so nhan su"],
      tasks: ["cong viec", "nhiem vu", "danh sach cong viec"],
      calendar: ["lich cong viec", "lich lam viec", "lich"],
      "department-evaluations": ["kpi phong", "danh gia kpi phong", "danh gia phong"],
      evaluations: ["kpi ca nhan", "danh gia kpi ca nhan", "danh gia ca nhan"],
      history: ["lich su", "lich su hoat dong"],
      accounts: ["tai khoan", "danh muc tai khoan"],
      "system-settings": ["cau hinh he thong", "thiet lap he thong", "cai dat he thong"],
      rules: ["quy che", "quy dinh", "quy che thi dua"],
      help: ["tro giup", "huong dan", "ho tro"],
    };
    for (const [moduleId, names] of Object.entries(aliases)) {
      const module = moduleId === "system-settings"
        ? { id: moduleId, label: "Cấu hình hệ thống" }
        : (typeof systemModules === "undefined" ? null : systemModules.find((item) => item.id === moduleId));
      if (module && [normalize(module.label), ...names].includes(target)) return module;
    }
    return null;
  }

  function openModuleFromCommand(raw) {
    const module = parseModuleNavigationCommand(raw);
    if (!module) return false;
    if (typeof canAccessView !== "function" || !canAccessView(module.id)) {
      appendMessage("assistant", `Tài khoản này chưa được cấp quyền truy cập mục ${module.label}; em chưa mở mục đó ạ.`);
      return true;
    }
    const navigationButton = Array.from(document.querySelectorAll(".nav-item[data-view]"))
      .find((item) => item.dataset.view === module.id);
    if (!navigationButton || navigationButton.disabled || navigationButton.classList.contains("is-hidden")) {
      appendMessage("assistant", `Mục ${module.label} hiện không khả dụng trên giao diện này ạ.`);
      return true;
    }
    navigationButton.click();
    appendMessage("assistant", `Dạ, em đã mở mục ${module.label} ạ.`);
    return true;
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
      const pronoun = assistantUserProfile(currentAccount()).pronoun;
      appendMessage("assistant", applied
        ? `Em đã điền bản nháp${title ? ` “${title}”` : ""} vào biểu mẫu. ${pronoun} vui lòng kiểm tra lại toàn bộ thông tin rồi tự bấm Lưu công việc; Luna chưa lưu dữ liệu ạ.`
        : "Em đã mở biểu mẫu. Vui lòng kiểm tra quyền và nhập đầy đủ thông tin trước khi lưu; Luna chưa ghi dữ liệu.");
      setAssistantExpression("happy", { duration: 5000 });
      setState("speaking", "Đã mở biểu mẫu");
      window.setTimeout(() => setState("idle", "Sẵn sàng hỗ trợ"), 1400);
    }, 90);
  }

  function draftDate(value) {
    const source = String(value || "").trim();
    const relative = normalize(source);
    const today = new Date();
    if (relative === "hom nay" || relative === "ngay hom nay") return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (relative === "ngay mai" || relative === "ngay kia") {
      today.setDate(today.getDate() + (relative === "ngay mai" ? 1 : 2));
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    const iso = source.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    const local = source.match(/\b(\d{1,2})[/. \-](\d{1,2})[/. \-](20\d{2})\b/);
    const spoken = source.match(/(?:ngày\s*)?(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(20\d{2}))?/i);
    const shortLocal = source.match(/\b(\d{1,2})[/. \-](\d{1,2})\b/);
    const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : local ? [Number(local[3]), Number(local[2]), Number(local[1])]
        : spoken ? [Number(spoken[3] || today.getFullYear()), Number(spoken[2]), Number(spoken[1])]
          : shortLocal ? [today.getFullYear(), Number(shortLocal[2]), Number(shortLocal[1])] : null;
    if (!parts) return "";
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) return "";
    return String(parts[0]) + "-" + String(parts[1]).padStart(2, "0") + "-" + String(parts[2]).padStart(2, "0");
  }

  function taskWizardAddress() {
    return assistantUserProfile(currentAccount()).pronoun;
  }

  function taskWizardField(step) {
    if (taskWizard.mode === "progress") {
      const assigned = taskWizard.kind === "assigned";
      const ids = assigned
        ? { status: "assignmentTaskStatus", progress: "assignmentTaskProgress", progressReport: "assignmentTaskResponseNote" }
        : { status: "taskStatus", progress: "taskProgress", progressReport: "taskNote" };
      return document.getElementById(ids[step?.key] || "");
    }
    const ids = {
      title: "taskTitle",
      project: "taskProjectId",
      owner: "taskOwner",
      category: "taskCategory",
      workType: "taskWorkType",
      priority: "taskPriority",
      recurrence: "taskRecurrence",
      startDate: "taskStartDate",
      due: "taskDue",
      status: "taskStatus",
      progress: "taskProgress",
      quality: "taskQualityPercent",
      attachments: "taskAttachments",
      note: "taskNote",
      followUp: "taskFollowUpDate",
      blockerStatus: "taskBlockerStatus",
      dependencies: "taskDependencies",
      blockerNote: "taskBlockerNote",
    };
    return document.getElementById(ids[step?.key] || "");
  }

  function buildTaskWizardSteps() {
    const definitions = [
      { key: "title", label: "Tên công việc", question: "Tên công việc mình cần tạo là gì ạ?" },
      { key: "project", label: "Danh mục dự án", question: "Mời {address} chọn danh mục dự án ạ. {manual}" },
      { key: "owner", label: "Người thực hiện", question: "Công việc này giao cho ai thực hiện ạ? {manual}" },
      { key: "category", label: "Danh mục nhiệm vụ", question: "Mời {address} chọn danh mục nhiệm vụ phù hợp ạ. {manual}" },
      { key: "collaborators", label: "Người phối hợp", optional: true, question: "Có ai phối hợp thực hiện không ạ? {manual}" },
      { key: "workType", label: "Loại công việc", question: "Đây là công việc thường xuyên hay phát sinh ạ? {manual}" },
      { key: "priority", label: "Mức độ ưu tiên", question: "Mức độ ưu tiên của công việc là bình thường, cao hay khẩn ạ? {manual}" },
      { key: "recurrence", label: "Định kỳ", question: "Công việc có lặp lại định kỳ không ạ? {manual}" },
      { key: "startDate", label: "Ngày bắt đầu", question: "Công việc bắt đầu ngày nào ạ? {manual}" },
      { key: "due", label: "Ngày hoàn thành", question: "Thời hạn hoàn thành là ngày nào ạ? {manual}" },
      { key: "status", label: "Trạng thái", question: "Trạng thái ban đầu là chuẩn bị thực hiện, đang thực hiện hay hoàn thành ạ? {manual}" },
      { key: "progress", label: "Tiến độ", question: "Tiến độ hiện tại là bao nhiêu phần trăm ạ? Có thể nói số từ 0 đến 100. {manual}" },
      { key: "quality", label: "Đánh giá chất lượng", optional: true, question: "Đã có điểm đánh giá chất lượng chưa ạ? Mục này có thể để trống khi mới tạo việc. {manual}" },
      { key: "attachments", label: "Hồ sơ đính kèm", optional: true, question: "Có hồ sơ cần đính kèm không ạ? Mời {address} chọn tệp trực tiếp trên biểu mẫu hoặc bỏ qua." },
      { key: "note", label: "Nội dung công việc", optional: true, question: "Mời {address} cho em biết nội dung hoặc ghi chú cần thêm ạ. {manual}" },
      { key: "followUp", label: "Mốc cập nhật tiếp theo", optional: true, question: "Có cần đặt ngày cập nhật tiếp theo không ạ? {manual}" },
      { key: "blockerStatus", label: "Trạng thái trở ngại", question: "Công việc hiện có trở ngại nào không ạ? Có thể chọn không có trở ngại, cần hỗ trợ, đang xử lý hoặc đã gỡ trở ngại. {manual}" },
      { key: "dependencies", label: "Công việc phụ thuộc", optional: true, question: "Công việc này có phụ thuộc vào công việc nào khác không ạ? Có thể chọn nhiều mục trên biểu mẫu hoặc bỏ qua." },
      { key: "blockerNote", label: "Nội dung trở ngại", optional: true, question: "Mời {address} cho em biết nội dung trở ngại hoặc đề nghị hỗ trợ nếu có ạ. {manual}" },
    ];
    return definitions.filter((step) => {
      if (["collaborators", "dependencies"].includes(step.key)) {
        const field = document.getElementById(step.key === "collaborators" ? "taskCollaboratorField" : "taskDependencies");
        return field && !field.classList.contains("is-hidden") && !field.hidden;
      }
      const field = taskWizardField(step);
      if (!field) return false;
      if (step.key === "owner" && field.disabled) return false;
      if (step.key === "status") return !field.disabled && !document.getElementById("taskStatusChoices")?.classList.contains("is-hidden");
      return !field.disabled && !field.closest(".is-hidden");
    });
  }

  function buildTaskProgressWizardSteps() {
    return [
      { key: "status", label: "Trạng thái", question: "Trạng thái công việc hiện tại nên là gì ạ?" },
      { key: "progress", label: "Tiến độ", question: "Tiến độ công việc là bao nhiêu phần trăm ạ?" },
      { key: "progressReport", label: "Báo cáo tiến độ", question: "Anh/chị cho em nội dung báo cáo tiến độ lần này ạ?" },
    ];
  }

  function taskWizardSetStatus(message) {
    if (!taskVoiceWizardStatus) return;
    taskVoiceWizardStatus.textContent = String(message || "");
    taskVoiceWizardStatus.classList.toggle("is-quiet", !/^(?:em đang nghe|đã dừng|đã nhận dạng|chưa nghe rõ|không thể|micro|trình duyệt|dịch vụ|em chưa|biểu mẫu|tài khoản này|có thể chọn nhiều|đã cập nhật lựa chọn)/i.test(taskVoiceWizardStatus.textContent));
    window.requestAnimationFrame(positionTaskWizardBubble);
  }

  function appendTaskWizardMessage(kind, content) {
    if (!taskWizardConversation || !content) return null;
    const message = document.createElement("div");
    message.className = `task-wizard-message is-${kind}`;
    message.textContent = String(content);
    taskWizardConversation.append(message);
    while (taskWizardConversation.childElementCount > 3) taskWizardConversation.firstElementChild.remove();
    taskWizardConversation.scrollTop = taskWizardConversation.scrollHeight;
    window.requestAnimationFrame(positionTaskWizardBubble);
    return message;
  }

  function taskWizardAnswerSummary(step) {
    if (step.key === "collaborators" || step.key === "dependencies") {
      const containerId = step.key === "collaborators" ? "taskCollaborators" : "taskDependencies";
      const selected = Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`));
      return selected.map((checkbox) => checkbox.closest("label")?.textContent?.trim() || checkbox.value).join(", ") || "Không có";
    }
    if (step.key === "attachments") {
      return Array.from(taskWizardField(step)?.files || []).map((file) => file.name).join(", ") || "Không đính kèm hồ sơ";
    }
    const field = taskWizardField(step);
    if (!field) return "Đã cập nhật";
    if (field.tagName === "SELECT") return field.selectedOptions[0]?.textContent?.trim() || field.value;
    return String(field.value || "").trim() || "Để trống";
  }

  function clearTaskWizardHighlight() {
    document.querySelectorAll("#taskForm [data-luna-current-step], #assignmentTaskForm [data-luna-current-step]")
      .forEach((element) => element.removeAttribute("data-luna-current-step"));
  }

  function taskWizardFocus(step) {
    clearTaskWizardHighlight();
    if (!step || step.key === "confirm") return;
    if (taskWizard.mode === "progress" && step.key === "task") {
      taskWizardReply?.focus({ preventScroll: true });
      return;
    }
    const focusIds = taskWizard.mode === "progress"
      ? { status: taskWizard.kind === "assigned" ? "assignmentTaskStatus" : "taskStatusChoices" }
      : { owner: "taskOwnerToggle", collaborators: "taskCollaboratorToggle", status: "taskStatusChoices", dependencies: "taskDependencies" };
    const field = document.getElementById(focusIds[step.key] || taskWizardField(step)?.id || "");
    if (!field) return;
    const container = field.closest("label, .task-owner-field, .task-collaborator-field") || field;
    container.setAttribute("data-luna-current-step", "true");
    const focusTarget = step.key === "status" || step.key === "dependencies"
      ? field.querySelector('input:not(:disabled)') || field
      : field;
    focusTarget.focus?.({ preventScroll: true });
    container.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  function taskWizardPromptFor(step) {
    const address = taskWizardAddress();
    if (taskWizard.mode === "progress" && step.key === "progress"
      && normalize(taskWizardField({ key: "status" })?.value) === normalize("Hoàn thành")) {
      return `Công việc đã ở trạng thái Hoàn thành thì tiến độ phải là 100%. ${address} xác nhận 100% hay muốn quay lại đổi trạng thái ạ?`;
    }
    const manual = taskWizard.index === 0
      ? `${address} có thể trả lời bằng giọng nói hoặc thao tác trực tiếp trên biểu mẫu; em sẽ chờ từng mục ạ.`
      : "";
    const question = step.question.replaceAll("{address}", address).replace("{manual}", manual).trim();
    return taskWizard.index === 0 && !step.question.includes("{manual}") ? `${question} ${manual}` : question;
  }

  function askTaskWizardStep() {
    if (!taskWizard.active) return;
    const currentAccountId = String(currentAccount()?.id || "");
    const progressTask = taskWizard.mode === "progress" && taskWizard.taskId
      ? currentTasks().find((item) => String(item.id) === taskWizard.taskId)
      : null;
    const permissionValid = taskWizard.mode === "progress"
      ? currentAccountId === taskWizard.accountId && (taskWizard.taskId
        ? !!progressTask && typeof canUpdateTaskProgress === "function" && canUpdateTaskProgress(progressTask)
        : typeof canViewTasks === "function" && canViewTasks())
      : !!currentAccount() && typeof canCreateRegularTasks === "function" && canCreateRegularTasks();
    if (!permissionValid) {
      exitTaskWizard(taskWizard.mode === "progress"
        ? "Quyền cập nhật công việc đã thay đổi hoặc công việc không còn khả dụng. Em đã dừng và chưa lưu dữ liệu ạ."
        : "Quyền tạo công việc không còn khả dụng; em đã dừng hướng dẫn và chưa lưu dữ liệu ạ.");
      return;
    }
    if (taskWizard.index >= taskWizard.steps.length) {
      prepareTaskWizardConfirmation();
      return;
    }
    const step = taskWizard.steps[taskWizard.index];
    const address = taskWizardAddress();
    taskVoiceWizardPrompt.textContent = taskWizardPromptFor(step);
    taskWizardCompactPrompt.textContent = taskVoiceWizardPrompt.textContent;
    appendTaskWizardMessage("assistant", taskVoiceWizardPrompt.textContent);
    taskVoiceWizardSpeak.classList.remove("is-hidden");
    taskVoiceWizardContinue.classList.remove("is-hidden");
    taskVoiceWizardSkip.classList.toggle("is-hidden", !step.optional);
    taskVoiceWizardSpeak.disabled = false;
    taskWizardSetStatus(step.key === "collaborators" || step.key === "dependencies"
      ? `Có thể chọn nhiều mục; nói “không có” nếu không cần. ${address} cũng có thể bấm Tiếp tục.`
      : step.key === "attachments"
        ? "Chọn tệp trực tiếp hoặc bấm Bỏ qua mục này. Em không tự tạo hay đính kèm hồ sơ."
      : step.key === "progressReport"
        ? "Báo cáo tiến độ cần có nội dung để lưu; có thể nói hoặc nhập trực tiếp ạ."
      : step.key === "note"
        ? "Mục này không bắt buộc; có thể nói nội dung, nhập tay hoặc bỏ qua."
        : step.key === "task"
          ? "Em chỉ tìm trong công việc anh/chị được phép cập nhật."
          : "Em đang chờ câu trả lời cho mục này; chưa có thông tin nào được lưu.");
    taskWizardReply.placeholder = taskWizard.awaitingConfirmation ? "Nói có để lưu, chưa để giữ bản nháp..." : "Trả lời Luna...";
    taskVoiceWizard.classList.remove("is-condensed");
    taskWizardFocus(step);
    setAssistantExpression(step.key === "title" ? "happy" : ["project", "category", "blockerStatus"].includes(step.key) ? "research" : "notes", { duration: 5000 });
    positionTaskWizardBubble();
    const spoken = speakLunaText(taskVoiceWizardPrompt.textContent);
    if (!spoken) {
      setState("speaking", "Luna đang đồng hành");
      window.setTimeout(() => {
        if (taskWizard.active && interactionState === "speaking") setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ");
      }, 1400);
    }
  }

  function taskWizardCurrentValue(step) {
    if (["collaborators", "dependencies", "attachments", "quality", "followUp", "blockerNote"].includes(step.key)) return true;
    if (step.key === "task") return Boolean(String(taskWizard.suggestedTaskQuery || "").trim());
    if (step.key === "status") {
      const field = taskWizardField(step);
      const option = field?.selectedOptions?.[0];
      return Boolean(field && !field.disabled && field.value && (!option || !option.disabled));
    }
    if (step.key === "progress") {
      if (!taskWizardField(step)?.value) return false;
      const progress = Number(taskWizardField(step)?.value);
      const status = normalize(taskWizardField({ key: "status" })?.value);
      return Number.isFinite(progress) && progress >= 0 && progress <= 100
        && (taskWizard.mode !== "progress" || status !== normalize("Hoàn thành") || progress === 100);
    }
    const field = taskWizardField(step);
    if (!field) return false;
    if (taskWizard.mode === "progress" && step.key === "progressReport") return Boolean(field.value.trim());
    if (field.tagName === "SELECT") {
      const option = field.selectedOptions?.[0];
      if (!field.value || !option || option.disabled) return false;
      if (step.key === "category" && /^(?:chọn người được giao|chức vụ chưa có danh mục)/i.test(field.value.trim())) return false;
      return true;
    }
    if (step.key === "title") return Boolean(field.value.trim());
    if (step.key === "note") return true;
    if (step.key === "startDate" || step.key === "due") return Boolean(draftDate(field.value));
    if (step.key === "owner") return Boolean(field.value && Array.from(field.options).some((option) => option.value === field.value));
    return Boolean(field.value && Array.from(field.options).some((option) => option.value === field.value));
  }

  function advanceTaskWizardStep({ recordAnswer = true } = {}) {
    if (!taskWizard.active || taskWizard.index >= taskWizard.steps.length) return;
    const step = taskWizard.steps[taskWizard.index];
    if (!taskWizardCurrentValue(step)) {
      const message = step.key === "owner"
        ? "Mục này cần chọn người thực hiện trước khi tiếp tục ạ."
        : step.key === "project" ? "Mục này cần chọn một dự án trong danh sách ạ."
          : step.key === "category" ? "Mục này cần chọn danh mục nhiệm vụ hợp lệ ạ."
            : step.key === "title" ? "Em chưa nhận được tên công việc; vui lòng nhập hoặc nói tên công việc ạ."
              : "Vui lòng chọn hoặc nhập giá trị hợp lệ trước khi tiếp tục ạ.";
      taskWizardSetStatus(message);
      return;
    }
    stopLunaSpeech({ resetState: false, resumeWake: false });
    if (recordAnswer) appendTaskWizardMessage("user", `${step.label}: ${taskWizardAnswerSummary(step)}`);
    taskWizard.index += 1;
    askTaskWizardStep();
  }

  function skipTaskWizardStep() {
    const step = taskWizard.steps[taskWizard.index];
    if (!taskWizard.active || !step?.optional) return;
    if (["collaborators", "dependencies"].includes(step.key)) {
      const containerId = step.key === "collaborators" ? "taskCollaborators" : "taskDependencies";
      document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach((checkbox) => { checkbox.checked = false; });
      document.getElementById(containerId)?.dispatchEvent(new Event("change", { bubbles: true }));
    }
    appendTaskWizardMessage("user", `${step.label}: Bỏ qua`);
    taskWizard.index += 1;
    askTaskWizardStep();
  }

  function prepareTaskWizardConfirmation() {
    taskWizard.awaitingConfirmation = true;
    clearTaskWizardHighlight();
    taskVoiceWizard.classList.remove("is-condensed");
    taskVoiceWizardPrompt.textContent = taskWizard.mode === "progress"
      ? `Em đã điền Trạng thái, Tiến độ và Báo cáo tiến độ vào biểu mẫu. ${taskWizardAddress()}, mình kiểm tra lại rồi xác nhận có lưu cập nhật công việc này không ạ? Nói “có” hoặc bấm Lưu để lưu; nói “chưa” để giữ bản nháp. Em chưa tự lưu ạ.`
      : `Em đã điền lần lượt các mục vào biểu mẫu. ${taskWizardAddress()}, vui lòng kiểm tra lại thông tin. ${taskWizardAddress()} có muốn lưu công việc này không ạ? Hãy nói “có” để lưu hoặc bấm nút Lưu công việc; nói “chưa” để giữ nguyên bản nháp. Em chưa tự lưu ạ.`;
    taskVoiceWizardCompactPrompt.textContent = taskWizard.mode === "progress"
      ? "Anh/chị xác nhận lưu cập nhật công việc nhé?"
      : "Anh/chị xác nhận lưu công việc này nhé?";
    appendTaskWizardMessage("assistant", taskVoiceWizardPrompt.textContent);
    taskVoiceWizardContinue.classList.add("is-hidden");
    taskVoiceWizardSkip.classList.add("is-hidden");
    taskWizardSetStatus("Chỉ câu trả lời xác nhận hoặc thao tác bấm Lưu công việc mới gửi dữ liệu qua luồng lưu hiện có.");
    taskWizardReply.placeholder = "Có để lưu, chưa để giữ bản nháp...";
    taskWizardReply.focus({ preventScroll: true });
    positionTaskWizardBubble();
    speakLunaText(taskVoiceWizardPrompt.textContent);
  }

  function exitTaskWizard(message = "") {
    if (recognition && voiceCaptureMode === "task-wizard") stopVoiceCapture({ discard: true });
    taskWizard.active = false;
    taskWizard.awaitingConfirmation = false;
    taskWizard.mode = "create";
    taskWizard.taskId = "";
    taskWizard.kind = "";
    taskWizard.form = null;
    clearTaskWizardHighlight();
    taskVoiceWizard?.classList.add("is-hidden");
    root.classList.remove("is-task-wizard");
    taskWizardConversation?.replaceChildren();
    if (taskWizardReply) taskWizardReply.value = "";
    if (message) {
      appendMessage("assistant", message, { speak: false });
      speakLunaText(message);
    }
  }

  function keepTaskWizardDraftUnsaved(message) {
    if (recognition && voiceCaptureMode === "task-wizard") stopVoiceCapture({ discard: true });
    taskWizard.active = false;
    taskWizard.awaitingConfirmation = false;
    clearTaskWizardHighlight();
    taskVoiceWizard.classList.remove("is-hidden");
    taskVoiceWizard.classList.remove("is-condensed");
    taskWizardReplyForm.classList.add("is-hidden");
    root.classList.add("is-task-wizard");
    taskVoiceWizardPrompt.textContent = message;
    taskVoiceWizardSpeak.classList.add("is-hidden");
    taskVoiceWizardContinue.classList.add("is-hidden");
    taskVoiceWizardSkip.classList.add("is-hidden");
    taskWizardSetStatus("Thông tin vẫn còn trong biểu mẫu. Có thể chỉnh sửa rồi bấm Lưu công việc khi sẵn sàng.");
    appendTaskWizardMessage("assistant", message);
    positionTaskWizardBubble();
    speakLunaText(message);
  }

  function startTaskWizard() {
    if (taskWizard.active) {
      appendTaskWizardMessage("assistant", taskWizard.mode === "progress"
        ? "Dạ, em đang cùng mình cập nhật công việc rồi ạ. Mình trả lời mục đang hiện trên khung hội thoại nhé."
        : "Dạ, em đang cùng mình tạo công việc rồi ạ. Mình trả lời mục đang hiện trên khung hội thoại nhé.");
      return;
    }
    if (typeof canCreateRegularTasks !== "function" || !canCreateRegularTasks()) {
      appendMessage("assistant", "Tài khoản này chưa được cấp quyền tạo công việc nên em chưa thể mở hướng dẫn ạ.");
      return;
    }
    const taskNav = document.querySelector('.nav-item[data-view="tasks"]');
    if (taskNav && !document.getElementById("tasks")?.classList.contains("is-active")) taskNav.click();
    window.setTimeout(() => {
      if (!currentAccount() || !canCreateRegularTasks()) {
        appendMessage("assistant", "Quyền tạo công việc đã thay đổi; em chưa mở biểu mẫu ạ.");
        return;
      }
      const trigger = document.getElementById("openTaskForm");
      if (!trigger || trigger.classList.contains("is-hidden")) {
        appendMessage("assistant", "Em chưa thể mở biểu mẫu tạo việc lúc này. Anh/chị vui lòng vào mục Công việc để thử lại ạ.");
        return;
      }
      if (!panel.classList.contains("is-hidden")) setPanelOpen(false, { restoreFocus: false });
      trigger.click();
      taskWizard.mode = "create";
      taskWizard.accountId = String(currentAccount()?.id || "");
      taskWizard.taskId = "";
      taskWizard.kind = "regular";
      taskWizard.form = taskForm;
      taskWizard.steps = buildTaskWizardSteps();
      taskWizard.index = 0;
      taskWizard.active = true;
      taskWizard.awaitingConfirmation = false;
      taskWizard.applyingAnswer = false;
      taskWizardConversation.replaceChildren();
      taskWizardReply.value = "";
      taskVoiceWizard.setAttribute("aria-label", "Luna đồng hành tạo công việc");
      document.getElementById("taskWizardModeLabel").textContent = "Cùng tạo công việc";
      root.classList.add("is-task-wizard");
      taskVoiceWizard.classList.remove("is-hidden");
      taskWizardReplyForm.classList.remove("is-hidden");
      positionTaskWizardBubble();
      askTaskWizardStep();
    }, 90);
  }

  function taskWizardSelectOption(select, answer) {
    const options = Array.from(select.options).filter((option) => option.value && !option.disabled);
    const matched = uniqueDraftMatch(options, answer, (option) => option.textContent || option.label || option.value);
    if (!matched) return false;
    select.value = matched.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function cleanTaskWizardAnswer(value, key) {
    let answer = String(value || "").trim().replace(/[.!?]+$/g, "");
    const prefixes = {
      title: /^(?:(?:tên|tiêu đề) công việc\s*(?:là)?\s*)/i,
      project: /^(?:(?:danh mục dự án|dự án)\s*(?:là)?\s*)/i,
      owner: /^(?:(?:người thực hiện|giao cho)\s*(?:là)?\s*)/i,
      category: /^(?:(?:danh mục nhiệm vụ)\s*(?:là)?\s*)/i,
      workType: /^(?:loại công việc\s*(?:là)?\s*)/i,
      priority: /^(?:(?:mức độ ưu tiên|mức ưu tiên|ưu tiên)\s*(?:là)?\s*)/i,
      recurrence: /^(?:định kỳ\s*(?:là)?\s*)/i,
      startDate: /^(?:(?:ngày bắt đầu|bắt đầu)\s*(?:là)?\s*)/i,
      due: /^(?:(?:ngày hoàn thành|hạn hoàn thành|hạn)\s*(?:là)?\s*)/i,
      status: /^(?:trạng thái\s*(?:là)?\s*)/i,
      progress: /^(?:tiến độ\s*(?:là)?\s*)/i,
      progressReport: /^(?:báo cáo tiến độ\s*(?:là)?\s*)/i,
      quality: /^(?:chất lượng\s*(?:là)?\s*)/i,
      note: /^(?:(?:nội dung|ghi chú)\s*(?:là)?\s*)/i,
      followUp: /^(?:mốc cập nhật tiếp theo\s*(?:là)?\s*)/i,
      blockerStatus: /^(?:trạng thái trở ngại\s*(?:là)?\s*)/i,
      blockerNote: /^(?:(?:nội dung trở ngại|đề nghị hỗ trợ|ghi chú trở ngại)\s*(?:là)?\s*)/i,
    };
    if (prefixes[key]) answer = answer.replace(prefixes[key], "");
    if (key === "owner") answer = answer.replace(/^(?:anh|chị|ông|bà)\s+/i, "");
    return answer.trim();
  }

  function taskWizardDeclinesOptional(value) {
    const normalized = normalize(value).replace(/\s+(?:a|nhe|nha|nhe em)$/g, "").trim();
    return /^(?:khong|khong can|khong co|chua co|bo qua|de trong|khong can phoi hop|khong co ai(?: phoi hop)?|khong co nguoi phoi hop|khong co cong viec phu thuoc)$/.test(normalized);
  }

  function applyTaskWizardAnswer(step, transcript) {
    const answer = cleanTaskWizardAnswer(transcript, step.key);
    const normalized = normalize(answer);
    if (!answer && !step.optional) return false;
    if (step.key === "collaborators" || step.key === "dependencies") {
      const containerId = step.key === "collaborators" ? "taskCollaborators" : "taskDependencies";
      const boxes = Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]`));
      if (taskWizardDeclinesOptional(answer)) {
        boxes.forEach((checkbox) => { checkbox.checked = false; });
        document.getElementById(containerId)?.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      const names = answer.replace(/^(?:người phối hợp|phối hợp|công việc phụ thuộc|phụ thuộc vào|là)\s*/i, "")
        .split(/\s*(?:,|;|\s+và\s+|\s+với\s+)\s*/i)
        .map((name) => name.replace(/^(?:anh|chị|ông|bà)\s+/i, "").trim()).filter(Boolean);
      if (!names.length) return false;
      const matches = names.map((name) => uniqueDraftMatch(boxes, name, (checkbox) => checkbox.closest("label")?.textContent || checkbox.value));
      if (matches.some((checkbox) => !checkbox)) return false;
      boxes.forEach((checkbox) => { checkbox.checked = matches.includes(checkbox); });
      document.getElementById(containerId)?.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    const field = taskWizardField(step);
    if (!field) return false;
    if (step.optional && taskWizardDeclinesOptional(answer)) {
      if (step.key === "attachments") field.value = "";
      else field.value = "";
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (step.key === "attachments") return false;
    if (["title", "note", "blockerNote", "progressReport"].includes(step.key)) {
      field.value = answer;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return step.key !== "title" || Boolean(field.value.trim());
    }
    if (["startDate", "due", "followUp"].includes(step.key)) {
      const date = draftDate(answer);
      if (!date) return false;
      field.value = date;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (step.key === "progress" || step.key === "quality") {
      const numberMatch = answer.match(/\d{1,3}(?:[.,]\d{1,2})?/);
      if (!numberMatch) return false;
      const value = Number(numberMatch[0].replace(",", "."));
      const max = step.key === "progress" ? 100 : 120;
      if (!Number.isFinite(value) || value < 0 || value > max) return false;
      if (taskWizard.mode === "progress" && step.key === "progress"
        && normalize(taskWizardField({ key: "status" })?.value) === normalize("Hoàn thành") && value !== 100) return false;
      field.value = String(value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (step.key === "status") {
      if (!taskWizardSelectOption(field, answer)) return false;
      if (typeof syncTaskStatusChoices === "function") syncTaskStatusChoices();
      if (taskWizard.mode === "progress" && normalize(field.value) === normalize("Hoàn thành")) {
        const progressField = taskWizardField({ key: "progress" });
        if (!progressField?.disabled) {
          progressField.value = "100";
          progressField.dispatchEvent(new Event("input", { bubbles: true }));
          progressField.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      return true;
    }
    if (step.key === "owner" && /^(?:toi|minh|chinh toi|chinh minh|anh|chi)$/.test(normalized)) {
      const self = typeof currentPerson === "function" ? currentPerson() : null;
      if (!self || !canCreateRegularTaskForPerson?.(self.id)
        || !Array.from(field.options).some((option) => option.value === String(self.id))) return false;
      field.value = String(self.id);
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (step.key === "workType") {
      const value = /phat sinh/.test(normalized) ? "arising" : /thuong xuyen/.test(normalized) ? "routine" : "";
      if (!value) return false;
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (step.key === "priority") {
      const value = /khan|gap/.test(normalized) ? "urgent" : /cao|uu tien cao/.test(normalized) ? "high" : /binh thuong|thuong/.test(normalized) ? "normal" : "";
      if (!value) return false;
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (step.key === "recurrence") {
      const value = /khong dinh ky|khong lap|khong lap lai|khong/.test(normalized) ? "none"
        : /hang ngay|moi ngay/.test(normalized) ? "daily"
          : /hang tuan|moi tuan/.test(normalized) ? "weekly"
            : /hang thang|moi thang/.test(normalized) ? "monthly"
              : /hang quy|moi quy/.test(normalized) ? "quarterly" : "";
      if (!value) return false;
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return taskWizardSelectOption(field, answer);
  }

  function handleTaskWizardTranscript(transcript, accountId) {
    if (!taskWizard.active || !currentAccount() || String(currentAccount().id) !== accountId || accountId !== taskWizard.accountId) return false;
    const answer = String(transcript || "").trim();
    if (!answer) return false;
    appendTaskWizardMessage("user", answer);
    if (taskWizard.awaitingConfirmation) {
      const confirmation = taskWizardConfirmationIntent(answer);
      if (confirmation === "yes") {
        const task = taskWizard.mode === "progress"
          ? currentTasks().find((item) => String(item.id) === taskWizard.taskId)
          : null;
        const permissionValid = taskWizard.mode === "progress"
          ? !!task && typeof canUpdateTaskProgress === "function" && canUpdateTaskProgress(task)
          : typeof canCreateRegularTasks === "function" && canCreateRegularTasks();
        if (!permissionValid || !taskWizard.form) {
          exitTaskWizard(taskWizard.mode === "progress"
            ? "Quyền cập nhật công việc đã thay đổi hoặc công việc không còn khả dụng. Em chưa lưu dữ liệu ạ."
            : "Quyền tạo công việc không còn khả dụng; em chưa lưu dữ liệu ạ.");
          return false;
        }
        if (!taskWizard.form.reportValidity()) {
          taskWizardSetStatus("Biểu mẫu còn thiếu hoặc chưa hợp lệ. Vui lòng hoàn thiện trường đang được trình duyệt đánh dấu rồi xác nhận lưu lại ạ.");
          appendTaskWizardMessage("assistant", taskVoiceWizardStatus.textContent);
          return false;
        }
        taskWizard.form.requestSubmit();
        taskWizardSetStatus("Em đã nhận xác nhận và đang gửi biểu mẫu qua luồng lưu hiện có ạ.");
        appendTaskWizardMessage("assistant", taskVoiceWizardStatus.textContent);
        return true;
      }
      if (confirmation === "no") {
        keepTaskWizardDraftUnsaved(`Dạ, em chưa lưu. Biểu mẫu vẫn giữ nguyên để ${taskWizardAddress()} chỉnh sửa hoặc tự lưu sau ạ.`);
        return true;
      }
      taskWizardSetStatus(`Em chưa nhận được xác nhận rõ ràng. ${taskWizardAddress()} có thể nói “có” để lưu, “chưa” để giữ bản nháp, hoặc bấm nút Lưu công việc ạ.`);
      appendTaskWizardMessage("assistant", taskVoiceWizardStatus.textContent);
      speakLunaText(taskVoiceWizardStatus.textContent);
      return false;
    }
    const step = taskWizard.steps[taskWizard.index];
    if (!step) return false;
    if (taskWizard.mode === "progress" && step.key === "task") return resolveLunaProgressTask(answer);
    taskWizard.applyingAnswer = true;
    const applied = applyTaskWizardAnswer(step, answer);
    taskWizard.applyingAnswer = false;
    if (!applied) {
      const message = taskWizard.mode === "progress" && step.key === "progress"
        && normalize(taskWizardField({ key: "status" })?.value) === normalize("Hoàn thành")
        ? "Công việc ở trạng thái Hoàn thành phải có tiến độ 100%. Anh/chị nhập 100% hoặc đổi trạng thái trước khi tiếp tục ạ."
        : `Em chưa xác định chắc câu trả lời cho mục “${step.label}”. Vui lòng nói rõ hơn hoặc chọn mục trực tiếp trên biểu mẫu ạ.`;
      taskWizardSetStatus(message);
      appendTaskWizardMessage("assistant", taskVoiceWizardStatus.textContent);
      speakLunaText(taskVoiceWizardStatus.textContent);
      return false;
    }
    taskWizardSetStatus(`Em đã cập nhật “${step.label}” vào biểu mẫu. Chưa có dữ liệu nào được lưu.`);
    if (step.key === "owner") {
      window.setTimeout(() => {
        if (taskWizard.active && taskWizard.steps[taskWizard.index] === step) advanceTaskWizardStep({ recordAnswer: false });
      }, 0);
    } else {
      advanceTaskWizardStep({ recordAnswer: false });
    }
    return true;
  }

  function submitTaskWizardReply(event) {
    event?.preventDefault();
    if (!taskWizard.active) return false;
    const answer = String(taskWizardReply?.value || "").trim();
    if (!answer) {
      taskWizardSetStatus("Em đang chờ câu trả lời cho mục hiện tại ạ.");
      taskWizardReply?.focus({ preventScroll: true });
      return false;
    }
    taskWizardReply.value = "";
    return handleTaskWizardTranscript(answer, String(currentAccount()?.id || ""));
  }

  function isGenericTaskCreationIntent(text) {
    const phrase = normalize(text).replace(/[.!?]+$/g, "").replace(/^(?:luna\s+oi\s*[,;:]?\s*)/, "").trim();
    return /^(?:(?:giup toi|cho toi|toi muon|minh muon|em muon|hay|lam on)\s+)?(?:tao|them)(?:\s+mot)?\s+(?:cong viec|viec)(?:\s+moi)?(?:\s+(?:giup toi|giup em|voi|nhe|nha|di))*$/.test(phrase)
      || /^(?:giup toi|cho toi)\s+(?:tao|them)(?:\s+mot)?\s+(?:cong viec|viec)(?:\s+moi)?(?:\s+(?:voi|nhe|nha|di))?$/.test(phrase);
  }

  function taskWizardConfirmationIntent(value) {
    const normalized = normalize(value).replace(/[.,!?;:]+/g, " ").replace(/\s+/g, " ").trim();
    if (/^(?:khong|chua|khong luu|chua luu|de sau|de toi sua|sua lai)(?:\s+.*)?$/.test(normalized)) return "no";
    if (/^(?:co|dong y|vang|duoc|luu|xac nhan|hay luu|toi dong y)(?:\s+(?:a|nhe|giup toi|giup em|cong viec|ngay|di|em|luon|luu))*$/.test(normalized)) return "yes";
    return "";
  }

  function uniqueDraftMatch(items, query, getName) {
    const wanted = normalize(query);
    if (!wanted) return null;
    const names = items.filter((item) => normalize(getName(item)).includes(wanted) || wanted.includes(normalize(getName(item))));
    const exact = names.filter((item) => normalize(getName(item)) === wanted);
    if (exact.length === 1) return exact[0];
    return names.length === 1 ? names[0] : null;
  }

  function takeTaskClause(source, labelPattern) {
    const labels = "(?:ngày bắt đầu|bắt đầu(?: ngày)?|dự án|giao cho|người thực hiện(?: là)?|người phối hợp|phối hợp|danh mục nhiệm vụ|loại công việc|mức độ ưu tiên|mức ưu tiên|ưu tiên|định kỳ|lặp lại|nội dung công việc|nội dung|mô tả|ghi chú|hạn(?: hoàn thành)?|hoàn thành trước|trước ngày)";
    const expression = new RegExp("(?:^|[,;]\\s*|\\s+)(?:" + labelPattern + ")\\s*(?:là\\s*)?[:\\-]?\\s*(.+?)(?=\\s*(?:[,;]\\s*)?(?:" + labels + ")|$)", "i");
    const match = String(source || "").match(expression);
    if (!match) return { source: String(source || ""), value: "" };
    return {
      source: String(source || "").replace(match[0], " "),
      value: String(match[1] || "").replace(/[,;:\s]+$/g, "").trim(),
    };
  }

  function createTaskDraft(raw, createMatch) {
    let details = String(createMatch && createMatch[1] || "").trim();
    const dateToken = "(?:20\\d{2}-\\d{1,2}-\\d{1,2}|(?:ngày\\s*)?\\d{1,2}\\s+tháng\\s+\\d{1,2}(?:\\s+năm\\s+20\\d{2})?|\\d{1,2}[/. \\-]\\d{1,2}(?:[/. \\-]20\\d{2})?|hôm nay|ngày mai|ngày kia)";
    const dateMatch = details.match(new RegExp("(?:hạn(?: hoàn thành)?|hoàn thành trước|trước ngày)\\s*(" + dateToken + ")", "i"));
    const due = draftDate(dateMatch && dateMatch[1]);
    const startMatch = details.match(new RegExp("(?:ngày bắt đầu|bắt đầu(?: ngày)?)\\s*(" + dateToken + ")", "i"));
    const startDate = draftDate(startMatch && startMatch[1]);
    if (dateMatch) details = details.replace(dateMatch[0], " ");
    if (startMatch) details = details.replace(startMatch[0], " ");

    const projectField = takeTaskClause(details, "dự án");
    details = projectField.source;
    const ownerField = takeTaskClause(details, "giao cho|người thực hiện(?: là)?");
    details = ownerField.source;
    const collaboratorField = takeTaskClause(details, "người phối hợp|phối hợp");
    details = collaboratorField.source;
    const categoryField = takeTaskClause(details, "danh mục nhiệm vụ");
    details = categoryField.source;
    const workTypeField = takeTaskClause(details, "loại công việc");
    details = workTypeField.source;
    const priorityField = takeTaskClause(details, "mức độ ưu tiên|mức ưu tiên|ưu tiên");
    details = priorityField.source;
    const recurrenceField = takeTaskClause(details, "định kỳ|lặp lại");
    details = recurrenceField.source;
    const noteField = takeTaskClause(details, "nội dung công việc|nội dung|mô tả|ghi chú");
    details = noteField.source;
    details = details.replace(/^(?:tạo|thêm)\s+(?:một\s+)?(?:công việc|việc)\s*(?::|là|-)?\s*/i, "")
      .replace(/^(?:giúp tôi|cho tôi|mới)\s*/i, "").replace(/^[,;:\s]+|[,;:\s]+$/g, "").trim();

    const projectQuery = projectField.value;
    const projects = searchProjects(projectQuery, currentTasks());
    const project = uniqueDraftMatch(projects, projectQuery, (item) => item.name);
    const people = typeof state !== "undefined" && typeof canCreateRegularTaskForPerson === "function"
      ? (state.people || []).filter((person) => canCreateRegularTaskForPerson(person.id)) : [];
    const ownerQuery = ownerField.value;
    const owner = uniqueDraftMatch(people, ownerQuery, (item) => item.name);
    const self = typeof currentPerson === "function" ? currentPerson() : null;
    const ownerId = owner ? owner.id : ownerQuery ? "" : self && canCreateRegularTaskForPerson(self.id) ? self.id : "";
    const now = new Date();
    const categoryOptions = ownerId && typeof taskCategoryOptionsForPerson === "function" ? taskCategoryOptionsForPerson(ownerId) : [];
    const categoryQuery = categoryField.value;
    const category = uniqueDraftMatch(categoryOptions, categoryQuery, (item) => item);
    const collaboratorNames = collaboratorField.value.split(/\s*(?:,|;|\s+và\s+)\s*/i).map((name) => name.trim()).filter(Boolean);
    const collaboratorPeople = typeof visiblePeopleForTasks === "function" ? visiblePeopleForTasks() : people;
    const collaborators = collaboratorNames.map((name) => uniqueDraftMatch(collaboratorPeople, name, (person) => person.name)).filter(Boolean)
      .filter((person) => person.id !== ownerId && canCreateRegularTaskForPerson(person.id));
    const unresolvedCollaborators = collaboratorNames.filter((name) => !uniqueDraftMatch(collaboratorPeople, name, (person) => person.name));
    const normalizedWorkType = normalize(workTypeField.value);
    const normalizedPriority = normalize(priorityField.value);
    const normalizedRecurrence = normalize(recurrenceField.value);
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
      collaboratorIds: collaborators.map((person) => person.id),
      collaboratorNames: collaborators.map((person) => person.name),
      unresolvedCollaborators,
      category: category || "",
      categoryQuery,
      unresolvedCategory: categoryQuery && !category ? categoryQuery : "",
      workType: /phat sinh/.test(normalizedWorkType) ? "arising" : /thuong xuyen/.test(normalizedWorkType) ? "routine" : "",
      priority: /khan/.test(normalizedPriority) ? "urgent" : /cao/.test(normalizedPriority) ? "high" : /binh thuong/.test(normalizedPriority) ? "normal" : "",
      recurrence: /hang ngay|moi ngay/.test(normalizedRecurrence) ? "daily"
        : /hang tuan/.test(normalizedRecurrence) ? "weekly"
          : /hang thang/.test(normalizedRecurrence) ? "monthly"
            : /hang quy/.test(normalizedRecurrence) ? "quarterly"
              : /khong dinh ky|khong lap/.test(normalizedRecurrence) ? "none" : "",
      note: noteField.value,
      startDate: startDate || (String(now.getFullYear()) + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0")),
      due: due,
      sourceText: raw,
    };
  }

  function showTaskDraftPreview(draft) {
    const rows = [
      ["Tên công việc", draft.title || "Chưa có, cần nhập trong biểu mẫu"],
      ["Dự án", draft.projectName || draft.unresolvedProject || "Chưa xác định, vui lòng chọn"],
      ["Người thực hiện", draft.ownerName || draft.unresolvedOwner || "Mặc định là tài khoản hiện tại, vui lòng kiểm tra"],
      ["Người phối hợp", draft.collaboratorNames?.join(", ") || draft.unresolvedCollaborators?.join(", ") || "Chưa nêu"],
      ["Danh mục nhiệm vụ", draft.category || draft.unresolvedCategory || "Theo danh mục của người thực hiện; vui lòng kiểm tra"],
      ["Loại công việc", draft.workType === "arising" ? "Công việc phát sinh" : draft.workType === "routine" ? "Công việc thường xuyên" : "Mặc định, vui lòng kiểm tra"],
      ["Mức độ ưu tiên", draft.priority === "urgent" ? "Khẩn" : draft.priority === "high" ? "Cao" : draft.priority === "normal" ? "Bình thường" : "Mặc định, vui lòng kiểm tra"],
      ["Định kỳ", ({ daily: "Hàng ngày", weekly: "Hàng tuần", monthly: "Hàng tháng", quarterly: "Hàng quý", none: "Không định kỳ" })[draft.recurrence] || "Không định kỳ"],
      ["Ngày bắt đầu", draft.startDate],
      ["Hạn hoàn thành", draft.due || "Chưa nêu, vui lòng chọn"],
      ...(draft.note ? [["Nội dung", draft.note]] : []),
    ];
    const cells = rows.map((row) => "<dt>" + escapeHtml(row[0]) + "</dt><dd>" + escapeHtml(row[1]) + "</dd>").join("");
    const pronoun = assistantUserProfile(currentAccount()).pronoun;
    const html = '<section class="assistant-task-preview"><h3>Kiểm tra bản nháp công việc</h3><dl>' + cells
      + `</dl><p class="assistant-ai-meta">Chưa có dữ liệu nào được lưu. ${escapeHtml(pronoun)} vẫn cần kiểm tra biểu mẫu và tự bấm Lưu.</p>`
      + '<div class="assistant-task-preview-actions"><button type="button" data-assistant-confirm-task="' + escapeHtml(draft.draftId)
      + '">Xem và điền biểu mẫu</button><button type="button" data-assistant-cancel-task="' + escapeHtml(draft.draftId) + '">Hủy</button></div></section>';
    pendingTaskDrafts.set(draft.draftId, draft);
    appendMessage("assistant", html, { html: true });
  }

  function showProgressDraftPreview(task, nextProgress) {
    startTaskProgressWizard(task, nextProgress);
  }

  function parseProgressUpdateCommand(raw) {
    const phrase = normalize(raw)
      .replace(/^luna\s+oi\s*[,;:]?\s*/, "")
      .replace(/^(?:giup toi|cho toi|toi muon|hay|lam on)\s+/, "")
      .replace(/\s+phan tram\b/g, "%")
      .replace(/\s+(?:giup toi|giup em|nhe|nha|a|voi|di)$/, "")
      .replace(/[.!?]+$/g, "")
      .trim();
    const intent = /^(?:(?:cap nhat|dieu chinh)\s+(?:tien do|cong viec|viec)\b|(?:dat|dua)\s+tien do\b)/.test(phrase);
    if (!intent) return null;

    const patterns = [
      /^(?:cap nhat|dieu chinh)\s+tien do\s+(?:(?:cho|cua)\s+)?(?:cong viec|viec)\s+(.+?)\s+(?:len|thanh|toi|dat)\s*(\d{1,3})\s*%$/,
      /^(?:cap nhat|dieu chinh)\s+tien do\s+(?:cho|cua)\s+(.+?)\s+(?:len|thanh|toi|dat)\s*(\d{1,3})\s*%$/,
      /^(?:cap nhat|dieu chinh)\s+tien do\s+(.+?)\s+(?:len|thanh|toi|dat)\s*(\d{1,3})\s*%$/,
      /^(?:cap nhat|dieu chinh)\s+tien do\s+(?:(?:cong viec|viec)\s+)?(.+?)\s+(\d{1,3})\s*%$/,
      /^(?:cap nhat|dieu chinh)\s+(?:cong viec|viec)\s+(.+?)\s+(?:tien do\s+)?(?:len|thanh|toi|dat)\s*(\d{1,3})\s*%$/,
      /^(?:dat|dua)\s+tien do\s+(?:cong viec|viec)\s+(.+?)\s+(?:len|thanh|toi|dat)\s*(\d{1,3})\s*%$/,
      /^(?:cap nhat|dieu chinh)\s+(.+?)\s+tien do\s+(?:len|thanh|toi|dat)\s*(\d{1,3})\s*%$/,
    ];
    for (const pattern of patterns) {
      const match = phrase.match(pattern);
      if (match) return { taskQuery: match[1].trim(), progress: Number(match[2]) };
    }

    const partial = phrase.match(/^(?:cap nhat|dieu chinh)\s+(?:tien do\s+)?(?:cho\s+)?(?:cong viec|viec)\s+(.+)$/);
    return { taskQuery: partial ? partial[1].trim() : "", progress: null };
  }

  function progressUpdateTaskMatches(query) {
    return searchTasks(currentTasks(), query);
  }

  function resolveProgressWizardTask(query) {
    const matches = progressUpdateTaskMatches(query);
    const task = uniqueDraftMatch(matches, query, (item) => item.title);
    if (!task) {
      if (matches.length > 1) {
        appendMessage("assistant", `Có ${matches.length} công việc phù hợp. Anh/chị cho em tên cụ thể hơn hoặc thêm tên dự án để tránh cập nhật nhầm ạ.${makeTaskListHtml(matches.slice(0, 5))}`, { html: true });
      } else {
        appendMessage("assistant", "Em chưa tìm thấy công việc phù hợp trong phạm vi được phép cập nhật. Anh/chị thử nêu tên công việc rõ hơn ạ.");
      }
      return false;
    }
    if (typeof canUpdateTaskProgress !== "function" || !canUpdateTaskProgress(task)) {
      appendMessage("assistant", "Em tìm thấy công việc nhưng tài khoản hiện tại không có quyền cập nhật tiến độ công việc đó.");
      return false;
    }
    return startTaskProgressWizard(task);
  }

  function startProgressUpdateWizard(taskQuery = "") {
    return startLunaProgressUpdateWizard(taskQuery);
  }

  function handleProgressUpdateWizardReply(raw) {
    return taskWizard.active && taskWizard.mode === "progress"
      ? handleTaskWizardTranscript(raw, String(currentAccount()?.id || ""))
      : false;
  }

  function startTaskProgressWizard(task, suggestedProgress = null) {
    if (!task || typeof canUpdateTaskProgress !== "function" || !canUpdateTaskProgress(task)) {
      appendMessage("assistant", "Tài khoản này không có quyền cập nhật tiến độ công việc đó.");
      return false;
    }
    if (taskWizard.active && taskWizard.mode !== "progress") {
      appendMessage("assistant", "Em đang đồng hành tạo công việc. Hãy hoàn tất hoặc dừng hướng dẫn đó trước khi bắt đầu cập nhật ạ.");
      return false;
    }
    const accountId = String(currentAccount()?.id || "");
    const opened = window.virtualAssistantOpenProgressForm?.({
      accountId,
      taskId: String(task.id),
      currentProgress: Number(task.progress || 0),
    });
    if (!opened) {
      appendMessage("assistant", "Em chưa thể mở biểu mẫu cập nhật an toàn lúc này. Không có dữ liệu nào được thay đổi.");
      return false;
    }
    if (!panel.classList.contains("is-hidden")) setPanelOpen(false, { restoreFocus: false });
    taskWizard.mode = "progress";
    taskWizard.accountId = accountId;
    taskWizard.taskId = opened.taskId;
    taskWizard.kind = opened.kind;
    taskWizard.form = document.getElementById(opened.formId);
    taskWizard.steps = buildTaskProgressWizardSteps();
    taskWizard.index = 0;
    taskWizard.active = true;
    taskWizard.awaitingConfirmation = false;
    taskWizard.applyingAnswer = false;
    taskWizardConversation.replaceChildren();
    taskWizardReply.value = "";
    const progressField = taskWizardField({ key: "progress" });
    const proposed = Number(suggestedProgress);
    if (Number.isInteger(proposed) && proposed >= 0 && proposed <= 100 && progressField && !progressField.disabled) {
      progressField.value = String(proposed);
    }
    taskVoiceWizard.setAttribute("aria-label", "Luna đồng hành cập nhật công việc");
    document.getElementById("taskWizardModeLabel").textContent = "Cùng cập nhật công việc";
    root.classList.add("is-task-wizard");
    taskVoiceWizard.classList.remove("is-hidden");
    taskWizardReplyForm.classList.remove("is-hidden");
    appendTaskWizardMessage("assistant", `Em đã mở biểu mẫu cho “${opened.title}”. Trạng thái hiện tại: ${opened.currentStatus}; tiến độ hiện tại: ${opened.currentProgress}%. Mình sẽ đi lần lượt từng mục, chưa lưu gì ạ.`);
    positionTaskWizardBubble();
    askTaskWizardStep();
    return true;
  }

  function resolveLunaProgressTask(query) {
    const matches = progressUpdateTaskMatches(query);
    const task = uniqueDraftMatch(matches, query, (item) => item.title);
    if (!task) {
      const message = matches.length > 1
        ? `Có ${matches.length} công việc phù hợp: ${matches.slice(0, 5).map((item) => item.title).join("; ")}. Anh/chị nêu rõ tên công việc hoặc dự án để em tránh chọn nhầm ạ.`
        : "Em chưa tìm thấy công việc phù hợp trong phạm vi được phép cập nhật. Anh/chị thử nêu tên công việc rõ hơn ạ.";
      taskWizardSetStatus(message);
      appendTaskWizardMessage("assistant", message);
      speakLunaText(message);
      return false;
    }
    if (typeof canUpdateTaskProgress !== "function" || !canUpdateTaskProgress(task)) {
      const message = "Em tìm thấy công việc nhưng tài khoản hiện tại không có quyền cập nhật tiến độ công việc đó.";
      taskWizardSetStatus(message);
      appendTaskWizardMessage("assistant", message);
      speakLunaText(message);
      return false;
    }
    return startTaskProgressWizard(task, taskWizard.suggestedProgress);
  }

  function startLunaProgressUpdateWizard(taskQuery = "", suggestedProgress = null) {
    if (typeof canViewTasks !== "function" || !canViewTasks()) {
      appendMessage("assistant", "Tài khoản này chưa được cấp quyền tra cứu công việc để cập nhật tiến độ.");
      return false;
    }
    if (taskWizard.active && taskWizard.mode !== "progress") {
      appendMessage("assistant", "Em đang đồng hành tạo công việc. Hãy hoàn tất hoặc dừng hướng dẫn đó trước khi bắt đầu cập nhật ạ.");
      return false;
    }
    taskWizard.mode = "progress";
    taskWizard.accountId = String(currentAccount()?.id || "");
    taskWizard.taskId = "";
    taskWizard.kind = "";
    taskWizard.form = null;
    taskWizard.steps = [{ key: "task", label: "Công việc", question: "Anh/chị muốn cập nhật công việc nào ạ?" }];
    taskWizard.index = 0;
    taskWizard.active = true;
    taskWizard.awaitingConfirmation = false;
    taskWizard.applyingAnswer = false;
    taskWizard.suggestedProgress = Number.isInteger(suggestedProgress) && suggestedProgress >= 0 && suggestedProgress <= 100
      ? suggestedProgress : null;
    taskWizardConversation.replaceChildren();
    taskWizardReply.value = "";
    if (!panel.classList.contains("is-hidden")) setPanelOpen(false, { restoreFocus: false });
    taskVoiceWizard.setAttribute("aria-label", "Luna đồng hành cập nhật công việc");
    document.getElementById("taskWizardModeLabel").textContent = "Cùng cập nhật công việc";
    root.classList.add("is-task-wizard");
    taskVoiceWizard.classList.remove("is-hidden");
    taskWizardReplyForm.classList.remove("is-hidden");
    if (taskQuery) {
      appendTaskWizardMessage("user", taskQuery);
      if (resolveLunaProgressTask(taskQuery)) return true;
    }
    askTaskWizardStep();
    return true;
  }

  function aiSourceHtml(payload) {
    const sources = Array.isArray(payload && payload.sources) ? payload.sources.slice(0, 8) : [];
    const externalSources = (Array.isArray(payload && payload.externalSources) ? payload.externalSources : [])
      .map((source) => {
        try {
          const url = new URL(String(source && source.url || ""));
          return ["http:", "https:"].includes(url.protocol)
            ? { title: String(source.title || url.hostname).slice(0, 180), url: url.href }
            : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((source, index, list) => list.findIndex((item) => item.url === source.url) === index)
      .slice(0, 8);
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
    const externalRows = externalSources.map((source) => '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">'
      + escapeHtml(source.title) + '</a>').join("");
    return (meta ? '<p class="assistant-ai-meta">' + escapeHtml(meta) + "</p>" : "")
      + (sourceRows ? '<section class="assistant-ai-sources"><strong>Nguồn hệ thống trong phạm vi được phép</strong>' + sourceRows + "</section>" : "")
      + (externalRows ? '<section class="assistant-ai-external-sources"><strong>Nguồn bên ngoài</strong>' + externalRows + "</section>" : "");
  }

  function aiReplyHtml(reply, payload) {
    const citations = (Array.isArray(payload && payload.externalSources) ? payload.externalSources : [])
      .map((source) => {
        try {
          const url = new URL(String(source && source.url || ""));
          return ["http:", "https:"].includes(url.protocol) ? url.href : "";
        } catch {
          return "";
        }
      })
      .filter((url, index, list) => url && list.indexOf(url) === index)
      .slice(0, 8);
    const citationLinks = citations.map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Mở nguồn ${index + 1}">[${index + 1}]</a>`).join(" ");
    return `<div class="assistant-ai-reply">${escapeHtml(reply).replace(/\r?\n/g, "<br>")}`
      + (citationLinks ? ` <span class="assistant-ai-inline-citations">${citationLinks}</span>` : "")
      + "</div>";
  }

  function assistantWorkReportKind(text) {
    if (!/(bao cao|tong ket)/.test(text)) return "";
    if (/(hang thang|theo thang|thang nay|thang hien tai|\bthang\b|monthly)/.test(text)) return "monthly";
    if (/(hang tuan|theo tuan|tuan nay|\btuan\b|weekly)/.test(text)) return "weekly";
    if (/(hang ngay|theo ngay|hom nay|\bngay\b|daily)/.test(text)) return "daily";
    return "";
  }

  function reserveAssistantWorkReportWindow(kind) {
    if (typeof canViewTasks !== "function" || !canViewTasks()) return null;
    if (kind === "monthly" && (typeof canViewMonthlyWorkReport !== "function" || !canViewMonthlyWorkReport())) return null;
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return null;
    reportWindow.document.open();
    reportWindow.document.write("<!doctype html><html lang=\"vi\"><meta charset=\"utf-8\"><title>Đang tạo báo cáo</title><body><p>Luna đang tổng hợp báo cáo, vui lòng chờ...</p></body></html>");
    reportWindow.document.close();
    return reportWindow;
  }

  async function presentAssistantWorkReport(kind, reportWindow = null) {
    if (typeof canViewTasks !== "function" || !canViewTasks()) {
      if (reportWindow && !reportWindow.closed) reportWindow.close();
      appendMessage("assistant", "Tài khoản này chưa được cấp quyền xem dữ liệu công việc để lập báo cáo.");
      return;
    }
    if (kind === "monthly" && (typeof canViewMonthlyWorkReport !== "function" || !canViewMonthlyWorkReport())) {
      if (reportWindow && !reportWindow.closed) reportWindow.close();
      appendMessage("assistant", "Báo cáo công việc hàng tháng hiện chỉ dành cho tài khoản Ban giám đốc và Admin.");
      return;
    }

    const today = typeof dailyReportDateValue === "function" ? dailyReportDateValue() : new Date().toISOString().slice(0, 10);
    const report = kind === "monthly"
      ? monthlyWorkReportData(typeof monthlyWorkReportPeriodValue === "function" ? monthlyWorkReportPeriodValue() : undefined)
      : kind === "weekly"
        ? weeklyWorkReportData(today)
        : dailyWorkReportData(today);
    const metrics = report.metrics || {};
    const title = kind === "monthly" ? "Báo cáo công việc hàng tháng"
      : kind === "weekly" ? "Báo cáo công việc hàng tuần" : "Báo cáo công việc hàng ngày";
    const period = kind === "monthly"
      ? `Kỳ ${String(report.period || "").slice(5, 7)}/${String(report.period || "").slice(0, 4)}`
      : kind === "weekly" ? `Tuần ${report.label || "hiện tại"}` : `Ngày ${typeof formatDate === "function" ? formatDate(report.date) : report.date}`;
    const stats = kind === "monthly"
      ? [
        `<span><strong>${Number(metrics.total) || 0}</strong> công việc</span>`,
        `<span><strong>${Number(metrics.completed) || 0}</strong> hoàn thành</span>`,
        `<span><strong>${Number(metrics.notDue) || 0}</strong> chưa đến hạn</span>`,
        `<span><strong>${Number(metrics.overdue) || 0}</strong> quá hạn</span>`,
      ]
      : [
        `<span><strong>${Number(metrics.total) || 0}</strong> công việc</span>`,
        `<span><strong>${Number(metrics.approved) || 0}</strong> duyệt đạt</span>`,
        `<span><strong>${Number(metrics.pending) || 0}</strong> chờ duyệt</span>`,
        `<span><strong>${Number(metrics.overdue) || 0}</strong> quá hạn</span>`,
      ];
    const departments = (Array.isArray(report.departments) ? report.departments : [])
      .filter((row) => Number(row.total) > 0)
      .slice(0, 5)
      .map((row) => `<li>${escapeHtml(row.name)}: ${Number(row.total) || 0} công việc</li>`)
      .join("");
    const summary = `<section class="assistant-report-preview"><h3>${title}</h3><p>${escapeHtml(period)} · ${escapeHtml(assistantSummaryScopeLabel())}</p>`
      + `<div class="assistant-report-metrics">${stats.join("")}</div>`
      + (departments ? `<ul>${departments}</ul>` : "<p>Không có công việc thuộc kỳ báo cáo này.</p>")
      + `<button type="button" data-assistant-export-report="${kind}"><svg aria-hidden="true"><use href="#icon-file-down"></use></svg>Mở lại báo cáo PDF</button></section>`;
    appendMessage("assistant", summary, { html: true });
    const opened = typeof window.openAssistantWorkReport === "function"
      ? await window.openAssistantWorkReport(kind, reportWindow, { quietOnBlocked: true })
      : false;
    if (!opened && !(reportWindow && reportWindow.closed)) {
      if (reportWindow && !reportWindow.closed) reportWindow.close();
      appendMessage("assistant", "Em đã tổng hợp báo cáo. Trình duyệt không cho mở cửa sổ tự động; anh/chị bấm “Mở lại báo cáo PDF” trong phần xem trước để mở tệp ạ.");
    }
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
      appendMessage("assistant", aiReplyHtml(reply, payload), { html: true });
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

  async function handleCommand(rawText, sequence = requestSequence, reportWindow = null) {
    const raw = String(rawText || "").trim();
    const text = normalize(raw);
    if (!raw || !currentAccount()) return;

    if (/^(mo )?(mau van ban|soan van ban|tao van ban theo mau)$/.test(text)) {
      if (typeof window.openDocumentTemplateManager === "function") {
        window.openDocumentTemplateManager();
        appendMessage("assistant", "Em đã mở Mẫu văn bản. Anh/chị có thể tạo mẫu từ PDF, Word hoặc ảnh scan, rồi điền để xuất một bản mới ạ.");
      } else {
        appendMessage("assistant", "Mẫu văn bản chưa sẵn sàng. Anh/chị thử tải lại trang giúp em ạ.");
      }
      return;
    }

    if (openModuleFromCommand(raw)) return;

    if (/^(mo )?(thong bao|trung tam thong bao)$/.test(text)) {
      openAssistantNotifications();
      return;
    }

    const reportKind = assistantWorkReportKind(text);
    if (reportKind) {
      await presentAssistantWorkReport(reportKind, reportWindow);
      return;
    }

    const progressUpdateRequest = parseProgressUpdateCommand(raw);
    if (progressUpdateRequest) {
      if (typeof canViewTasks !== "function" || !canViewTasks()) {
        appendMessage("assistant", "Tài khoản này chưa được cấp quyền tra cứu công việc để cập nhật tiến độ.");
        return;
      }
      const requestedProgress = progressUpdateRequest.progress;
      if (requestedProgress != null && (requestedProgress < 0 || requestedProgress > 100)) {
        appendMessage("assistant", "Tiến độ cần nằm trong khoảng từ 0% đến 100%.");
        return;
      }
      startLunaProgressUpdateWizard(progressUpdateRequest.taskQuery, requestedProgress);
      return;
    }

    if (isGenericTaskCreationIntent(raw)) {
      startTaskWizard();
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
    if (taskWizard.active) {
      input.value = "";
      handleTaskWizardTranscript(text, String(currentAccount()?.id || ""));
      return;
    }
    const reportKind = assistantWorkReportKind(text);
    const reportWindow = reportKind ? reserveAssistantWorkReportWindow(reportKind) : null;
    requestSequence += 1;
    const currentRequest = requestSequence;
    appendMessage("user", text);
    input.value = "";
    setState("thinking", "Đang tra cứu trong phạm vi được phép");
    window.setTimeout(() => {
      if (currentRequest === requestSequence && !panel.classList.contains("is-hidden")) handleCommand(text, currentRequest, reportWindow);
      else if (reportWindow && !reportWindow.closed) reportWindow.close();
    }, 180);
  });

  root.addEventListener("click", (event) => {
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
    const reportExportButton = event.target.closest("[data-assistant-export-report]");
    if (reportExportButton) {
      const kind = reportExportButton.dataset.assistantExportReport;
      if (kind === "monthly" && (typeof canViewMonthlyWorkReport !== "function" || !canViewMonthlyWorkReport())) {
        appendMessage("assistant", "Tài khoản này không còn quyền xuất báo cáo tháng. Em chưa mở tệp báo cáo.");
        return;
      }
      if (typeof window.openAssistantWorkReport === "function") window.openAssistantWorkReport(kind);
      else appendMessage("assistant", "Em chưa thể mở báo cáo lúc này. Anh/chị thử gửi lại yêu cầu sau ạ.");
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
    positionTaskWizardBubble();
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
      positionTaskWizardBubble();
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
    if (taskWizard.active) {
      const currentStep = taskWizard.steps[taskWizard.index];
      speakLunaText(taskWizard.awaitingConfirmation ? taskVoiceWizardPrompt.textContent : taskWizardPromptFor(currentStep || {}));
      setAssistantExpression("happy", { duration: 2800 });
      return;
    }
    setPanelOpen(true);
  });
  minimizeButton.addEventListener("click", () => setAssistantMinimized(true));
  restoreButton.addEventListener("click", () => setAssistantMinimized(false));
  document.getElementById("assistantClose").addEventListener("click", () => setPanelOpen(false));
  speechToggle?.addEventListener("change", () => {
    writeBooleanPreference(speechPreferenceKey(), speechToggle.checked);
    if (!speechToggle.checked) cancelSpeechKind("assistant");
  });
  document.addEventListener("pointerdown", retrySpeechAfterUserGesture, true);
  document.addEventListener("keydown", retrySpeechAfterUserGesture, true);
  announcementSpeechToggle?.addEventListener("change", () => {
    writeBooleanPreference(announcementSpeechPreferenceKey(), announcementSpeechToggle.checked);
    if (!announcementSpeechToggle.checked) cancelSpeechKind("announcement");
  });
  wakeWordToggle?.addEventListener("change", () => {
    if (!wakeWordToggle.checked) {
      setWakeListeningEnabled(false, { status: "Đã tắt chờ giọng nói.", persist: true });
      return;
    }
    setWakeListeningEnabled(true, { status: "Đang xin quyền micro từ trình duyệt…", persist: true });
  });
  speechStopButton?.addEventListener("click", () => stopLunaSpeech());

  function startVoiceCapture(mode = "assistant") {
    if (taskWizard.active) mode = "task-wizard";
    if (recognition) {
      if (!recognition.processing) stopVoiceCapture();
      return;
    }
    stopWakeRecognition();
    voiceCaptureMode = mode;
    stopLunaSpeech({ resetState: false });
    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      (mode === "task-wizard" ? taskVoiceWizardStatus : voiceNotice).textContent = "Micro cần kết nối HTTPS an toàn.";
      return;
    }
    const accountId = String(currentAccount()?.id || "");
    if (!accountId) {
      (mode === "task-wizard" ? taskVoiceWizardStatus : voiceNotice).textContent = "Vui lòng đăng nhập để Luna xử lý câu trả lời. Có thể tiếp tục bằng bàn phím ạ.";
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof Recognition !== "function") {
      const userAgent = navigator.userAgent || "";
      const isSafari = /Safari/i.test(userAgent) && !/(Chrome|Chromium|CriOS|Edg|OPR)/i.test(userAgent);
      (mode === "task-wizard" ? taskVoiceWizardStatus : voiceNotice).textContent = isSafari
        ? "Safari chưa cung cấp nhận dạng giọng nói trên thiết bị này. Hãy bật Siri/Đọc chính tả và thử lại, hoặc nhập bằng bàn phím ạ."
        : "Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome, Edge hoặc Safari đã bật dịch vụ giọng nói, hoặc nhập bằng bàn phím ạ.";
      return;
    }
    const capture = {
      accountId,
      mode,
      engine: null,
      discard: false,
      processing: false,
      finished: false,
      finalTranscript: "",
      interimTranscript: "",
      error: "",
    };
    recognition = capture;
    const status = mode === "task-wizard" ? taskVoiceWizardStatus : voiceNotice;
    try {
      const engine = new Recognition();
      capture.engine = engine;
      engine.lang = "vi-VN";
      engine.continuous = false;
      engine.interimResults = true;
      engine.maxAlternatives = 1;
      engine.onresult = (event) => {
        if (capture.discard || recognition !== capture || accountId !== activeAccountId) return;
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = String(result?.[0]?.transcript || "").trim();
          if (!text) continue;
          if (result.isFinal) capture.finalTranscript = `${capture.finalTranscript} ${text}`.trim();
          else capture.interimTranscript = text;
        }
        const partial = capture.interimTranscript || capture.finalTranscript;
        if (partial) status.textContent = `Em nghe được: “${partial}”`;
      };
      engine.onerror = (event) => {
        capture.error = String(event?.error || "");
        window.setTimeout(() => finishVoiceCapture(capture), 150);
      };
      engine.onend = () => finishVoiceCapture(capture);
      setVoiceButtonMode("listening");
      taskVoiceWizardSpeak.textContent = mode === "task-wizard" ? "Đang nghe · Dừng" : "Nói câu trả lời";
      setState("listening", "Đang nghe tiếng Việt");
      status.textContent = mode === "task-wizard"
        ? "Em đang nghe câu trả lời cho mục hiện tại ạ. Bấm Dừng khi nói xong."
        : "Em đang nghe ạ. Nói xong, bấm Dừng hoặc chờ Luna nhận dạng.";
      engine.start();
      voiceRecognitionTimer = window.setTimeout(() => {
        status.textContent = "Đã hết thời gian nghe; Luna đang nhận dạng câu vừa nói ạ.";
        stopVoiceCapture();
      }, 20_000);
    } catch (error) {
      capture.error = error?.name || "start-failed";
      finishVoiceCapture(capture);
    }
  }

  function finishVoiceCapture(capture) {
    if (capture.finished) return;
    capture.finished = true;
    if (capture.endTimer) window.clearTimeout(capture.endTimer);
    capture.endTimer = 0;
    if (voiceRecognitionTimer) window.clearTimeout(voiceRecognitionTimer);
    voiceRecognitionTimer = 0;
    if (recognition === capture) recognition = null;
    setVoiceButtonMode("idle");
    taskVoiceWizardSpeak.textContent = "Nói câu trả lời";
    if (capture.discard) {
      if (!speechActive) setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ");
      return;
    }
    const { accountId, mode } = capture;
    const status = mode === "task-wizard" ? taskVoiceWizardStatus : voiceNotice;
    if (accountId !== activeAccountId || !currentAccount()) return;
    const transcript = String(capture.finalTranscript || (!capture.error ? capture.interimTranscript : "")).trim();
    if (!transcript) {
      const messages = {
        "not-allowed": "Micro chưa được cấp quyền. Cho phép micro cho trang này rồi bấm Nói để thử lại ạ.",
        "service-not-allowed": "Dịch vụ nhận dạng giọng nói đang bị trình duyệt hoặc thiết bị chặn. Hãy kiểm tra cài đặt quyền riêng tư hoặc nhập bằng bàn phím ạ.",
        "audio-capture": "Không tìm thấy micro đang hoạt động. Kiểm tra thiết bị rồi thử lại ạ.",
        network: "Dịch vụ giọng nói của trình duyệt không kết nối được. Kiểm tra mạng rồi thử lại hoặc nhập bằng bàn phím ạ.",
        "language-not-supported": "Trình duyệt hiện không nhận dạng được tiếng Việt trên thiết bị này. Anh/chị có thể nhập bằng bàn phím ạ.",
        "no-speech": "Em chưa nghe rõ câu nói. Hãy thử lại ở nơi yên tĩnh hơn hoặc nhập bằng bàn phím ạ.",
        aborted: "Đã dừng nhận dạng giọng nói.",
        "NotAllowedError": "Micro chưa được cấp quyền. Cho phép micro cho trang này rồi bấm Nói để thử lại ạ.",
        "SecurityError": "Micro chỉ hoạt động trên kết nối HTTPS an toàn ạ.",
      };
      status.textContent = messages[capture.error] || "Chưa nhận dạng được câu nói. Anh/chị có thể thử lại hoặc nhập bằng bàn phím ạ.";
      if (!speechActive) setState("idle", currentMood?.label || "Sẵn sàng hỗ trợ");
      flushPendingSpeech();
      return;
    }
    const called = wakePhraseRemainder(transcript);
    if (called !== null) respondToWakePhrase(transcript, accountId);
    else if (mode === "task-wizard") handleTaskWizardTranscript(transcript, accountId);
    else submitVoiceTranscript(transcript, accountId);
    if (called === null) flushPendingSpeech();
  }

  taskWizardReplyForm.addEventListener("submit", submitTaskWizardReply);
  voiceButton.addEventListener("click", () => startVoiceCapture("assistant"));
  taskVoiceWizardSpeak.addEventListener("click", () => startVoiceCapture("task-wizard"));
  taskVoiceWizardContinue.addEventListener("click", () => advanceTaskWizardStep());
  taskVoiceWizardSkip.addEventListener("click", () => skipTaskWizardStep());
  taskVoiceWizardCancel.addEventListener("click", () => exitTaskWizard(`Dạ, em đã dừng hướng dẫn. Biểu mẫu vẫn giữ nguyên, chưa được lưu. ${taskWizardAddress()} có thể chỉnh sửa hoặc tự lưu khi sẵn sàng ạ.`));
  document.getElementById("resetTaskForm")?.addEventListener("click", () => exitTaskWizard());
  document.getElementById("closeTaskForm")?.addEventListener("click", () => exitTaskWizard());
  document.getElementById("taskFormDialog")?.addEventListener("click", (event) => {
    if (event.target?.id === "taskFormDialog") exitTaskWizard();
  });
  const wizardForms = [taskForm, document.getElementById("assignmentTaskForm")].filter(Boolean);
  wizardForms.forEach((form) => {
    form.addEventListener("input", (event) => {
      if (!taskWizard.active || taskWizard.form !== form || taskWizard.awaitingConfirmation || taskWizard.applyingAnswer) return;
      const step = taskWizard.steps[taskWizard.index];
      if (taskWizardField(step) === event.target) taskWizardSetStatus("Đã nhận nội dung đang nhập. Bấm “Tiếp tục” để Luna sang mục kế tiếp; chưa có gì được lưu.");
    });
    form.addEventListener("focusin", () => {
      if (taskWizard.active) taskVoiceWizard.classList.add("is-condensed");
      window.requestAnimationFrame(positionTaskWizardBubble);
    });
    form.addEventListener("change", (event) => {
      if (!taskWizard.active || taskWizard.form !== form || taskWizard.awaitingConfirmation || taskWizard.applyingAnswer) return;
      const step = taskWizard.steps[taskWizard.index];
      const field = taskWizardField(step);
      const isMultiChoice = ["collaborators", "dependencies"].includes(step?.key) && event.target?.matches?.('input[type="checkbox"]');
      const isStatusChoice = step?.key === "status" && event.target?.matches?.('input[type="radio"][name="taskStatusChoice"]');
      if (event.target !== field && !isMultiChoice && !isStatusChoice) return;
      if (["collaborators", "dependencies"].includes(step?.key)) {
        taskWizardSetStatus("Đã cập nhật lựa chọn. Có thể chọn thêm mục rồi bấm “Tiếp tục” ạ.");
        return;
      }
      if (taskWizard.mode === "progress" && step?.key === "status"
        && normalize(taskWizardField(step)?.value) === normalize("Hoàn thành")) {
        const progressField = taskWizardField({ key: "progress" });
        if (progressField && !progressField.disabled) progressField.value = "100";
      }
      window.setTimeout(() => {
        if (taskWizard.active && taskWizard.form === form && taskWizard.steps[taskWizard.index] === step && taskWizardCurrentValue(step)) advanceTaskWizardStep();
      }, 0);
    });
    form.addEventListener("click", (event) => {
      if (!taskWizard.active || taskWizard.form !== form || taskWizard.awaitingConfirmation || taskWizard.applyingAnswer) return;
      const step = taskWizard.steps[taskWizard.index];
      const clickedRadio = event.target.closest?.('input[type="radio"]')
        || event.target.closest?.("label")?.querySelector('input[type="radio"]');
      const confirmsCurrentChoice = (step?.key === "owner" && clickedRadio?.name === "taskOwnerChoice")
        || (step?.key === "status" && clickedRadio?.name === "taskStatusChoice");
      if (confirmsCurrentChoice) {
        window.setTimeout(() => {
          if (taskWizard.active && taskWizard.form === form && taskWizard.steps[taskWizard.index] === step && taskWizardCurrentValue(step)) advanceTaskWizardStep();
        }, 0);
        return;
      }
      if (event.target === taskWizardField(step) && event.target?.tagName === "SELECT" && taskWizardCurrentValue(step)) {
        taskWizardSetStatus(`Em đã ghi nhận lựa chọn hiện tại: ${event.target.selectedOptions[0]?.textContent?.trim()}. Bấm “Tiếp tục” để xác nhận ạ.`);
      }
    });
    form.addEventListener("submit", (event) => {
      if (!taskWizard.active || taskWizard.form !== form || taskWizard.awaitingConfirmation) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      prepareTaskWizardConfirmation();
    }, true);
  });
  taskWizardReplyForm.addEventListener("focusin", () => {
    taskVoiceWizard.classList.remove("is-condensed");
    window.requestAnimationFrame(positionTaskWizardBubble);
  });
  const taskFormDialog = document.getElementById("taskFormDialog");
  document.querySelector("#taskFormDialog .task-form-modal")?.addEventListener("scroll", () => {
    if (taskWizard.active) window.requestAnimationFrame(positionTaskWizardBubble);
  }, { passive: true });
  document.querySelector("#taskDetailDialog .task-detail-modal")?.addEventListener("scroll", () => {
    if (taskWizard.active) window.requestAnimationFrame(positionTaskWizardBubble);
  }, { passive: true });
  if (taskFormDialog) {
    new MutationObserver(() => {
      if (!taskFormDialog.classList.contains("is-hidden") || taskVoiceWizard.classList.contains("is-hidden")) return;
      exitTaskWizard();
    }).observe(taskFormDialog, { attributes: true, attributeFilter: ["class"] });
  }
  const taskDetailDialog = document.getElementById("taskDetailDialog");
  if (taskDetailDialog) {
    new MutationObserver(() => {
      if (!taskWizard.active || taskWizard.mode !== "progress") return;
      if (!taskDetailDialog.classList.contains("is-hidden") && taskDetailDialog.contains(taskWizard.form)) return;
      exitTaskWizard("Dạ, em đã dừng cập nhật vì biểu mẫu đã đóng. Thông tin chưa được lưu ạ.");
    }).observe(taskDetailDialog, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });
  }

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
      positionTaskWizardBubble();
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
    positionTaskWizardBubble();
  });
  window.addEventListener("storage", () => { syncAccountAccess(); changeMoodIfDue(); });
  window.addEventListener("phuc-thinh-theme-change", (event) => applyAssistantTheme(event.detail));
  window.addEventListener("phuc-thinh-luna-visibility-change", syncAccountAccess);
  window.addEventListener("focus", () => { syncAccountAccess(); changeMoodIfDue(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopWakeRecognition();
      stopVoiceCapture({ discard: true });
      const interruptedAnnouncements = [];
      if (speechActiveKind === "announcement" && activeSpeechItem) interruptedAnnouncements.push(activeSpeechItem);
      interruptedAnnouncements.push(...speechQueue.filter((item) => item.kind === "announcement"));
      stopLunaSpeech({ resetState: false });
      const seenAnnouncements = new Set();
      interruptedAnnouncements.forEach((item) => {
        if (!item?.text || seenAnnouncements.has(item.text) || !speechChannelEnabled("announcement")) return;
        seenAnnouncements.add(item.text);
        speechQueue.push(item);
      });
    }
    else {
      changeMoodIfDue();
      playNextLunaSpeech();
      scheduleWakeListener(220);
    }
  });
  window.addEventListener("pagehide", () => {
    stopWakeRecognition();
    stopVoiceCapture({ discard: true });
    stopLunaSpeech({ resetState: false });
  });
  window.setInterval(() => changeMoodIfDue(), 60 * 1000);
  const accountObserver = new MutationObserver(syncAccountAccess);
  ["currentUserLabel", "currentUserMeta"].forEach((id) => {
    const node = document.getElementById(id);
    if (node) accountObserver.observe(node, { childList: true, characterData: true, subtree: true });
  });

  window.virtualAssistantSetExpression = (expression, options) => setAssistantExpression(expression, options);
  window.virtualAssistantTaskWizardSaved = (taskId) => {
    if (!taskWizard.active || !taskWizard.awaitingConfirmation) return false;
    if (taskWizard.mode === "progress" && String(taskWizard.taskId) !== String(taskId)) return false;
    const message = taskWizard.mode === "progress"
      ? "Dạ, cập nhật công việc đã được lưu thành công ạ."
      : "Dạ, công việc mới đã được lưu thành công ạ.";
    taskWizard.active = false;
    taskWizard.awaitingConfirmation = false;
    clearTaskWizardHighlight();
    taskWizardReplyForm.classList.add("is-hidden");
    taskVoiceWizardSpeak.classList.add("is-hidden");
    taskVoiceWizardContinue.classList.add("is-hidden");
    taskVoiceWizardSkip.classList.add("is-hidden");
    taskWizardSetStatus("Đã lưu thành công.");
    appendTaskWizardMessage("assistant", message);
    speakLunaText(message);
    window.setTimeout(() => {
      if (!taskWizard.active && !taskVoiceWizard.classList.contains("is-hidden")) {
        taskVoiceWizard.classList.add("is-hidden");
        root.classList.remove("is-task-wizard");
        taskWizardConversation.replaceChildren();
      }
    }, 4500);
    return true;
  };
  applyAssistantCharacterImage();
  setState("idle", "Sẵn sàng hỗ trợ");
  syncAccountAccess();
})();
