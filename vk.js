/* global chrome */
var api_url = "https://asr.yandex.net/asr_xml?topic=queries&lang=ru-RU";
var active = true;
var ls = {
    apikey: "23e44e6c-66a7-4ff5-9644-626a53903ac4",
    cache: {},
    counter: 0,
    show_counter: 1,
    only_active: 1,
    disableAntimat: 0
};
var errors = {
    "431": "Суточный лимит исчерпан, замените ключ нажав иконку расширения.",
    "423": "Неверный ключ, замените его нажав иконку расширения.",
    "@1": "Ошибка получения аудио :C",
    "@2": "Ошибка распознавания :C"
};

function debug(eventName, data) {
    if (!ls.debug) return;
    console.log("V2T", eventName, data);
}

function save() {
    chrome.storage.local.set(ls, function onSet() {
        debug('save', ls);
    });
}

function request(method, url, data) {
    return new Promise(function createRequest(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        if (data.contentType) xhr.setRequestHeader("Content-Type", data.contentType);
        if (data.responseType) xhr.responseType = data.responseType;
        xhr.onreadystatechange = function onreadystatechange() {
            if (xhr.readyState != 4) return;
            if (xhr.status != 200) return reject(xhr);
            resolve(xhr.response);
        };
        xhr.send(data.body);
    });
}

function genUid(el) {
    return ("a" + el.owner_id + "b" + el.aid + "e".repeat(32)).replace("-", "c").substr(0, 32);
}

function Voice2Text(el) {
    if (ls.cache[el.aid] == "@2") return Promise.reject(new Error({ status: "@2" }));
    if (ls.cache[el.aid]) return Promise.resolve({ response: ls.cache[el.aid] });
    return request("GET", el.getAttribute("data-ogg"), {
        responseType: "blob"
    }).catch(function onGetError(xhr) {
        throw { status: "@1", error: xhr };
    }).then(function uploadAudio(body) {
        var url = api_url + "&uuid=" + el.uid +
            "&key=" + ls.apikey +
            (ls.disableAntimat ? "&disableAntimat=true" : '');
        return request("POST", url, {
            contentType: "audio/ogg;codecs=opus",
            body: body
        });
    }).then(function parseResponse(res) {
        var xml = new DOMParser().parseFromString(res, "text/xml");
        var variants = xml.querySelector("variant");
        if (!variants) throw { status: "@2", error: res };
        return { response: variants.textContent };
    });
}

function parseAudio(el) {
    if (el.parentNode._stt) return;
    var r = document.createElement("div");
    r.textContent = "Загрузка...";
    r.className = "v2t_text v2t_loading";
    el.parentNode.parentNode.appendChild(r);
    el.parentNode._stt = true;
    el.owner_id = el.id.split("_")[1];
    el.aid = el.id.split("_")[2];
    el.uid = genUid(el);

    Voice2Text(el).catch(function onError(err) {
        return {
            error: err,
            response: errors[err.status] || err.response
        };
    }).then(function setResponse(res) {
        res.fromCache = !!ls.cache[el.aid];
        r.className = res.error ? "v2t_text v2t_error" : "v2t_text";
        r.textContent = res.response || "";
        debug(res.error ? "error" : "setResponse", { el: el, res: res});
        if (ls.hide_errors && res.error) {
            r.title = r.textContent;
            r.textContent = "";
            r.className = "v2t_error_short";
        }
        if (res.error == "@2" || !res.error) {
            ls.cache[el.aid] = res.error || res.response;
            if (!res.error && !res.fromCache) ls.counter++;
            save();
        }
    });
}

function findVoice(els) {
    if (ls.off || !active) return;
    [].map.call(els.querySelectorAll(".im_msg_audiomsg > div"), parseAudio);
}

chrome.storage.local.get(function onLoad(data) {
    Object.assign(ls, data);

    document.body.addEventListener('DOMNodeInserted', function onNewDOM(event) {
        if (event.target.nodeType == 1) findVoice(event.target);
    });
    findVoice(document.body);
    debug("loaded", ls);
});

chrome.storage.onChanged.addListener(function onSettingsChanged(data) {
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            ls[key] = data[key].newValue;
        }
    }
    if (data.off && !data.off.newValue) findVoice(document.body);
    debug("storage.onChanged", data);
});

window.addEventListener("blur", function onBlur() {
    if (!ls.only_active) return;
    active = false;
    debug("onBlur", active);
});

window.addEventListener("focus", function onFocus() {
    if (!ls.only_active) return;
    active = true;
    findVoice(document.body);
    debug("onFocus", active);
});
