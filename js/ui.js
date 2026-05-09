"use strict";


const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];


function createDeleteButton(onClick) {
    const btn = document.createElement("button");
    btn.innerText = "X";
    btn.className = "delete";
    btn.onclick = onClick;
    return btn;
}


function createDayBadges(days) {
    const div = document.createElement("div");

    div.style.display = "flex";
    div.style.flexWrap = "wrap";
    div.style.gap = "4px";
    div.style.alignItems = "center";
    div.style.maxWidth = "100%";

    if (!days?.length) {
        div.innerText = "Any";
        return div;
    }

    days.forEach(d => {
        const span = document.createElement("span");

        span.className = "day-badge";
        span.textContent = DAY_NAMES[d];
        span.title = formatDays(days);

        div.appendChild(span);
    });
    return div;
}


function setupTap(li, callback) {
    let startY = 0, startTime = 0, moved = false;

    li.addEventListener("touchstart", e => {
        startY = e.touches[0].clientY;
        startTime = Date.now();
        moved = false;
        },
        { passive: true }
    );

    li.addEventListener("touchmove", e => {
        if (Math.abs(e.touches[0].clientY - startY) > 10) moved = true;
        },
        { passive: true }
    );

    li.addEventListener("touchend", e => {
        if (!moved && Date.now() - startTime < 300 && !e.target.closest("button,input")) callback();
    });
}


function formatDays(days) {
    if (!days?.length) return "Any";
    return days
        .map(d => DAY_NAMES[d] ?? "?")
        .join(", ");
}
