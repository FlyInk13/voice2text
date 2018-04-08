/* global chrome */
var ls = { show_counter: 1 };
var dom = {};

function save() {
    chrome.storage.local.set(ls, function onSave() {
        dom.log.textContent = "Настройки сохранены";
    });
}


function attachChecbox(box) {
    box.checked = ls[box.id];
    box.onchange = function onChanged() {
        ls[box.id] = box.checked;
        save();
    };
}

chrome.storage.local.get(function onLoad(data) {
    ls = data;
    dom.log = document.getElementById('log');
    dom.edit_key = document.getElementById('edit_key');
    dom.apikey = document.getElementById('apikey');

    [].forEach.call(document.querySelectorAll('[type="checkbox"]'), attachChecbox);

    dom.edit_key.onclick = function openKeyEditor() {
        dom.apikey.style.display = "block";
        dom.edit_key.textContent = "Сохранить ключ";
        dom.edit_key.onclick = function replaceKey() {
            ls.apikey = dom.apikey.value;
            if (!ls.apikey) {
                delete ls.apikey;
                chrome.storage.local.remove("apikey");
            }
            save();
        };
    };

    dom.log.ondblclick = function onInitDebug() {
        ls.debug = !ls.debug;
        save();
    };
});
