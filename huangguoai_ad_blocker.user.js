// ==UserScript==
// @name         黄果短剧去播放广告
// @namespace    https://github.com/anani/ad_break
// @version      1.0.0
// @description  移除黄果短剧播放页的跳转广告（透明遮罩 .dx-ad-plugin）
// @author       anani
// @match        https://huangguoai.com/*
// @match        https://*.qtsubrdfj.cc/*
// @match        https://huangguo2.com/*
// @match        https://huangguoai.ai/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/**
 * 原理说明
 * --------
 * 网站在 <script id="videoInitialData"> 里下发 playAd: { id, url, intervalSec }，
 * 播放器的 ExternalPlugin 据此在视频区域叠加一层透明 <a target="_blank" class="dx-ad-plugin">，
 * 用户第一次点"播放"实际点到的是这个透明链接 → 新标签页打开广告。
 *
 * 拦截策略（双保险）：
 *   1. 劫持 JSON.parse — 在数据被消费之前就把 playAd 字段删掉，
 *      播放器根本不会创建遮罩，最干净。
 *   2. MutationObserver — 兜底移除 .dx-ad-plugin 元素，
 *      防止有其他路径绕过 JSON.parse 创建遮罩。
 */

(function () {
  'use strict';

  // ── 1. 劫持 JSON.parse，删除 playAd 字段 ──────────────────────────────
  const _origParse = JSON.parse;
  JSON.parse = function (text, reviver) {
    const result = _origParse.call(this, text, reviver);
    if (result && typeof result === 'object' && result.playAd) {
      delete result.playAd;
    }
    return result;
  };
  // 保留原始引用，以防其他脚本需要
  JSON.parse._original = _origParse;

  // ── 2. MutationObserver 兜底移除遮罩 ──────────────────────────────────
  const AD_SELECTOR = '.dx-ad-plugin';

  function removeAdMasks(root) {
    const masks = (root || document).querySelectorAll(AD_SELECTOR);
    masks.forEach((el) => el.remove());
    return masks.length;
  }

  function startObserver() {
    // 先清一遍已有的
    removeAdMasks();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          // 新增节点本身就是遮罩
          if (node.matches && node.matches(AD_SELECTOR)) {
            node.remove();
            continue;
          }
          // 新增节点的子树里包含遮罩
          if (node.querySelectorAll) {
            removeAdMasks(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    startObserver();
  } else {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  }
})();
