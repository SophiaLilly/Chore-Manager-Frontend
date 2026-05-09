const $ = id => document.getElementById(id);


function setupNav(uuid, isAdmin = false) {
    $("homeLink").href = `index.html#${uuid}`;
    const adminLink = $("adminLink");
    if (adminLink && isAdmin) {
        adminLink.style.display = "inline";
        adminLink.href = `admin.html#${uuid}`;
    }
}