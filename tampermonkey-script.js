// ==UserScript==
// @name         devtools
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        blob://*
// @match        https://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_setValue
// @grant        GM_openInTab

// @grant        unsafeWindow

// ==/UserScript==
let type = "host"

if(location.href.startsWith("https://jonnytest1.github.io/tampermonkey-devtools/")) {
    type = "client"

}
let active = true
let messageMap = {}
let messageId = 0
let handlers = {}
GM_addValueChangeListener("dvt-evt", async (_, _2, newVal, remote) => {
    if(!remote) {
        return;
    }
    if(messageMap[newVal.id]) {
        messageMap[newVal.id](newVal.response)
    } else if(newVal.message?.type) {
        if(handlers[newVal.message.type] && active) {
            const resp = await handlers[newVal.message.type](newVal.message);
            GM_setValue("dvt-evt", {
                type,
                id: newVal.id,
                response: resp
            })
        }
    }
})

async function send(message) {
    const id = type + messageId++ + "" + Date.now()
    return new Promise(res => {
        messageMap[id] = res;
        GM_setValue("dvt-evt", {
            type,
            id: id,
            message
        })
    })

}


function inFrame() {
    //send messages back and forth
    debugger;
}

const html = `<h1>head</h1><script>(${inFrame})()</script>`
const htmlBobl = new Blob([html], { type: "text/html" })

GM_registerMenuCommand('cmd', () => {
    const devUrl = URL.createObjectURL(htmlBobl);
    active = true
    GM_openInTab("https://jonnytest1.github.io/tampermonkey-devtools");
})

if(type == "client") {
    send({ type: "init" }).then((dom) => {
        function createTree(dom) {
            const el = document.createElement("div");
            el.style.marginLeft = "8px";

            const classStr = dom.classes ? `${dom.classes.map(c => `.${c}`).join("")}` : ""
            el.textContent = `${dom.tag}${classStr}`;
            el.definition = dom;
            for(const child of dom.children) {
                const childEl = createTree(child);
                el.appendChild(childEl);
            }
            return el;

        }
        const root = createTree(dom)
        const selectBtn = document.createElement("button")
        selectBtn.textContent = "select element";
        selectBtn.onclick = async () => {
            send({ type: "selectelement" }).then(data => {
                debugger;
            })
        }
        document.body.replaceChildren(root);
        document.body.insertBefore(selectBtn, root)
    })
} else {
    handlers["init"] = () => {
        const dom = {}

        function iterateDom(obj, domEl = document.body) {
            obj.tag = domEl.tagName,
                obj.id = domEl.id
            if(domEl.classList) {
                obj.classes = [...domEl.classList]
            }
            obj.children = [];

            [...domEl.childNodes].forEach(child => {
                const childObj = {}
                iterateDom(childObj, child);
                obj.children.push(childObj);
            })

        }
        iterateDom(dom)
        return dom
    };
    handlers["selectelement"] = () => {
        return new Promise(res => {
            function onclck(e) {
                res(e.target.textContent);
                document.removeEventListener("click", onclck);
            }
            document.addEventListener("click", onclck, true);
        })
    };
}