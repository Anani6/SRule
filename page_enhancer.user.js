// ==UserScript==
// @name         Page Enhancer
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Improve browsing experience
// @author       You
// @match        *://misskon.com/*
// @match        *://*.misskon.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // 记录用户真正点击的链接
    let allowedUrl = null;
    let clickTime = 0;

    // 保存原始的 window.open
    const originalOpen = window.open;

    // 重写 window.open
    window.open = function (url, target, features) {
        const now = Date.now();

        // 只有在用户刚刚点击（500ms内）且URL与点击的链接匹配时才允许
        if (allowedUrl && (now - clickTime) < 500) {
            // URL完全匹配，或者是用户点击链接的一部分
            if (url === allowedUrl || (url && allowedUrl.includes(url)) || (url && url.includes(allowedUrl))) {
                console.log('[PE] 允许:', url);
                return originalOpen.apply(this, arguments);
            }
        }

        // 其他情况全部阻止
        console.log('[PE] 已阻止:', url);
        return null;
    };

    // 监听点击事件，记录用户点击的链接
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (link && link.href) {
            allowedUrl = link.href;
            clickTime = Date.now();

            // 500ms后清除，防止被利用
            setTimeout(() => {
                allowedUrl = null;
            }, 500);
        }
    }, true);

    // 阻止通过隐藏链接打开广告
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function (tagName) {
        const element = originalCreateElement(tagName);

        if (tagName.toLowerCase() === 'a') {
            const originalClick = element.click;
            element.click = function () {
                if (!element.isConnected || element.style.display === 'none') {
                    console.log('[PE] 阻止隐藏链接:', element.href);
                    return;
                }
                return originalClick.apply(this, arguments);
            };
        }
        return element;
    };

    console.log('[PE] ready');

})();
