(() => {
  "use strict";

  const elements = {
    form: document.querySelector("#chatForm"),
    input: document.querySelector("#messageInput"),
    send: document.querySelector("#sendButton"),
    messages: document.querySelector("#messages"),
    token: document.querySelector("#apiToken"),
    clientId: document.querySelector("#clientId"),
    toggleToken: document.querySelector("#toggleToken"),
    clear: document.querySelector("#clearChat"),
    count: document.querySelector("#charCount"),
    health: document.querySelector("#healthValue"),
    ready: document.querySelector("#readyValue"),
    statusDot: document.querySelector("#statusDot"),
    statusText: document.querySelector("#statusText"),
    refreshStatus: document.querySelector("#refreshStatus"),
    toggleSettings: document.querySelector("#toggleSettings"),
    settingsBody: document.querySelector("#settingsBody"),
    toast: document.querySelector("#toast"),
  };

  let sending = false;
  let toastTimer;

  const now = () => new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3200);
  }

  function scrollToLatest() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function buildMessage({ role, text, usage, error = false }) {
    const article = document.createElement("article");
    article.className = `message ${role === "user" ? "user-message" : "assistant-message"}${error ? " error-message" : ""}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = role === "user" ? "BẠN" : "AI";

    const content = document.createElement("div");
    content.className = "message-content";

    const meta = document.createElement("div");
    meta.className = "message-meta";
    const name = document.createElement("strong");
    name.textContent = role === "user" ? "Bạn" : error ? "Không thể gửi" : "Day 12 Assistant";
    const time = document.createElement("span");
    time.textContent = now();
    meta.append(name, time);

    const body = document.createElement("p");
    body.textContent = text;
    content.append(meta, body);

    if (usage) {
      const details = document.createElement("div");
      details.className = "usage";
      const values = [
        `${usage.prompt ?? 0} prompt tokens`,
        `${usage.completion ?? 0} completion tokens`,
        `$${Number(usage.cost ?? 0).toFixed(6)}`,
        `${usage.turns ?? 0} lượt trước đó`,
      ];
      values.forEach((value) => {
        const item = document.createElement("span");
        item.textContent = value;
        details.append(item);
      });
      content.append(details);
    }

    article.append(avatar, content);
    elements.messages.append(article);
    scrollToLatest();
    return article;
  }

  function showTyping() {
    const article = document.createElement("article");
    article.className = "message assistant-message";
    article.id = "typingIndicator";
    article.innerHTML = '<div class="avatar" aria-hidden="true">AI</div><div class="typing-dots" aria-label="Trợ lý đang trả lời"><i></i><i></i><i></i></div>';
    elements.messages.append(article);
    scrollToLatest();
  }

  function setSending(value) {
    sending = value;
    elements.send.disabled = value;
    elements.send.querySelector("span").textContent = value ? "Đang gửi" : "Gửi";
  }

  function friendlyError(status, data, retryAfter) {
    if (status === 401) return "API token bị thiếu hoặc không hợp lệ. Hãy kiểm tra lại phần Cấu hình API.";
    if (status === 402) return "Client này đã dùng hết ngân sách trong ngày.";
    if (status === 429) return `Bạn gửi quá nhanh. Hãy thử lại${retryAfter ? ` sau ${retryAfter} giây` : " sau ít phút"}.`;
    if (status === 422) return "Tin nhắn không hợp lệ hoặc vượt quá 2.000 ký tự.";
    if (status >= 500) return "Dịch vụ đang gặp lỗi. Hãy kiểm tra trạng thái và thử lại.";
    return data?.detail || "Không thể hoàn tất yêu cầu.";
  }

  async function sendMessage(message) {
    const token = elements.token.value.trim();
    if (!token) {
      elements.token.focus();
      showToast("Vui lòng nhập API token trước khi gửi.");
      return;
    }

    buildMessage({ role: "user", text: message });
    elements.input.value = "";
    resizeComposer();
    setSending(true);
    showTyping();

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const clientId = elements.clientId.value.trim();
    if (clientId) headers["X-Client-Id"] = clientId;

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(friendlyError(response.status, data, response.headers.get("Retry-After")));
      }
      buildMessage({
        role: "assistant",
        text: data.reply,
        usage: {
          prompt: data.usage?.prompt,
          completion: data.usage?.completion,
          cost: data.usd_cost,
          turns: data.turns_before,
        },
      });
    } catch (error) {
      const messageText = error instanceof TypeError
        ? "Không kết nối được tới dịch vụ. Hãy kiểm tra mạng và trạng thái hệ thống."
        : error.message;
      buildMessage({ role: "assistant", text: messageText, error: true });
    } finally {
      document.querySelector("#typingIndicator")?.remove();
      setSending(false);
      elements.input.focus();
    }
  }

  function resizeComposer() {
    elements.input.style.height = "auto";
    elements.input.style.height = `${Math.min(elements.input.scrollHeight, 150)}px`;
    elements.count.textContent = `${elements.input.value.length}/2000`;
  }

  async function fetchProbe(path) {
    try {
      const response = await fetch(path, { headers: { Accept: "application/json" } });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (_error) {
      return { ok: false, data: null };
    }
  }

  function setProbe(element, ok, successLabel) {
    element.textContent = ok ? successLabel : "Không sẵn sàng";
    element.className = ok ? "ok" : "error";
  }

  async function checkStatus() {
    elements.refreshStatus.classList.add("loading");
    elements.refreshStatus.disabled = true;
    elements.statusDot.className = "status-dot checking";
    elements.statusText.textContent = "Đang kiểm tra dịch vụ…";

    const [health, ready] = await Promise.all([fetchProbe("/healthz"), fetchProbe("/readyz")]);
    setProbe(elements.health, health.ok && health.data?.status === "ok", "Hoạt động");
    setProbe(elements.ready, ready.ok && ready.data?.redis === true, "Sẵn sàng");

    const allReady = health.ok && ready.ok;
    elements.statusDot.className = `status-dot ${allReady ? "online" : "offline"}`;
    elements.statusText.textContent = allReady ? "Dịch vụ sẵn sàng" : "Dịch vụ chưa sẵn sàng";
    elements.refreshStatus.classList.remove("loading");
    elements.refreshStatus.disabled = false;
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = elements.input.value.trim();
    if (message && !sending) sendMessage(message);
  });

  elements.input.addEventListener("input", resizeComposer);
  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      elements.form.requestSubmit();
    }
  });

  elements.toggleToken.addEventListener("click", () => {
    const visible = elements.token.type === "text";
    elements.token.type = visible ? "password" : "text";
    elements.toggleToken.textContent = visible ? "Hiện" : "Ẩn";
    elements.toggleToken.setAttribute("aria-label", visible ? "Hiện token" : "Ẩn token");
  });

  elements.clear.addEventListener("click", () => {
    elements.messages.replaceChildren();
    buildMessage({ role: "assistant", text: "Màn hình đã được xóa. Lịch sử phía server vẫn được giữ theo Client ID." });
  });

  elements.refreshStatus.addEventListener("click", checkStatus);
  elements.toggleSettings.addEventListener("click", () => {
    const open = elements.settingsBody.classList.toggle("open");
    elements.toggleSettings.setAttribute("aria-expanded", String(open));
  });

  resizeComposer();
  checkStatus();
})();
