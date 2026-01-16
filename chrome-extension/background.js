chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ transcript: [], status: "idle" });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "TRANSCRIPT_STATUS") {
    chrome.storage.local.set({ status: message.payload });
    return;
  }

  if (message.type === "FETCH_ACTIVE") {
    (async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/transcript/active");
        if (!res.ok) {
          sendResponse({ ok: false });
          return;
        }
        const data = await res.json();
        sendResponse({ ok: true, data });
      } catch (err) {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }

  if (message.type === "POST_TRANSCRIPT") {
    (async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.payload)
        });
        sendResponse({ ok: res.ok });
      } catch (err) {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  const { status } = await chrome.storage.local.get("status");
  const next = status === "capturing" ? "STOP_CAPTURE" : "START_CAPTURE";
  chrome.tabs.sendMessage(tab.id, { type: next });
});
