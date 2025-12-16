// ==UserScript==
// @name         MissKon 智能广告拦截器
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  基于行为特征拦截 misskon.com 的动态广告脚本，无需维护域名黑名单
// @author       You
// @match        *://misskon.com/*
// @match        *://*.misskon.com/*
// @match        https://misskon.com/*
// @match        https://*.misskon.com/*
// @run-at       document-start
// @grant        none
// @noframes     false
// @compatible   chrome
// @compatible   safari
// ==/UserScript==

(function () {
    'use strict';

    // ==================== 配置 ====================
    const CONFIG = {
        // 白名单域名（这些域名的脚本永远不会被拦截）
        whitelist: [
            'misskon.com',
            'ouo.io',
            'cdn.ouo.io',
            'disqus.com',
            'disquscdn.com',
            'google.com',
            'googleapis.com',
            'gstatic.com',
            'googletagmanager.com',  // 可选：如果不需要分析可以移除
            'cloudflare.com',
            'cloudflareinsights.com',
            'jquery.com',
            'jsdelivr.net',
            'cdnjs.cloudflare.com',
            'wp.com',
            'wordpress.com',
            'gravatar.com'
        ],
        // 已知的广告关键词（脚本路径中包含这些会被拦截）
        adKeywords: [
            'ad-provider',
            'AdProvider',
            'magsrv.com',
            '/pop.',
            '/push.',
            'popunder',
            'clickunder'
        ],
        // 可疑脚本路径模式
        suspiciousPathPatterns: [
            /\/code\.js$/i,
            /\/on\.js$/i,
            /\/[a-z]{5,8}\.js$/i,  // 类似 /takawma.js 这样的随机短名称
        ],
        // 启用调试日志
        debug: true
    };

    // ==================== 工具函数 ====================
    function log(...args) {
        if (CONFIG.debug) {
            console.log('%c[MissKon AdBlock]', 'color: #ff6b6b; font-weight: bold;', ...args);
        }
    }

    function isWhitelisted(url) {
        try {
            const hostname = new URL(url).hostname;
            return CONFIG.whitelist.some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
            );
        } catch {
            return false;
        }
    }

    function hasAdKeyword(url) {
        return CONFIG.adKeywords.some(keyword => url.includes(keyword));
    }

    function hasSuspiciousPath(url) {
        return CONFIG.suspiciousPathPatterns.some(pattern => pattern.test(url));
    }

    /**
     * 检测是否是可疑的随机生成域名
     * 特征：
     * 1. 由多个英文单词拼接而成（如 bankingbloatedcaptive.com）
     * 2. 很长的随机字母组合（如 ruvsraaklrih.com）
     * 3. 顶级域名是常见的（.com, .net, .io）但二级域名很长
     */
    function isSuspiciousRandomDomain(url) {
        try {
            const hostname = new URL(url).hostname;
            const parts = hostname.split('.');

            // 获取主域名部分（去掉 www. 和顶级域名）
            let mainDomain = parts[0];
            if (mainDomain === 'www' && parts.length > 2) {
                mainDomain = parts[1];
            }
            // 如果是子域名结构如 a.magsrv.com，取主域名
            if (parts.length >= 3 && parts[0].length <= 2) {
                mainDomain = parts[1];
            }

            // 规则1: 域名很长（超过15个字符）且全是小写字母
            if (mainDomain.length > 15 && /^[a-z]+$/.test(mainDomain)) {
                return true;
            }

            // 规则2: 域名看起来像随机字符串（辅音/元音比例不正常）
            if (mainDomain.length > 8 && /^[a-z]+$/.test(mainDomain)) {
                const vowels = (mainDomain.match(/[aeiou]/gi) || []).length;
                const consonants = mainDomain.length - vowels;
                const ratio = vowels / mainDomain.length;
                // 正常英语单词元音比例约30-40%，随机字符串通常偏离这个范围
                if (ratio < 0.15 || ratio > 0.6) {
                    return true;
                }
            }

            // 规则3: 包含多个常见英语单词拼接（如 bankingbloatedcaptive）
            const commonWords = ['banking', 'bloated', 'captive', 'bobsled', 'domestic',
                'glandular', 'click', 'track', 'serve', 'push', 'pop'];
            let matchCount = 0;
            for (const word of commonWords) {
                if (mainDomain.includes(word)) matchCount++;
            }
            if (matchCount >= 2) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    }

    /**
     * 综合判断是否应该拦截该URL
     */
    function shouldBlock(url) {
        if (!url || typeof url !== 'string') return false;

        // 相对路径通常是安全的（来自同源）
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
            return false;
        }

        // 白名单放行
        if (isWhitelisted(url)) {
            return false;
        }

        // 检查广告关键词
        if (hasAdKeyword(url)) {
            log('🚫 拦截 (广告关键词):', url);
            return true;
        }

        // 检查可疑的随机域名
        if (isSuspiciousRandomDomain(url)) {
            log('🚫 拦截 (可疑随机域名):', url);
            return true;
        }

        // 检查可疑的脚本路径
        if (hasSuspiciousPath(url)) {
            log('🚫 拦截 (可疑路径):', url);
            return true;
        }

        return false;
    }

    // ==================== 拦截逻辑 ====================

    // 1. 拦截 window.open（阻止弹窗广告）
    const originalWindowOpen = window.open;
    window.open = function (url, ...args) {
        // 允许用户主动触发的行为（如点击下载链接）
        // 但阻止自动弹出的广告窗口
        if (url && shouldBlock(url)) {
            log('🚫 阻止弹窗:', url);
            return null;
        }
        // 如果不是可信来源，也阻止
        if (!url || (!isWhitelisted(url) && !url.includes('misskon.com'))) {
            log('🚫 阻止未知弹窗:', url);
            return null;
        }
        return originalWindowOpen.call(window, url, ...args);
    };

    // 2. 拦截动态创建的 script 标签
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function (tagName, options) {
        const element = originalCreateElement(tagName, options);

        if (tagName.toLowerCase() === 'script') {
            // 拦截 setAttribute
            const originalSetAttribute = element.setAttribute.bind(element);
            element.setAttribute = function (name, value) {
                if (name.toLowerCase() === 'src' && shouldBlock(value)) {
                    return; // 静默忽略
                }
                return originalSetAttribute(name, value);
            };

            // 拦截 .src 属性赋值
            let srcValue = '';
            Object.defineProperty(element, 'src', {
                get() { return srcValue; },
                set(value) {
                    if (shouldBlock(value)) {
                        return; // 静默忽略
                    }
                    srcValue = value;
                    originalSetAttribute('src', value);
                },
                configurable: true
            });
        }

        // 拦截 iframe（广告常用 iframe）
        if (tagName.toLowerCase() === 'iframe') {
            const originalSetAttribute = element.setAttribute.bind(element);
            element.setAttribute = function (name, value) {
                if (name.toLowerCase() === 'src' && shouldBlock(value)) {
                    return;
                }
                return originalSetAttribute(name, value);
            };

            let srcValue = '';
            Object.defineProperty(element, 'src', {
                get() { return srcValue; },
                set(value) {
                    if (shouldBlock(value)) {
                        return;
                    }
                    srcValue = value;
                    originalSetAttribute('src', value);
                },
                configurable: true
            });
        }

        return element;
    };

    // 3. 使用 MutationObserver 移除已插入的广告脚本
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // 检查 script 标签
                    if (node.tagName === 'SCRIPT' && node.src && shouldBlock(node.src)) {
                        node.remove();
                        log('🗑️ 移除脚本:', node.src);
                    }
                    // 检查 iframe 标签
                    if (node.tagName === 'IFRAME' && node.src && shouldBlock(node.src)) {
                        node.remove();
                        log('🗑️ 移除iframe:', node.src);
                    }
                    // 递归检查子元素
                    const scripts = node.querySelectorAll?.('script[src], iframe[src]');
                    scripts?.forEach(el => {
                        if (shouldBlock(el.src)) {
                            el.remove();
                            log('🗑️ 移除嵌套元素:', el.src);
                        }
                    });
                }
            }
        }
    });

    // 4. 拦截 fetch 和 XMLHttpRequest（部分广告通过 AJAX 加载）
    const originalFetch = window.fetch;
    window.fetch = function (url, ...args) {
        const urlString = typeof url === 'string' ? url : url?.url;
        if (urlString && shouldBlock(urlString)) {
            log('🚫 拦截 fetch:', urlString);
            return Promise.reject(new Error('Blocked by MissKon Ad Blocker'));
        }
        return originalFetch.call(window, url, ...args);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        if (url && shouldBlock(url)) {
            log('🚫 拦截 XHR:', url);
            this._blocked = true;
        }
        return originalXHROpen.call(this, method, url, ...args);
    };

    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        if (this._blocked) {
            return;
        }
        return originalXHRSend.call(this, ...args);
    };

    // 5. 启动观察器
    if (document.documentElement) {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        });
    }

    // 6. 清理页面上已存在的可疑脚本
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('script[src], iframe[src]').forEach(el => {
            if (shouldBlock(el.src)) {
                el.remove();
                log('🗑️ 清理已存在元素:', el.src);
            }
        });
        log('✅ 初始化完成，广告拦截已激活');
    });

    log('🚀 MissKon 智能广告拦截器已启动');
})();
