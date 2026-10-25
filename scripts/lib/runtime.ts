/**
 * The behaviour the captured HTML lost.
 *
 * The captured site is a Rails + Inertia app: every interactive control
 * (the mobile navigation drawer, the newsletter capture, the "Access Free"
 * email gates) is rendered by React in the browser. A capture keeps the
 * server-rendered markup and none of the behaviour, so those controls look
 * live and do nothing — the single biggest gap between this copy and the
 * real site.
 *
 * Two honest options: leave them dead, or write the behaviour back. This
 * module does the second, and only for what the markup actually needs:
 *
 *   1. the mobile drawer (<900px), built from the links already on the page;
 *   2. form submissions, answered locally instead of posted to a server
 *      that is not here;
 *   3. an explicit notice on any control that genuinely needs an account or a
 *      file that was never captured, rather than a button that silently fails;
 *   4. external links opened safely.
 *
 * The script is injected by `adaptPage()` and is asserted by `site-check`.
 */

/** Decode a Cloudflare-obfuscated address: first byte is the key, the rest XOR. */
export function decodeCfEmail(hex: string): string {
  const bytes = hex.match(/.{2}/g)
  if (!bytes || bytes.length < 2) return ''
  const key = parseInt(bytes[0], 16)
  return bytes
    .slice(1)
    .map((pair) => String.fromCharCode(parseInt(pair, 16) ^ key))
    .join('')
}

/**
 * Cloudflare replaces each address with `[email protected]` and strips the
 * script that would decode it. Decode the addresses in the markup instead, so
 * the copy shows the real contact address rather than a placeholder.
 */
