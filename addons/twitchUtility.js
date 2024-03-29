const addonInfo = {
    name: "TwitchUtility",  // Addon Name
    id: "twitchUtility",     // Addon ID (Referenced by save data)
    version: "1.0.0",        // Version
    thumbnail: "https://github.com/creepycats/gatoclient-addons/blob/main/thumbnails/twitchutility.png?raw=true",           // Thumbnail URL
    description: "Allows you to integrate your Twitch chat ingame (!link, Chat View)",
    isSocial: false         // UNSUPPORTED - Maybe a future Krunker Hub addon support
};
const path = require('path');
const { shell } = require('electron');
const fetch = (...args) => import(path.resolve('./') + '/resources/app.asar/node_modules/node-fetch').then(({ default: fetch }) => fetch(...args));
const { createServer } = require('http');
const addonSettingsUtils = require(path.resolve('./') + '/resources/app.asar/app/utils/addonUtils');
const addonSetUtils = new addonSettingsUtils();
const client_id = "omnaylafso0f3fdtzwrwk5qdb24km9";
const tmi = require(path.resolve('./') + '/resources/app.asar/node_modules/tmi.js/');

class gatoAddon {
    // Fetch Function - DO NOT REMOVE
    static getInfo(infoName) {
        return addonInfo[infoName];
    }
    // Create your inital configurations here
    static firstTimeSetup() {
        // REQUIRED
        addonSetUtils.addConfig(addonInfo["id"], "enabled", true);
        // Add your custom configuration options here
        addonSetUtils.addConfig(addonInfo["id"], "chatboxEnabled", true);
        addonSetUtils.addConfig(addonInfo["id"], "chatboxOpacity", "1");
        addonSetUtils.addConfig(addonInfo["id"], "chatboxBgOpacity", "0.2");
        addonSetUtils.addConfig(addonInfo["id"], "chatboxHeight", "2.5");
    }

    // Runs when page starts loading
    static initialize() {

    }

    // Runs when page fully loaded
    static domLoaded() {
        let css = `
        #twitchChatList{
            overflow-y:hidden;
            overflow-y:auto;
            overflow-x:hidden;
            z-index:999999;
            border-radius:5px;
            background-color:rgba(0,0,0,.4);
            pointer-events:all;
            position:relative;
            margin-bottom:50px;
            direction:rtl;
            text-align:left;
        }
        #twitchChatList::-webkit-scrollbar-track{
            -webkit-box-shadow:unset;
            box-shadow:unset;
            border-radius:unset;
            background-color:rgba(0,0,0,.25)
        }
        #twitchChatList::-webkit-scrollbar{
            width:6px
        }
        #twitchChatList::-webkit-scrollbar-thumb{
            border-radius:2px;
            -webkit-box-shadow:unset;
            box-shadow:unset;
            border-color:#36393f
        }
        `
        const injectSettingsCss = (css, classId = "twitchutility-css") => {
            let s = document.createElement("style");
            s.setAttribute("id", classId);
            s.innerHTML = css;
            document.head.appendChild(s);
        }
        injectSettingsCss(css);

        let chatboxEnabled = addonSetUtils.getConfig(addonInfo["id"], "chatboxEnabled");
        if(chatboxEnabled == true){
            let chatHolder = document.getElementById("chatHolder");
            let chatList = document.getElementById("chatList");
            var twitchChat = chatList.cloneNode(false);
            twitchChat.id = "twitchChatList";
            twitchChat.style = `display:block; opacity:${addonSetUtils.getConfig(addonInfo["id"], "chatboxOpacity")}; max-height: ${Number(addonSetUtils.getConfig(addonInfo["id"], "chatboxHeight")) * 100}px`;
            chatHolder.insertBefore(twitchChat, chatHolder.children[0]);
        }

        async function initTwitchIntegration(tokenPromise) {
            var token = await tokenPromise;
            var user = addonSetUtils.getConfig(addonInfo["id"], "channelName");
            const client = new tmi.Client({
                options: { debug: true },
                clientId: client_id,
                identity: {
                    username: `${user}`,
                    password: `oauth:${token}`
                },
                channels: [`${user}`]
            });

            client.connect();

            console.log("TwitchUtility Connected!");

            var _messageNumber = 0;

            client.on('message', (channel, tags, message, self) => {
                if (message.toLowerCase() === '!link' && addonSetUtils.getConfig(addonInfo["id"], "linkCommand") == true) {
                    client.say(channel, `@${tags.username} ` + window.location.href);
                    return;
                }

                if (chatboxEnabled == true) {
                    var _msgElement = document.createElement("div");
                    _msgElement.setAttribute("data-tab", "-1");
                    _msgElement.id = "chatMsg_" + _messageNumber;

                    var _msgItem = document.createElement("div");
                    _msgItem.classList.add("chatItem");
                    _msgItem.classList.add("twitchMsg");
                    _msgItem.style = `background-color: rgba(0, 0, 0, ${addonSetUtils.getConfig(addonInfo["id"], "chatboxBgOpacity")})`;
                    _msgItem.innerHTML = `‎<span style="color:${tags.color}">${tags['display-name']}: </span><span class="chatMsg">` + message + "</span>‎";
                    _msgElement.appendChild(_msgItem);

                    let twitchChatList = document.getElementById("twitchChatList");
                    twitchChatList.appendChild(_msgElement);
                    twitchChatList.scrollTop = twitchChatList.scrollHeight;
                    _messageNumber++;

                    if (twitchChatList.childNodes.length > 35) {
                        twitchChatList.childNodes[0].remove();
                    }
                }
            });
        }
        console.log("TwitchUtility Module Requesting Token...");
        initTwitchIntegration(this.getToken());
    }

