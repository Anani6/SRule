// ==UserScript==
// @name         Block MissKON Popups
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Stops pop-ups and ads on misskon.com
// @author       You
// @match        https://misskon.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const blockedSubstrings = [
        'ouo.io',
        'a.magsrv.com',
        'bankingbloatedcaptive.com',
        'bobsleddomesticglandular.com',
        'ad-provider.js',
        'full-page-script.js'
    ];

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'SCRIPT') {
                    const scriptSrc = node.src || '';
                    const scriptContent = node.innerHTML || '';

                    for (const sub of blockedSubstrings) {
                        if (scriptSrc.includes(sub) || scriptContent.includes(sub)) {
                            node.textContent = ''; // Clear content
                            node.remove();
                            console.log(`Removed malicious script: ${scriptSrc || 'inline script'}`);
                            break; // Move to the next node
                        }
                    }
                }
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

})();
