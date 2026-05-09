"use strict";


const doneMsg = $("doneMsg") || (() => {
    const el = create("div");
    el.id = "doneMsg";
    el.style.textAlign = "center";
    el.style.marginBottom = "10px";
    el.style.fontWeight = "bold";

    const choresDiv = $("chores");
    document.body.insertBefore(el, choresDiv);

    return el;
})();


function updateCompletionMessage(allCompleted) {
    if (!doneMsg) return;
    doneMsg.innerText = allCompleted ? "✅ All tasks completed today!" : "";
}


function updateStatus(statusDiv, user, current, best, totalExp) {
    statusDiv.innerText = `Hello ${user} | 🔥 ${current} (Best: ${best}) | ⭐ ${totalExp} EXP`;
}


async function fetchTodayData(uuid) {
    return get(`${API}/today?uuid=${uuid}`);
}


function updateLabelStyle(label, checked) {
    label.style.textDecoration = checked ? "line-through" : "none";
    label.style.opacity = checked ? "0.6" : "1";
}


async function handleToggle({ checkbox, label, chore, data, uuid, checkboxes, statusDiv }) {
    checkbox.disabled = true;

    try {
        const toggleRes = await post(`${API}/toggle`, {
            person: data.user,
            index: chore.index
        });
        const toggleData = await toggleRes.json();

        const streakRes = await post(`${API}/sync-streak`, {
            uuid
        });
        const streakData = await streakRes.json();

        data.total_exp = toggleData.total_exp ?? data.total_exp ?? 0;
        const currentUserData = Object.values(data.all_users).find(
            u => u.display_name === data.user
        );

        if (currentUserData) {
            currentUserData.total_exp = data.total_exp;
            currentUserData.current_streak = streakData.current_streak;

            const header = $(`header-${data.user}`);

            if (header) {
                updateUserHeader(
                    header,
                    data.user,
                    currentUserData,
                    true
                );
            }
        }
        updateStatus(
            statusDiv,
            data.user,
            streakData.current_streak,
            streakData.best_streak,
            data.total_exp
        );

        if (toggleData.exp_gained) {
            showExpNotification(toggleData.exp_gained, true);
        } else if (toggleData.exp_deducted) {
            showExpNotification(toggleData.exp_deducted, false);
        }

        checkbox.checked = toggleData.completed;
        updateLabelStyle(label, checkbox.checked);

        const allCompleted = checkboxes.every(cb => cb.checked);
        updateCompletionMessage(allCompleted);
    } catch (error) {
        console.error("Error toggling task:", error);
        checkbox.checked = !checkbox.checked;
        updateLabelStyle(label, checkbox.checked);

    } finally {
        checkbox.disabled = false;
    }
}


function updateUserHeader(headerElement, person, userData, isCurrentUser) {
    const streak = userData?.current_streak ?? 0;
    const exp = userData?.total_exp ?? 0;

    headerElement.innerText = `${person} 🔥 ${streak} ⭐ ${exp}`;

    if (isCurrentUser) {
        headerElement.style.color = "#2c7be5";
        headerElement.innerText += " (You)";
    }
}


function renderTasks(data, uuid, statusDiv) {
    const choresDiv = $("chores");
    choresDiv.innerHTML = "";

    const allTasks = data.all_tasks;
    const allUsers = data.all_users;

    if (!allTasks || Object.keys(allTasks).length === 0) {
        choresDiv.innerText = "No chores for today!";
        return;
    }

    const checkboxes = [];

    Object.entries(allTasks).forEach(([person, tasks]) => {
        const section = create("div");

        const header = create("h2");
        header.style.marginTop = "20px";
        header.id = `header-${person}`;

        const userData = Object.values(allUsers).find(
            u => u.display_name === person
        );

        updateUserHeader(header, person, userData, person === data.user);

        section.appendChild(header);

        const ul = create("ul");

        tasks.forEach(chore => {
            const li = create("li");

            const checkbox = create("input");
            checkbox.type = "checkbox";
            checkbox.checked = chore.completed;

            const label = create("span");
            label.innerText = " " + chore.task;
            label.style.transition = "all 0.2s ease";

            updateLabelStyle(label, checkbox.checked);

            const isOwnTask = person === data.user;

            if (!isOwnTask) {
                checkbox.disabled = true;
                label.style.opacity = "0.5";
            } else {
                checkboxes.push(checkbox);

                checkbox.addEventListener("change", () =>
                    handleToggle({
                        checkbox,
                        label,
                        chore,
                        data,
                        uuid,
                        checkboxes,
                        statusDiv
                    })
                );
            }

            li.appendChild(checkbox);
            li.appendChild(label);
            ul.appendChild(li);
        });

        section.appendChild(ul);
        choresDiv.appendChild(section);
    });

    const ownTasks = allTasks[data.user] || [];
    const allCompleted = ownTasks.length > 0 && ownTasks.every(t => t.completed);

    updateCompletionMessage(allCompleted);
}


async function loadUser() {
    const uuid = window.location.hash.substring(1);
    const statusDiv = $("status");

    currentUuid = uuid;
    currentStatusDiv = statusDiv;

    if (!uuid) {
        statusDiv.innerText = "Missing user UUID in URL.";
        return;
    }

    try {
        currentData = await fetchTodayData(uuid);
        const data = currentData;

        setupNav(uuid, data.is_admin);

        updateStatus(statusDiv, data.user, data.streak.current, data.streak.best, data.total_exp);

        updateCompletionMessage(data.streak.all_tasks_completed_today);

        renderTasks(data, uuid, statusDiv);

    } catch (error) {
        statusDiv.innerText = "Error fetching user data.";
        console.error(error);
    }
}


async function refreshDataSilently() {
    if (!currentUuid || !currentData) return;

    try {
        const newData = await fetchTodayData(currentUuid);

        currentData = newData;

        updateStatus(
            currentStatusDiv,
            newData.user,
            newData.streak.current,
            newData.streak.best,
            newData.total_exp
        );

        renderTasks(newData, currentUuid, currentStatusDiv);

    } catch (error) {
        console.error("Silent refresh failed:", error);
    }
}


function showExpNotification(amount, isGain = true) {
    const notification = create("div");
    const icon = isGain ? "⭐" : "⚠️";
    const sign = isGain ? "+" : "-";
    notification.innerText = `${icon} ${sign}${amount} EXP!`;
    notification.className = `exp-popup ${isGain ? "gained" : "deducted"}`;

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 2000);
}


let currentData = null;
let currentUuid = null;
let currentStatusDiv = null;

loadUser().catch(console.error);
setInterval(refreshDataSilently, 30000);
