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

  /* ---- 2. the tools list becomes a browser ---------------------------- */
  /**
   * The captured tools page is a list of eight links: every "what does this
   * tool actually do" question costs a page load and a scroll. This turns the
   * list into a tab strip with one panel — click a tool, read its whole page
   * (all of its content, not a summary) in place, and only open the full page
   * if you want to keep it.
   *
   * The panel is filled from the page it belongs to, fetched once and cached,
   * so nothing is duplicated in the markup and nothing can drift. No script
   * means the original list is still there and still clickable.
   */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toolName() {
    var h1 = document.querySelector('main h1');
    return h1 ? String(h1.textContent || '').replace(/\\s+/g, ' ').trim() : '';
  }

  /** The install card, shared by the tool panel and every "Access Free" gate. */
  function installCard(name) {
    var box = document.createElement('div');
    box.className = 'prodops-install';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'How to install ' + (name || 'this tool'));
    box.innerHTML =
      '<h4>Access free — it is already installed</h4>' +
      '<ol>' +
      '<li>Open <a href="/workspace/">ProdOps</a>, the workspace beside this site.</li>' +
      '<li>Choose <strong>Tools</strong>, then <strong>' + escapeHtml(name || 'this tool') + '</strong>.</li>' +
      '<li>Work through its steps. Every file it names ships in the package, under <code>.agents/skills/</code>.</li>' +
      '</ol>' +
      '<p style="margin:0">No email, no account, no key: this copy has no server behind it, so nothing is sent.</p>' +
      '<div class="prodops-install-links">' +
      '<a href="/workspace/#tools">Open ProdOps →</a>' +
      '<a href="/agentcanon.html">One canon for skills →</a>' +
      '<a href="/tools.html">All eight tools →</a>' +
      '</div>';
    return box;
  }

  function wireTools() {
    var list = document.querySelector('.ds-listings');
    if (!list || list.getAttribute('data-local-wired')) return;
    var items = list.querySelectorAll('.ds-listing');
    if (items.length < 3) return;
    // .ds-listings is the site's generic listing class — articles, sessions and
    // the pro page use it too. Only the eight tool pages become tabs.
    var TOOL_PAGE = /^(prd-creator|skill-builder|ai-design-system|rails-react-template|agentcanon|favicon-creator|agent-os|design-os)(\\.html)?$/;
    for (var check = 0; check < items.length; check++) {
      var first = String(items[check].getAttribute('href') || '');
      if (first.indexOf('./') === 0) first = first.slice(2);
      if (!TOOL_PAGE.test(first)) return;
    }
    list.setAttribute('data-local-wired', '1');

    /* The browser is the tool page, laid out the way the tool page lays itself
       out: the captured documentation sidebar on the left, the article on the
       right, and the tab strip across the top of that article. Same classes,
       same CSS, so it reads as the site and not as something bolted onto it. */
    var strip = document.createElement('div');
    strip.className = 'prodops-tabstrip';
    strip.setAttribute('role', 'tablist');
    strip.setAttribute('aria-label', 'The eight free tools');

    var head = document.createElement('div');
    head.className = 'prodops-panel-head';

    var body = document.createElement('div');
    body.className = 'body-content';

    var article = document.createElement('article');
    article.className = 'ds-docs-article';
    article.id = 'prodops-toolpanel';
    article.setAttribute('role', 'tabpanel');
    article.setAttribute('tabindex', '0');
    article.appendChild(head);
    article.appendChild(body);

    var sidebar = document.createElement('aside');
    sidebar.className = 'ds-docs-sidebar';
    sidebar.setAttribute('aria-label', 'On this page');

    var main = document.createElement('div');
    main.className = 'prodops-docs-main';
    main.appendChild(strip);
    main.appendChild(article);

    var layout = document.createElement('div');
    layout.className = 'ds-wide ds-docs-layout prodops-browser';
    layout.appendChild(sidebar);
    layout.appendChild(main);

    var cache = {};
    var tabs = [];
    var current = 0;

    function tabTitle() {
      return tabs[current] ? tabs[current].getAttribute('data-title') : toolName();
    }

    /* The panel holds a whole page inside a page, so the anchored headings it
       brings get a prefix and the copied sidebar is repointed at them; without
       this the panel's #installation and the tool page's own #installation would
       share an id and the links would jump to the wrong copy. */
    function scopeIds() {
      var ids = body.querySelectorAll('[id]');
      for (var n = 0; n < ids.length; n++) ids[n].id = 'prodops-panel-' + ids[n].id;
      var links = sidebar.querySelectorAll('a[href^="#"]');
      for (var l = 0; l < links.length; l++) {
        var target = links[l].getAttribute('href').slice(1);
        links[l].setAttribute('href', '#prodops-panel-' + target);
        links[l].removeAttribute('aria-current');
        if (target === firstSection) links[l].setAttribute('aria-current', 'location');
        links[l].addEventListener('click', function () {
          var all = sidebar.querySelectorAll('a[href^="#"]');
          for (var a = 0; a < all.length; a++) all[a].removeAttribute('aria-current');
          this.setAttribute('aria-current', 'location');
          markPillHeights();
        });
      }
      markPillHeights();
    }

    var firstSection = '';

    function paint(entry) {
      head.innerHTML = entry.head;
      body.innerHTML = entry.body;
      sidebar.innerHTML = entry.side;
      // The sidebar's own "current" was captured on the tool page; the panel
      // starts at the top of the copy, so the first anchor is the honest one.
      var firstLink = sidebar.querySelector('a[href^="#"]');
      firstSection = firstLink ? firstLink.getAttribute('href').slice(1) : '';
      // A copied page's email gates would post nowhere from in here; the
      // installation section that follows each of them already says how to get
      // the tool, so the form and its card come out.
      var forms = body.querySelectorAll('form');
      for (var f = 0; f < forms.length; f++) {
        var card = forms[f].closest ? forms[f].closest('.ds-card') : null;
        var drop = card || forms[f];
        if (drop.parentNode) drop.parentNode.removeChild(drop);
      }
      scopeIds();
      article.setAttribute('aria-labelledby', tabs[current].id);
    }

    function fallback(tab) {
      paint({
        head:
          '<div><p class="prodops-panel-kind">Free tool</p><h2>' +
          escapeHtml(tab.getAttribute('data-title')) +
          '</h2></div><a href="' + escapeHtml(tab.getAttribute('data-href')) + '">Open the full page →</a>',
        body:
          '<p class="prodops-panel-loading">This page could not be read into the browser. ' +
          '<a href="' + escapeHtml(tab.getAttribute('data-href')) + '">Open it instead →</a></p>',
        side: '',
      });
      article.setAttribute('aria-labelledby', tab.id);
    }

    function select(index, focus) {
      if (!tabs.length) return;
      current = index;
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].setAttribute('aria-selected', i === index ? 'true' : 'false');
        tabs[i].setAttribute('tabindex', i === index ? '0' : '-1');
      }
      if (focus && tabs[index].focus) tabs[index].focus();
      var href = tabs[index].getAttribute('data-href');
      if (cache[href]) {
        paint(cache[href]);
        return;
      }
      head.innerHTML = '<h2>' + escapeHtml(tabs[index].getAttribute('data-title')) + '</h2>';
      body.innerHTML = '<p class="prodops-panel-loading">Loading ' + escapeHtml(tabTitle()) + '…</p>';
      if (!window.fetch) {
        fallback(tabs[index]);
        return;
      }
      var asked = index;
      window
        .fetch(href)
        .then(function (response) { return response.text(); })
        .then(function (html) {
          var doc = new window.DOMParser().parseFromString(html, 'text/html');
          var page = doc.querySelector('article.ds-docs-article') || doc.querySelector('main article');
          var copy = page ? (page.querySelector('.body-content') || page) : doc.querySelector('main');
          var sideEl = doc.querySelector('aside.ds-docs-sidebar');
          var content = copy ? copy.innerHTML : '';
          if (!content) {
            if (asked === current) fallback(tabs[current]);
            return;
          }
          var kindEl = items[asked] ? items[asked].querySelector('.ds-listing-label') : null;
          var entry = {
            head:
              '<div><p class="prodops-panel-kind">' +
              escapeHtml(kindEl ? String(kindEl.textContent || '').trim() : 'Free tool') +
              '</p><h2>' + escapeHtml(tabs[asked].getAttribute('data-title')) + '</h2></div>' +
              '<a href="' + escapeHtml(href) + '">Open the full page →</a>',
            body: content,
            side: sideEl ? sideEl.innerHTML : '',
          };
          cache[href] = entry;
          if (asked === current) paint(entry);
        })
        .catch(function () {
          if (asked === current) fallback(tabs[current]);
        });
    }

    for (var i = 0; i < items.length; i++) {
      (function (item, index) {
        var title = item.querySelector('h3');
        var href = item.getAttribute('href');
        var name = title ? String(title.textContent || '').trim() : 'Tool ' + (index + 1);
        var tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'prodops-tab';
        tab.id = 'prodops-tab-' + index;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        tab.setAttribute('aria-controls', 'prodops-toolpanel');
        tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
        tab.setAttribute('data-href', href);
        tab.setAttribute('data-title', name);
        tab.textContent = name;
        tab.addEventListener('click', function () { select(index, false); });
        tab.addEventListener('keydown', function (event) {
          var key = event.key;
          if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
          event.preventDefault();
          var next = key === 'ArrowRight' ? (index + 1) % tabs.length
            : key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
            : key === 'Home' ? 0 : tabs.length - 1;
          select(next, true);
        });
        strip.appendChild(tab);
        tabs.push(tab);
      })(items[i], i);
    }

    /* The panel's sidebar reopens as a <details> below 1024px; the summary is
       deliberately left as captured, it needs no measuring. */
    function markPillHeights() {}

    /* The browser needs the capture's docs measure (1040px), not the listing's
       720px column, so it goes above the section that holds the list — still on
       the page, still in the site's own rhythm — and the list stays underneath:
       the page keeps everything it had and gains the tabs. */
    var holderSection = document.createElement('section');
    holderSection.className = 'prodops-tools-browser';
    holderSection.setAttribute('aria-label', 'Read a tool before you open it');
    var wide = document.createElement('div');
    wide.className = 'ds-wide';
    wide.appendChild(layout);
    holderSection.appendChild(wide);
    var anchor = list.closest ? list.closest('section') : null;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(holderSection, anchor);
    else list.parentNode.insertBefore(holderSection, list);
    select(0, false);
  }

  /* ---- 3. forms answer locally ---------------------------------------- */
  var FORM_NOTE = 'local-form-note';

  /** Is this the "Access Free" gate rather than a newsletter sign-up? */
  function isGate(form) {
    var around = String(form.getAttribute('aria-label') || '');
    var node = form.parentNode;
    for (var depth = 0; node && depth < 3; depth++) {
      around += ' ' + String(node.textContent || '');
      node = node.parentNode;
    }
    return /access free|get free access|instant access|installation instructions|free & open source/i.test(around);
  }

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

        if (isGate(form)) {
          // The gate is a promise: press it and you get the tool. Keep the
          // button, keep the promise, drop the email — the instructions are
          // already on the page, and this reveals them.
          var name = toolName();
          var submit = form.querySelector('button');
          var label = (submit && (submit.getAttribute('aria-label') || submit.textContent)) || 'Access Free';
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'prodops-access';
          // The capture's own label is "Access Free"; an icon-only button has no
          // words of its own, so the label comes from the sentence above it.
          button.textContent = String(label).replace(/\\s+/g, ' ').trim() || 'Access Free';
          button.setAttribute('aria-expanded', 'false');
          var card = installCard(name);
          card.hidden = true;
          // The full instructions are further down the page, written for this
          // package. They are always visible; the button takes the reader there
          // and marks the section, instead of promising a download that this
          // copy cannot serve.
          var full = document.getElementById('prodops-install');
          if (full) button.setAttribute('aria-controls', 'prodops-install');
          button.addEventListener('click', function () {
            if (full) {
              // Not every environment can scroll a node (jsdom cannot); the
              // jump is a courtesy, the flash and the focus are the message.
              if (full.scrollIntoView) {
                try { full.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (error) { full.scrollIntoView(); }
              }
              full.classList.remove('prodops-flash');
              // Force a reflow so the animation restarts on a second press.
              void full.offsetWidth;
              full.classList.add('prodops-flash');
              var head = full.querySelector('h3') || full;
              if (head.setAttribute) head.setAttribute('tabindex', '-1');
              if (head.focus) head.focus();
              return;
            }
            card.hidden = !card.hidden;
            button.setAttribute('aria-expanded', card.hidden ? 'false' : 'true');
            if (!card.hidden) {
              var first = card.querySelector('a');
              if (first && first.focus) first.focus();
            }
          });
          var holder = document.createElement('div');
          holder.className = 'prodops-gate';
          holder.appendChild(button);
          if (!full) holder.appendChild(card);
          form.parentNode.replaceChild(holder, form);
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
    wireTools();
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
