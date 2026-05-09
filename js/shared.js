"use strict";


const $ = id => document.getElementById(id);
const create = tag => document.createElement(tag);


function setupNav(uuid, isAdmin = false) {
    $("homeLink").href = `index.html#${uuid}`;
    const adminLink = $("adminLink");
    if (adminLink && isAdmin) {
        adminLink.style.display = "inline";
        adminLink.href = `admin.html#${uuid}`;
    }
}