    // Runs when settings update
    static updateSettings() {
        let twitchChatList = document.getElementById("twitchChatList");
        twitchChatList.style = `display:block; opacity:${addonSetUtils.getConfig(addonInfo["id"], "chatboxOpacity")}; max-height: ${Number(addonSetUtils.getConfig(addonInfo["id"], "chatboxHeight")) * 100}px`;
        let messages = document.querySelectorAll(".twitchMsg");
        for (const msg in messages) {
            messages[msg].style = `background-color: rgba(0, 0, 0, ${addonSetUtils.getConfig(addonInfo["id"], "chatboxBgOpacity")})`;
        }
    }

    static handleTokenUrl(url) {
        const { token } = String(url).match(/token=(?<token>.*)/u)?.groups ?? {};
        if (!token) return new Error('No token');
        addonSetUtils.addConfig(addonInfo["id"], "token", token);

        this.getUsername(token);

        return token;
    }
    static getToken() {
        return new Promise((resolve, reject) => {
            const cachedToken = addonSetUtils.getConfig(addonInfo["id"], "token");
            if (cachedToken != undefined && cachedToken.length > 0) {
                return resolve(cachedToken);
            }
            const state = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);

            const oauthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${client_id}&redirect_uri=http://localhost:6942&state=${state}&response_type=token&scope=chat:read+chat:edit`;

            const server = createServer((req, res) => {
                if (req.method !== 'GET') return res.end();
                if (req.url === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    return res.end(`<!DOCTYPE html>
                    <html lang="en">
                        <head><title>Gatoclient Twitch oAuth</title><head>
                        <body>
                            <noscript><h2>Please enable Javascript on your browser</h2></noscript>
                            <h2>Close this window if it does not automatically close for you</h2>
                            <script>
                                if (location.hash) {
                                    const token = location.hash.match(/access_token=(.*)&scope/)[1];
                                    const state = location.hash.match(/state=(.*)&/)[1];
                                    if (state !== '${state}') throw new Error('State mismatch');
                                    fetch('http://localhost:6942/token?token=' + token, {
                                        method: 'GET',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        }
                                    }).then(window.close);
                                } else {
                                    document.write('<h2>oh No</h2>');
                                }
                            </script>
                        <body>
                    </html>`);
                }
                if (String(req.url).startsWith('/token')) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end();
                    server.close();

                    const result = this.handleTokenUrl(req.url);

                    if (result instanceof Error) return reject(result);
                    return resolve(result);
                }
                return res.end();
            }).listen(6942, () => {
                shell.openExternal(oauthUrl);
            });
            setTimeout(() => {
                server.close();
                return reject(new Error('Timeout'));
            }, 5 * 60 * 1000);
        });
    }

    // Loads Addons Settings to Configuration Window
    static loadAddonSettings(loadedAddons) {
        addonSetUtils.createForm(addonInfo["id"]);

        addonSetUtils.createCategory("addonSettings", "Addon Settings");
        addonSetUtils.createCheckbox(addonInfo["id"], "enabled", "Enable Addon", "Determines if the Addon loads when refreshing page", "addonSettings", false, 2);
        function resetToken() {
            addonSetUtils.addConfig(addonInfo["id"], "token", "");
        }
        addonSetUtils.createTextInput(addonInfo["id"], "channelName", "Twitch Username", "Due to high instability, I ask that you please input your Twitch username here", "Enter your Twitch Username", "addonSettings", false, 2);
        addonSetUtils.createButton(addonInfo["id"], "resetToken", "Remove oAuth Token", "Removes your oAuth token", "Reset", resetToken, "addonSettings", false, 2);

        addonSetUtils.createCategory("featureSettings", "Features");
        addonSetUtils.createCheckbox(addonInfo["id"], "linkCommand", "!Link command", "Allows users in chat to comment !Link to get the game link", "featureSettings", false);

        addonSetUtils.createCategory("chatboxSettings", "Twitch Chatbox Settings");
        addonSetUtils.createCheckbox(addonInfo["id"], "chatboxEnabled", "Enable Chatbox", "Determines if the Addon loads when refreshing page", "chatboxSettings", false, 2);
        addonSetUtils.createSlider(addonInfo["id"], "chatboxOpacity", "Chat Opacity", "Changes twitch chat opacity", 0, 1.0, 1.0, 0.1, "chatboxSettings", false);
        addonSetUtils.createSlider(addonInfo["id"], "chatboxBgOpacity", "Chat BG Opac", "Changes message background opacity", 0, 1.0, 0.2, 0.1, "chatboxSettings", false);
        addonSetUtils.createSlider(addonInfo["id"], "chatboxHeight", "Chat Height", "Changes maximum height of chatbox", 0, 5.0, 2.5, 0.1, "chatboxSettings", false);

        addonSetUtils.hookSaving(addonInfo["id"], __dirname);
    }
}
module.exports = gatoAddon
