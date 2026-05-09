"use strict";


function updateCompletionMessage(allCompleted) {
    const existing = $("doneMsg");
    if (existing) existing.remove();

    if (!allCompleted) return;

    const doneMsg = document.createElement("div");
    doneMsg.id = "doneMsg";
    doneMsg.innerText = "✅ All tasks completed today!";
    doneMsg.style.textAlign = "center";
    doneMsg.style.marginBottom = "10px";
    doneMsg.style.fontWeight = "bold";

    const choresDiv = $("chores");
    document.body.insertBefore(doneMsg, choresDiv);
}


function updateStatus(statusDiv, user, current, best, totalExp) {
    statusDiv.innerText = `Hello ${user} | 🔥 ${current} (Best: ${best}) | ⭐ ${totalExp} EXP`;
}


async function fetchTodayData(uuid) {
    const res = await fetch(`https://api.lillywhite.dev/today?uuid=${uuid}`);
    return res.json();
}


function updateLabelStyle(label, checked) {
    label.style.textDecoration = checked ? "line-through" : "none";
    label.style.opacity = checked ? "0.6" : "1";
    label.style.transition = "all 0.2s ease";
}


async function handleToggle({ checkbox, label, chore, data, uuid, checkboxes, statusDiv }) {
    checkbox.disabled = true;

    try {
        const toggleRes = await fetch("https://api.lillywhite.dev/toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                person: data.user,
                index: chore.index
            })
        });
        const toggleData = await toggleRes.json();

        const streakRes = await fetch("https://api.lillywhite.dev/sync-streak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uuid })
        });
        const streakData = await streakRes.json();

        data.total_exp = toggleData.total_exp ?? data.total_exp ?? 0;
        const currentUserData = Object.values(data.all_users).find(
            u => u.display_name === data.user
        );

        if (currentUserData) {
            currentUserData.total_exp = data.total_exp;
            currentUserData.current_streak = streakData.current_streak;

            const header = document.getElementById(`header-${data.user}`);

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
            showExpNotification(toggleData.exp_gained);
        } else if (toggleData.exp_deducted) {
            showExpDeductionNotification(toggleData.exp_deducted);
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
    const choresDiv = document.getElementById("chores");
    choresDiv.innerHTML = "";

    const allTasks = data.all_tasks;
    const allUsers = data.all_users;

    if (!allTasks || Object.keys(allTasks).length === 0) {
        choresDiv.innerText = "No chores for today!";
        return;
    }

    const checkboxes = [];

    Object.entries(allTasks).forEach(([person, tasks]) => {
        const section = document.createElement("div");

        const header = document.createElement("h2");
        header.style.marginTop = "20px";
        header.id = `header-${person}`;

        const userData = Object.values(allUsers).find(
            u => u.display_name === person
        );

        updateUserHeader(header, person, userData, person === data.user);

        section.appendChild(header);

        const ul = document.createElement("ul");

        tasks.forEach(chore => {
            const li = document.createElement("li");

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = chore.completed;

            const label = document.createElement("span");
            label.innerText = " " + chore.task;

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
    const statusDiv = document.getElementById("status");

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


function showExpNotification(expGained) {
    const notification = document.createElement("div");
    notification.innerText = `⭐ +${expGained} EXP!`;
    notification.style.pointerEvents = "none";
    notification.style.position = "fixed";
    notification.style.top = "50%";
    notification.style.left = "50%";
    notification.style.transform = "translate(-50%, -50%)";
    notification.style.background = "#4CAF50";
    notification.style.color = "white";
    notification.style.padding = "16px 24px";
    notification.style.borderRadius = "8px";
    notification.style.fontSize = "18px";
    notification.style.fontWeight = "bold";
    notification.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    notification.style.zIndex = "10000";
    notification.style.animation = "fadeInOut 2s ease-in-out";

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
}


function showExpDeductionNotification(expDeducted) {
    const notification = document.createElement("div");
    notification.innerText = `⚠️ -${expDeducted} EXP!`;
    notification.style.pointerEvents = "none";
    notification.style.position = "fixed";
    notification.style.top = "60%";
    notification.style.left = "50%";
    notification.style.transform = "translate(-50%, -50%)";
    notification.style.background = "#f44336";
    notification.style.color = "white";
    notification.style.padding = "16px 24px";
    notification.style.borderRadius = "8px";
    notification.style.fontSize = "18px";
    notification.style.fontWeight = "bold";
    notification.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    notification.style.zIndex = "10000";
    notification.style.animation = "fadeInOut 2s ease-in-out";

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
}


let currentData = null;
let currentUuid = null;
let currentStatusDiv = null;

loadUser().catch(console.error);
setInterval(refreshDataSilently, 30000);
