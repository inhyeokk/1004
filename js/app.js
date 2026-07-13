const eventDate = new Date("2026-10-04T12:30:00+09:00");
const toast = document.getElementById("toast");
const mapUrl = "https://map.kakao.com/link/to/아펠가모공덕,37.543450,126.950664";
const messageStorageKey = "wedding-nice-messages";
const kakaoJavaScriptKey = "64a830cb58e8b40ed6f25fe6f4a3e78f";
const publicShareUrl = "https://inhyeokk.github.io/1004/";
const mobileUserAgent = /Android|iPhone|iPad|iPod/i;
const supabaseSettings = window.WEDDING_SUPABASE || {};
const databaseClient = supabaseSettings.url && supabaseSettings.anonKey && window.supabase
    ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey)
    : null;

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2000);
}

function pad(value) {
    return String(value).padStart(2, "0");
}

function updateCountdown() {
    const diff = Math.max(0, eventDate.getTime() - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    document.getElementById("countdown-days").textContent = pad(days);
    document.getElementById("countdown-hours").textContent = pad(hours);
    document.getElementById("countdown-minutes").textContent = pad(minutes);
    document.getElementById("countdown-seconds").textContent = pad(seconds);
    document.getElementById("countdown-days-text").textContent = String(days);
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;

    const firstDay = new Date(2026, 9, 1).getDay();
    const cells = Array.from({ length: firstDay }, () => '<span class="calendar-cell empty"></span>');
    for (let day = 1; day <= 31; day += 1) {
        const classes = ["calendar-cell"];
        if (day % 7 === 0) classes.push("sun");
        if (day === 4) classes.push("active");
        cells.push(`<span class="${classes.join(" ")}">${day}</span>`);
    }
    grid.innerHTML = cells.join("");
}

async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch { }
    }

    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
        copied = document.execCommand("copy");
    } catch { copied = false; }
    field.remove();
    return copied;
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector("input, textarea, [data-close-modal]")?.focus();
}

function closeModal(modal) {
    modal.hidden = true;
    if (!document.querySelector(".modal-backdrop:not([hidden])")) document.body.classList.remove("modal-open");
}

function openMapLink(event) {
    const link = event.currentTarget;
    if (!mobileUserAgent.test(navigator.userAgent) || !link.dataset.appUrl) return;

    event.preventDefault();
    const webUrl = link.href || mapUrl;
    let switchedToApp = false;
    const onVisibilityChange = () => {
        switchedToApp = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.location.href = link.dataset.appUrl;
    window.setTimeout(() => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (!switchedToApp) window.location.href = webUrl;
    }, 900);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
}

function formatMessageDate(value) {
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function readLocalMessages() {
    try {
        return JSON.parse(localStorage.getItem(messageStorageKey) || "[]");
    } catch {
        return [];
    }
}

function saveLocalMessages(messages) {
    localStorage.setItem(messageStorageKey, JSON.stringify(messages));
}

function messageMarkup(item, removable) {
    const close = removable ? '<button class="message-close" type="button" data-remove-message aria-label="삭제">×</button>' : "";
    return `<article class="message-card" data-message-id="${escapeHtml(item.id)}">${close}<p>${escapeHtml(item.message)}</p><div class="message-meta"><span>From</span> ${escapeHtml(item.name)} <time>${escapeHtml(item.date)}</time></div></article>`;
}

async function loadMessages() {
    const list = document.querySelector(".message-list");
    if (!list) return;

    if (databaseClient) {
        const { data, error } = await databaseClient
            .from("messages")
            .select("id, name, message, created_at")
            .order("created_at", { ascending: false })
            .limit(50);

        if (!error) {
            list.innerHTML = data.map((item) => messageMarkup({
                id: item.id,
                name: item.name,
                message: item.message,
                date: formatMessageDate(item.created_at)
            }, false)).join("");
            return;
        }

        showToast("방명록을 불러오지 못했습니다.");
        return;
    }

    readLocalMessages().forEach((item) => list.insertAdjacentHTML("afterbegin", messageMarkup(item, true)));
}

async function createMessage(name, message) {
    if (databaseClient) {
        const { data, error } = await databaseClient
            .from("messages")
            .insert({ name, message })
            .select("id, name, message, created_at")
            .single();

        if (error) return { error };
        return {
            item: { id: data.id, name: data.name, message: data.message, date: formatMessageDate(data.created_at) },
            remote: true
        };
    }

    const item = { id: crypto.randomUUID?.() || String(Date.now()), name, message, date: formatMessageDate(new Date()) };
    saveLocalMessages([item, ...readLocalMessages()].slice(0, 20));
    return { item, remote: false };
}

document.addEventListener("DOMContentLoaded", () => {
    renderCalendar();
    updateCountdown();
    window.setInterval(updateCountdown, 1000);
    loadMessages();

    document.querySelectorAll("[data-copy]").forEach((button) => {
        button.addEventListener("click", async () => {
            const copied = await copyText(button.dataset.copy);
            showToast(copied ? "계좌번호가 복사되었습니다." : "복사에 실패했습니다.");
        });
    });

    document.getElementById("btn-contact")?.addEventListener("click", () => openModal("contact-modal"));
    document.getElementById("btn-message")?.addEventListener("click", () => openModal("message-modal"));
    document.getElementById("map-click")?.addEventListener("click", (event) => {
        if (mobileUserAgent.test(navigator.userAgent)) {
            openMapLink(event);
            return;
        }
        window.open(mapUrl, "_blank", "noopener,noreferrer");
    });
    document.querySelectorAll(".map-action").forEach((link) => link.addEventListener("click", openMapLink));

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop")));
    });
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) closeModal(backdrop);
        });
    });

    document.getElementById("message-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const name = String(data.get("name")).trim();
        const message = String(data.get("message")).trim();
        const result = await createMessage(name, message);

        if (result.error) {
            showToast("메시지 등록에 실패했습니다.");
            return;
        }

        document.querySelector(".message-list").insertAdjacentHTML("afterbegin", messageMarkup(result.item, !result.remote));
        form.reset();
        closeModal(document.getElementById("message-modal"));
        showToast("메시지가 등록되었습니다.");
    });

    document.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove-message]");
        if (!removeButton) return;
        const card = removeButton.closest("[data-message-id]");
        saveLocalMessages(readLocalMessages().filter((item) => item.id !== card.dataset.messageId));
        card.remove();
        showToast("메시지를 삭제했습니다.");
    });

    document.getElementById("share-link")?.addEventListener("click", async () => {
        const copied = await copyText(window.location.href);
        showToast(copied ? "청첩장 주소를 복사했습니다." : "복사에 실패했습니다.");
    });

    document.getElementById("share-kakao")?.addEventListener("click", async () => {
        if (window.Kakao && window.location.protocol === "https:") {
            try {
                if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoJavaScriptKey);
                window.Kakao.Share.sendScrap({
                    requestUrl: publicShareUrl,
                    templateId: undefined
                });
                return;
            } catch { }
        }

        if (navigator.share) {
            const shareData = { title: "강인혁 · 홍은채 결혼식", text: "결혼식에 초대합니다.", url: publicShareUrl };
            try {
                await navigator.share(shareData);
                return;
            } catch (error) {
                if (error.name === "AbortError") return;
            }
        }
        const copied = await copyText(window.location.href);
        showToast(copied ? "주소를 복사했습니다. 카카오톡에 붙여넣어 공유해 주세요." : "공유에 실패했습니다.");
    });
});
