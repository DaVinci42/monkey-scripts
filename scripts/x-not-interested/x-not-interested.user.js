// ==UserScript==
// @name         Not Interested
// @namespace    local.x.quick-not-interested
// @version      2.4.5
// @description  Adds a quick "Not interested" button to every post on X/Twitter
// @license      MIT
// @homepageURL  https://github.com/DaVinci42/monkey-scripts/tree/main/scripts/x-not-interested
// @supportURL   https://github.com/DaVinci42/monkey-scripts/issues
// @icon         https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/twitter/default.svg
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * - UI: X's native sad-face icon, 16px left of each post's three-dot menu.
 * - Click: Silently runs X's language-independent "Not interested" action.
 * - Maintenance: People and agents must update this list after any UI or behavior change.
 */

(() => {
  'use strict';

  const BUTTON = 'data-quick-not-interested';
  const BUSY = 'data-quick-not-interested-busy';
  const CARET = '[data-testid="caret"][aria-haspopup="menu"]';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  document.head.insertAdjacentHTML('beforeend', `<style>
    body[${BUSY}] [data-testid="Dropdown"],
    body[${BUSY}] [role="menu"] { visibility: hidden !important; }
  </style>`);

  const findMenuItem = () => document.querySelector(
    '[role="menuitem"]:has(path[d^="M12 13.6c1.64"])',
  );

  const waitForMenuItem = async () => {
    for (let attempts = 25; attempts > 0; attempts -= 1) {
      const item = findMenuItem();
      if (item) return item;
      await sleep(100);
    }
    throw new Error('Not interested menu item not found');
  };

  const resetButton = (button, title) => {
    Object.assign(button, { disabled: false, title });
    button.style.opacity = '1';
  };

  const markFailed = (button, message) => {
    button.title = message;
    button.style.opacity = '0.5';
    setTimeout(() => resetButton(button, 'Mark this post as not interested'), 1800);
  };

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const caret = button.closest('article')?.querySelector(CARET);
    if (!caret) return markFailed(button, 'Post menu button not found');

    button.disabled = true;
    button.ariaBusy = 'true';
    button.style.opacity = '0.5';
    document.body.toggleAttribute(BUSY, true);

    try {
      caret.click();
      (await waitForMenuItem()).click();
      resetButton(button, 'Marked as not interested');
    } catch (error) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      markFailed(button, error.message);
    } finally {
      button.removeAttribute('aria-busy');
      requestAnimationFrame(() => document.body.removeAttribute(BUSY));
    }
  };

  const createButton = (caret) => {
    const button = caret.cloneNode(true);
    ['data-testid', 'aria-expanded', 'aria-haspopup'].forEach((name) => button.removeAttribute(name));
    button.toggleAttribute(BUTTON, true);
    button.setAttribute('aria-label', 'Not interested');
    button.title = 'Mark this post as not interested';
    button.querySelector('svg').innerHTML = '<g><path d="M12 13.6c1.64-.013 3.278.76 4.284 2.02.114.14.218.282.317.43l-1.202.9c-.088-.102-.177-.197-.272-.289-.844-.823-1.98-1.264-3.125-1.26-1.146-.002-2.282.441-3.129 1.263-.095.092-.185.186-.273.287l-1.2-.902c.1-.149.205-.29.319-.429C8.728 14.364 10.36 13.59 12 13.6zM9.25 8c.828 0 1.5.796 1.5 1.9 0 1.105-.672 1.85-1.5 1.85s-1.5-.745-1.5-1.85c0-1.104.672-1.9 1.5-1.9zm5.5 0c.828 0 1.5.796 1.5 1.9 0 1.105-.672 1.85-1.5 1.85s-1.5-.745-1.5-1.85c0-1.104.672-1.9 1.5-1.9z"></path><path clip-rule="evenodd" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8z" fill-rule="evenodd"></path></g>';
    button.addEventListener('click', handleClick);
    return button;
  };

  const enhancePosts = () => {
    document.querySelectorAll(`article:not(:has([${BUTTON}]))`).forEach((article) => {
      const caret = article.querySelector(CARET);
      if (caret?.parentElement) {
        caret.parentElement.style.columnGap = '16px';
        caret.before(createButton(caret));
      }
    });
  };

  enhancePosts();
  new MutationObserver(enhancePosts).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
