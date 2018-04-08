/* global chrome */

var ls = {
    show_counter: 1
};

function debug(eventName, data) {
    if (!ls.debug) return;
    console.log("V2T:", eventName, data);
}

function update() {
    if (ls.off) {
        chrome.browserAction.setBadgeText({
            text: "off"
        });
    } else if (ls.show_counter) {
        chrome.browserAction.setBadgeText({
            text: "" + (ls.counter || 0)
        });
    } else {
        chrome.browserAction.setBadgeText({
            text: ""
        });
    }
}

chrome.storage.local.get(function onLoad(data) {
    Object.assign(ls, data);
    update();
    debug("storage.get", data);
});

chrome.storage.onChanged.addListener(function onStorageChanged(data) {
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            ls[key] = data[key].newValue;
        }
    }
    update();
    debug("storage.onChanged", data);
});
