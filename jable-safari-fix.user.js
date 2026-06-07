// ==UserScript==
// @name         Jable.tv Safari 后台标签页播放器修复
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  修复在 Safari 中后台打开网页时，因为自动播放拦截导致播放按钮彻底失效的 Bug
// @author       Antigravity
// @match        *://jable.tv/*
// @match        *://*.jable.tv/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 创建一个 script 标签直接注入到网页最原始的上下文中
    // 这样可以确保网站的 player.js 调用的是我们改造过的方法
    const script = document.createElement('script');
    script.textContent = `
        (function() {
            // 备份浏览器原生的播放方法
            const originalPlay = HTMLMediaElement.prototype.play;
            
            // 覆盖原生的播放方法
            HTMLMediaElement.prototype.play = function() {
                // 照常去执行原本的播放指令
                const playPromise = originalPlay.apply(this, arguments);
                
                if (playPromise !== undefined) {
                    // 如果被浏览器阻止了，我们在这里兜底捕获异常
                    return playPromise.catch(error => {
                        if (error.name === 'NotSupportedError' || error.name === 'NotAllowedError') {
                            console.warn('🔧 [Safari 修复脚本] 拦截了后台播放被拒报错，防止播放器状态机卡死:', error);
                            
                            // 核心修复：强行向播放器派发一个 'pause' (暂停) 事件
                            // 这会欺骗网站播放器，让它把 UI 按钮重置回正常可点击的“播放”图标
                            setTimeout(() => {
                                this.dispatchEvent(new Event('pause'));
                            }, 50);
                            
                            // 返回一个“正常完成”的 Promise 对象，代替原本会让系统崩溃的报错
                            return Promise.resolve();
                        }
                        // 如果是其他未知严重错误，则正常抛出
                        throw error;
                    });
                }
            };
        })();
    `;
    
    // 将代码注入网页头部并在执行后立刻清理掉标签
    document.documentElement.appendChild(script);
    script.remove(); 
})();
