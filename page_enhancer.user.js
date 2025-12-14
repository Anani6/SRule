// ==UserScript==
// @name         Page Enhancer
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Improve browsing experience
// @author       You
// @match        *://misskon.com/*
// @match        *://*.misskon.com/*
// @grant        none
// @run-at       document-start
// ==UserScript==

(function () {
    'use strict';

    // 已知的广告域名黑名单
    const AD_DOMAINS = [
        'hivoppztet.com',
    ];

    // 保存原始的 window.open
    const originalOpen = window.open;

    // 判断是否是广告URL
    function isAdUrl(url) {
        if (!url) return false;

        // 1. 检查已知广告域名
        for (const domain of AD_DOMAINS) {
            if (url.includes(domain)) return true;
        }

        // 2. 检查随机字符域名模式（如 hivoppztet.com 这种无意义字符串）
        // 匹配：8-12个连续小写字母组成的域名
        if (/^https?:\/\/[a-z]{8,12}\.(com|net|org|xyz|top|click|info)/i.test(url)) {
            return true;
        }

        // 3. 非 misskon.com 的外部链接，在点击站内链接时触发的，视为广告
        if (!url.includes('misskon.com')) {
            return true;
        }

        return false;
    }

    // 重写 window.open，阻止广告弹窗
    window.open = function (url, target, features) {
        if (isAdUrl(url)) {
            console.log('[MissKon广告拦截] 已阻止弹窗:', url);
            return null;
        }
        return originalOpen.apply(this, arguments);
    };

    // 监听点击事件
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (link && link.href) {
            userClickedLink = true;
            clickedLinkHref = link.href;

            // 短暂延迟后重置状态
            setTimeout(() => {
                userClickedLink = false;
                clickedLinkHref = null;
            }, 100);
        }
    }, true);

    // 阻止通过创建隐藏链接并触发点击的方式打开广告
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function (tagName) {
        const element = originalCreateElement(tagName);

        if (tagName.toLowerCase() === 'a') {
            const originalClick = element.click;
            element.click = function () {
                // 检查是否是程序化触发的点击（用于打开广告）
                if (!element.isConnected || element.style.display === 'none' || element.offsetParent === null) {
                    console.log('[MissKon广告拦截] 已阻止隐藏链接点击:', element.href);
                    return;
                }
                return originalClick.apply(this, arguments);
            };
        }

        return element;
    };

    // 移除可能的广告事件监听器
    window.addEventListener('DOMContentLoaded', function () {
        // 移除 body 上的可疑点击事件
        const body = document.body;
        if (body) {
            const clone = body.cloneNode(false);
            while (body.firstChild) {
                clone.appendChild(body.firstChild);
            }
            body.parentNode.replaceChild(clone, body);
        }
    });

    // 阻止 beforeunload 中的广告逻辑
    window.addEventListener('beforeunload', function (e) {
        // 不做任何事情，只是阻止可能的广告逻辑
    }, true);

    console.log('[MissKon广告拦截器] 已启动');

})();
