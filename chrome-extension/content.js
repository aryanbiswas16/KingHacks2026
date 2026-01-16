let isCapturing = false;
let observer = null;
let indicatorEl = null;
let activeProjectId = null;
let activeMeetingUrl = null;
let activePollTimer = null;

const CAPTION_CONTAINER_SELECTOR = '[aria-label="Captions"], .vNKgIf.UDinHf, .vNKgIf[role="region"]'; // Captions container
const CAPTION_ROW_SELECTOR = ".nMcdL"; // Individual caption row
const SPEAKER_SELECTOR = ".NWpY1d";
const TEXT_SELECTOR = ".ygicle";

const seenEntries = new Set();

const ensureIndicator = () => {
  if (indicatorEl) return;
  indicatorEl = document.createElement("div");
  indicatorEl.style.position = "fixed";
  indicatorEl.style.top = "16px";
  indicatorEl.style.right = "72px";
  indicatorEl.style.zIndex = "999999";
  indicatorEl.style.background = "rgba(15, 23, 42, 0.92)";
  indicatorEl.style.color = "#e2e8f0";
  indicatorEl.style.padding = "8px 12px";
  indicatorEl.style.borderRadius = "999px";
  indicatorEl.style.display = "flex";
  indicatorEl.style.alignItems = "center";
  indicatorEl.style.gap = "8px";
  indicatorEl.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
  indicatorEl.style.fontSize = "12px";
  indicatorEl.style.fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif";
  indicatorEl.style.pointerEvents = "auto";

  const dot = document.createElement("span");
  dot.style.width = "8px";
  dot.style.height = "8px";
  dot.style.borderRadius = "50%";
  dot.style.background = "#ef4444";
  dot.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.8)";

  const label = document.createElement("span");
  label.id = "meet-transcript-label";
  label.textContent = "Captions off";

  const stopBtn = document.createElement("button");
  stopBtn.id = "meet-transcript-stop";
  stopBtn.textContent = "Stop";
  stopBtn.style.background = "#ef4444";
  stopBtn.style.color = "white";
  stopBtn.style.border = "none";
  stopBtn.style.padding = "4px 8px";
  stopBtn.style.borderRadius = "999px";
  stopBtn.style.cursor = "pointer";
  stopBtn.style.fontSize = "11px";
  stopBtn.addEventListener("click", () => {
    stopCapture();
  });

  indicatorEl.appendChild(dot);
  indicatorEl.appendChild(label);
  indicatorEl.appendChild(stopBtn);
  document.body.appendChild(indicatorEl);
};

const setIndicatorState = (state) => {
  ensureIndicator();
  indicatorEl.style.display = "flex";
  const label = document.getElementById("meet-transcript-label");
  const stopBtn = document.getElementById("meet-transcript-stop");
  if (label) label.textContent = state;
  if (stopBtn) stopBtn.style.display = state === "Recording captions" ? "inline-flex" : "none";
};

// Backwards compatibility for older calls
const showIndicator = (state = "Captions off") => {
  setIndicatorState(state);
};

const hideIndicator = () => {
  if (!indicatorEl) return;
  indicatorEl.style.display = "none";
};

const sendMessagePromise = (payload) =>
  new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(payload, (response) => resolve(response));
    } catch (err) {
      resolve(null);
    }
  });

const fetchActiveTarget = async () => {
  try {
    const res = await sendMessagePromise({ type: "FETCH_ACTIVE" });
    if (!res?.ok) return null;
    const data = res.data;
    const active = data?.active || {};
    activeProjectId = active.project_id || null;
    activeMeetingUrl = active.meeting_url || null;
    return activeProjectId ? active : null;
  } catch (err) {
    return null;
  }
};

const startActivePolling = () => {
  if (activePollTimer) return;
  activePollTimer = setInterval(async () => {
    const active = await fetchActiveTarget();
    if (!active && isCapturing) {
      stopCapture();
      setIndicatorState("Waiting for Start");
      return;
    }

    if (active && !isCapturing && document.querySelector(CAPTION_CONTAINER_SELECTOR)) {
      startCapture();
    }
  }, 3000);
};

const getCaptionEntries = () => {
  const container = document.querySelector(CAPTION_CONTAINER_SELECTOR) || document;
  const rows = Array.from(container.querySelectorAll(CAPTION_ROW_SELECTOR));
  return rows
    .map((row) => {
      const speaker = row.querySelector(SPEAKER_SELECTOR)?.textContent?.trim();
      const text = row.querySelector(TEXT_SELECTOR)?.textContent?.trim();
      if (!text) return null;

      const timestamp = new Date().toISOString();
      return { speaker: speaker || "Unknown", text, timestamp };
    })
    .filter(Boolean);
};

const pushEntry = async (entry) => {
  if (!activeProjectId) {
    await fetchActiveTarget();
  }

  if (!activeProjectId) return;

  const key = `${entry.timestamp}-${entry.speaker}-${entry.text}`;
  if (seenEntries.has(key)) return;
  seenEntries.add(key);

  const { transcript = [] } = await chrome.storage.local.get("transcript");
  transcript.push(entry);
  await chrome.storage.local.set({ transcript });

  chrome.runtime.sendMessage({ type: "TRANSCRIPT_UPDATE", payload: entry });

  try {
    await sendMessagePromise({
      type: "POST_TRANSCRIPT",
      payload: {
        project_id: activeProjectId,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp,
        meeting_url: activeMeetingUrl || window.location.href
      }
    });
  } catch (err) {
    // Ignore network errors for now
  }
};

const startCapture = () => {
  if (isCapturing) return;
  if (!activeProjectId) {
    setIndicatorState("Waiting for Start");
    return;
  }
  isCapturing = true;

  const container = document.querySelector(CAPTION_CONTAINER_SELECTOR);
  if (!container) {
    chrome.runtime.sendMessage({ type: "TRANSCRIPT_ERROR", payload: "Captions container not found. Turn on captions in Meet." });
    isCapturing = false;
    return;
  }

  observer = new MutationObserver(() => {
    const entries = getCaptionEntries();
    entries.forEach((entry) => pushEntry(entry));
  });

  observer.observe(container, { childList: true, subtree: true });
  setIndicatorState("Recording captions");
};

const stopCapture = () => {
  isCapturing = false;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  setIndicatorState("Stopped");
};

const autoStartWhenCaptionsReady = () => {
  fetchActiveTarget().then((active) => {
    if (!active) {
      setIndicatorState("Waiting for Start");
      return;
    }

    if (document.querySelector(CAPTION_CONTAINER_SELECTOR)) {
      startCapture();
      return;
    }

    const bodyObserver = new MutationObserver(() => {
      if (document.querySelector(CAPTION_CONTAINER_SELECTOR)) {
        bodyObserver.disconnect();
        startCapture();
      }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
  });
};

// Auto-start when captions are enabled
// Show indicator immediately on Meet pages
setIndicatorState("Captions off");
startActivePolling();

// Auto-start when captions are enabled
autoStartWhenCaptionsReady();
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_CAPTURE") {
    startCapture();
    sendResponse({ ok: true });
  }

  if (message.type === "STOP_CAPTURE") {
    stopCapture();
    sendResponse({ ok: true });
  }

  if (message.type === "CLEAR_TRANSCRIPT") {
    chrome.storage.local.set({ transcript: [] }).then(() => sendResponse({ ok: true }));
    return true;
  }
});
