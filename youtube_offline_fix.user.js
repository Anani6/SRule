// ==UserScript==
// @name         YouTube 离线提示 Bug 修复助手
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  修复 YouTube 网页端明明有声音却提示“連線到互聯網 你已離線”的 Bug，自动隐藏离线蒙层并锁定在线状态。
// @author       Antigravity
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 1. 劫持 navigator.onLine，防止 YouTube 脚本误判设备为离线
    Object.defineProperty(navigator, 'onLine', {
        get: () => true,
        configurable: true
    });

    // 2. 注入 CSS，强制隐藏 YouTube 可能会弹出的离线错误蒙层或重试屏幕
    const style = document.createElement('style');
    style.innerHTML = `
        /* 强制隐藏离线错误蒙层，使底层的视频画面可见 */
        yt-player-error-message-renderer,
        ytd-playability-error-supported-renderers,
        .yt-playability-error-supported-renderers,
        #error-screen {
            display: none !important;
        }
    `;
    document.documentElement.appendChild(style);

    // 3. 拦截网页离线事件，不让 YouTube 的 SPA 状态机接收到浏览器的断网通知
    window.addEventListener('offline', function(e) {
        e.stopImmediatePropagation();
    }, true);
})();