export function restoreEmails(html: string): string {
  return html
    .replace(
      /<a\b[^>]*href="[^"]*(?:cdn-cgi\/l\/)?email-protection[^"]*"[^>]*>\s*<span[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>[\s\S]*?<\/span>\s*<\/a>/g,
      (_match, hex: string) => {
        const address = decodeCfEmail(hex)
        return address ? `<a href="mailto:${address}">${address}</a>` : address
      },
    )
    .replace(
      /<span[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>[\s\S]*?<\/span>/g,
      (_match, hex: string) => decodeCfEmail(hex),
    )
}

/**
 * Injected into every served page. Written as plain ES5-safe script, in an
 * IIFE, with no dependency and no network call: it runs from `file://` too.
 */
export const RUNTIME = `<script id="prodops-runtime">
(function () {
  'use strict';

  /* ---- 1. the mobile navigation drawer -------------------------------- */
  function textLinks(selector) {
    var list = document.querySelectorAll(selector + ' a[href]');
    var out = [];
  for (var i = 0; i < list.length; i++) out.push(list[i]);
    return out;
  }

  function buildDrawer() {
    var toggle = document.querySelector('.ds-nav-toggle');
    if (!toggle || toggle.getAttribute('data-local-wired')) return;
    toggle.setAttribute('data-local-wired', '1');

    var panel = null;
    function ensurePanel() {
      if (panel) return panel;
      panel = document.createElement('div');
      panel.className = 'ds-nav-mobile';
      panel.id = 'local-nav-drawer';
      var links = textLinks('.ds-nav-desktop').concat(textLinks('.ds-nav-actions'));
      var ul = document.createElement('ul');
      for (var i = 0; i < links.length; i++) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.className = links[i].className;
        a.href = links[i].getAttribute('href');
        a.textContent = links[i].textContent;
        li.appendChild(a);
        ul.appendChild(li);
      }
      panel.appendChild(ul);
      toggle.parentNode.appendChild(panel);
      toggle.setAttribute('aria-controls', 'local-nav-drawer');
      return panel;
    }

    function close() {
      if (panel) panel.parentNode.removeChild(panel);
      panel = null;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
    }

    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      var open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) { close(); return; }
      var drawer = ensurePanel();
      drawer.addEventListener('click', function (e) {
        if (e.target && e.target.tagName === 'A') close();
      });
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel) close();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && panel) close();
    });
  }

  /* ---- 2. forms answer locally ---------------------------------------- */
  var FORM_NOTE = 'local-form-note';

  function note(form, message, tone) {
    var existing = form.parentNode.querySelector('.' + FORM_NOTE);
    if (existing) existing.parentNode.removeChild(existing);
    var p = document.createElement('p');
    p.className = FORM_NOTE;
    p.setAttribute('role', 'status');
    p.textContent = message;
    p.style.cssText =
      'margin:10px 0 0;font:500 12.5px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;' +
      (tone === 'error' ? 'color:#b4402a' : 'color:#4a7c4e');
    form.parentNode.insertBefore(p, form.nextSibling);
  }

  function wireForms() {
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        if (form.getAttribute('data-local-wired')) return;
        form.setAttribute('data-local-wired', '1');

        var gate = /access free|get free access|download|unlock|install/i.test(form.textContent || '');
        if (gate) {
          var card = document.createElement('div');
          card.setAttribute('data-local-gate', '1');
          card.style.cssText =
            'margin-top:14px;padding:14px 16px;border:1px dashed #d6cfc4;border-radius:12px;' +
            'font:500 13.5px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#4a463f';
          card.innerHTML =
            'Installed in this copy — no email, key or account needed. ' +
            '<a href="/workspace/" style="color:#c4471b;font-weight:600;text-decoration:none">Open the workspace →</a>';
          form.parentNode.insertBefore(card, form);
          form.parentNode.removeChild(form);
          return;
        }

        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var field = form.querySelector('input[type="email"], input[type="text"]');
          var value = field ? String(field.value || '').trim() : '';
          if (field && !value) {
            field.setAttribute('aria-invalid', 'true');
            note(form, 'Enter an email address first.', 'error');
            if (field.focus) field.focus();
            return;
          }
          if (field && value && value.indexOf('@') < 1) {
            field.setAttribute('aria-invalid', 'true');
            note(form, 'That does not look like an email address.', 'error');
            if (field.focus) field.focus();
            return;
          }
          if (field) field.removeAttribute('aria-invalid');
          try {
            var key = 'prodops.site.signups.v1';
            var list = JSON.parse(window.localStorage.getItem(key) || '[]');
            list.push({ email: value, at: new Date().toISOString() });
            window.localStorage.setItem(key, JSON.stringify(list));
            note(form, 'Saved in this browser — this copy has no server, so nothing was sent.');
          } catch (error) {
            note(form, 'This copy has no server, so nothing was sent.');
          }
          form.setAttribute('aria-busy', 'false');
        });
      })(forms[i]);
    }
  }

  /* ---- 3. the video players the capture never downloaded ---------------- */
  /**
   * Four pages open with a "Watch the demo" button whose body is a video player
   * whose file was never captured. The video swapper in clone.ts replaces the
   * player with a labelled panel; this makes the button around it honest —
   * disabled, renamed, and explaining itself on hover — instead of looking
   * clickable and doing nothing.
   */
  function wireVideos() {
    var notes = document.querySelectorAll('.prodops-video-note');
    for (var i = 0; i < notes.length; i++) {
      var button = notes[i].closest ? notes[i].closest('button') : null;
      if (!button || button.getAttribute('data-local-wired')) continue;
      button.setAttribute('data-local-wired', '1');
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('title', 'The teaser video was not part of the page capture');
      button.removeAttribute('aria-label');
      button.style.cursor = 'default';
      var label = button.querySelector('[aria-label="Watch the demo"]');
      if (label) label.remove();
    }
  }

  /* ---- 4. the motion the React app did -------------------------------- */
  /**
   * The real site fades its sections up as they scroll in and lights up its
   * buttons on hover; both were CSS-in-React, so the capture has neither and
   * the copy reads as a static document. This adds them back, conservatively:
   *
   *   - nothing is hidden until the script has run and set pe-motion on the
   *     document, so a page without JavaScript is fully visible;
   *   - anything the observer never sees is revealed by a timer anyway, so a
   *     broken observer can never leave a blank page;
   *   - prefers-reduced-motion opts out completely.
   */
  function wireMotion() {
    var root = document.documentElement;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var targets = document.querySelectorAll('main section, main article');
    if (!targets.length || !('IntersectionObserver' in window)) return;
    root.className += ' pe-motion';

    var reveal = function (node) {
      node.className = (node.className ? node.className + ' ' : '') + 'pe-in';
    };

    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          reveal(entries[i].target);
          observer.unobserve(entries[i].target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );
    for (var i = 0; i < targets.length; i++) observer.observe(targets[i]);

    // Belt and braces: whatever has not been seen within two seconds is shown.
    window.setTimeout(function () {
      for (var j = 0; j < targets.length; j++) reveal(targets[j]);
    }, 2000);
  }

  /* ---- 5. external links open safely ---------------------------------- */
  function wireLinks() {
    var links = document.querySelectorAll('a[href^="http"]');
    for (var i = 0; i < links.length; i++) {
      var url = links[i].getAttribute('href') || '';
      if (url.indexOf(window.location.origin) === 0) continue;
      links[i].setAttribute('target', '_blank');
      links[i].setAttribute('rel', 'noopener noreferrer');
    }
  }

  /* ---- 6. the workspace pill answers the keyboard ---------------------- */
  function wirePill() {
    var pill = document.getElementById('prodops-pill');
    if (!pill) return;
    var link = pill.querySelector('a');
    if (link) link.textContent = 'Open ProdOps';
  }

  function boot() {
    buildDrawer();
    wireForms();
    wireVideos();
    wireMotion();
    wireLinks();
    wirePill();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>`
