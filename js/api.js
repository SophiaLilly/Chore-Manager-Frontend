"use strict";


const API = "https://api.lillywhite.dev";


const get = url => fetch(url, {
    cache: "no-store"
}).then(r => r.json());


const post = (url, body) => fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
});