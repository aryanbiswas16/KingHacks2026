const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const transcriptEl = document.getElementById("transcript");
const statusEl = document.getElementById("status");

const updateStatus = (value) => {
  statusEl.textContent = value === "capturing" ? "Live" : "Idle";
  startBtn.disabled = value === "capturing";
  stopBtn.disabled = value !== "capturing";
};

const renderTranscript = (entries) => {
  transcriptEl.innerHTML = "";
  entries.slice(-200).forEach((entry) => {
    const div = document.createElement("div");
    div.className = "transcript-entry";
    div.innerHTML = `<span>${entry.speaker}</span>: ${entry.text}`;
    transcriptEl.appendChild(div);
  });
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
};

const withActiveTab = async (callback) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  callback(tab.id);
};

startBtn.addEventListener("click", () => {
  withActiveTab((tabId) => {
    chrome.tabs.sendMessage(tabId, { type: "START_CAPTURE" });
  });
});

stopBtn.addEventListener("click", () => {
  withActiveTab((tabId) => {
    chrome.tabs.sendMessage(tabId, { type: "STOP_CAPTURE" });
  });
});

clearBtn.addEventListener("click", () => {
  withActiveTab((tabId) => {
    chrome.tabs.sendMessage(tabId, { type: "CLEAR_TRANSCRIPT" });
  });
});

copyBtn.addEventListener("click", async () => {
  const { transcript = [] } = await chrome.storage.local.get("transcript");
  const text = transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n");
  await navigator.clipboard.writeText(text);
});

chrome.storage.local.get(["transcript", "status"], ({ transcript = [], status }) => {
  renderTranscript(transcript);
  updateStatus(status || "idle");
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TRANSCRIPT_UPDATE") {
    chrome.storage.local.get("transcript", ({ transcript = [] }) => {
      renderTranscript(transcript);
    });
  }

  if (message.type === "TRANSCRIPT_STATUS") {
    updateStatus(message.payload);
  }

  if (message.type === "TRANSCRIPT_ERROR") {
    statusEl.textContent = message.payload;
  }
});
