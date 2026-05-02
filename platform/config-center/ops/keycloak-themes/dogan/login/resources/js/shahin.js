/*
  Shahin / Dogan Keycloak login theme — progressive enhancements.

  Kept deliberately small and dependency-free. Keycloak's server-rendered
  form + server-side validation remain authoritative; this script only
  adds client-side affordances:

    1. Show / hide password toggle on every password field.
    2. Live password strength meter on new-password fields.
    3. Email typo suggestion ("did you mean …@gmail.com?") on email
       fields, accepting with one click.
    4. Submit-button loading state so double-clicks are visually blocked.

  Falls back gracefully if any feature fails (try/catch around each
  enhancer).
*/

(function () {
  'use strict';

  if (typeof document === 'undefined') return;

  const i18n = {
    en: {
      show:   'Show',
      hide:   'Hide',
      weak:   'Weak',
      fair:   'Fair',
      good:   'Good',
      strong: 'Strong',
      typo:   'Did you mean',
      apply:  'use',
      policyTitle: 'Your password must include:',
      policyLength: 'At least 12 characters',
      policyUpper:  'One uppercase letter (A–Z)',
      policyLower:  'One lowercase letter (a–z)',
      policyDigit:  'One digit (0–9)',
      policySpecial:'One special character (e.g. !@#$%)',
      policyNotEmail: 'Different from your email'
    },
    ar: {
      show:   'إظهار',
      hide:   'إخفاء',
      weak:   'ضعيفة',
      fair:   'مقبولة',
      good:   'جيدة',
      strong: 'قوية',
      typo:   'هل تقصد',
      apply:  'استخدم',
      policyTitle: 'يجب أن تتضمن كلمة المرور:',
      policyLength: '12 حرفًا على الأقل',
      policyUpper:  'حرفًا كبيرًا (A–Z)',
      policyLower:  'حرفًا صغيرًا (a–z)',
      policyDigit:  'رقمًا (0–9)',
      policySpecial:'رمزًا خاصًا (مثل !@#$%)',
      policyNotEmail: 'مختلفة عن بريدك الإلكتروني'
    }
  };

  const lang = (document.documentElement.lang || 'en').slice(0, 2);
  const t = i18n[lang] || i18n.en;

  // ───────────────────────── 1. show/hide password ─────────────────────────
  function enhancePasswordFields() {
    const pwds = document.querySelectorAll('input[type="password"]');
    pwds.forEach(function (input) {
      if (input.dataset.doganEnhanced === '1') return;
      input.dataset.doganEnhanced = '1';

      // Wrap in a relative container if it isn't already
      const parent = input.parentElement;
      if (!parent) return;
      let wrap = input.closest('.dogan-password-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'dogan-password-wrap';
        parent.insertBefore(wrap, input);
        wrap.appendChild(input);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dogan-password-toggle';
      btn.setAttribute('aria-label', t.show);
      btn.textContent = t.show;
      btn.addEventListener('click', function () {
        const shown = input.type === 'text';
        input.type = shown ? 'password' : 'text';
        btn.textContent = shown ? t.show : t.hide;
        btn.setAttribute('aria-label', shown ? t.show : t.hide);
        input.focus();
      });
      wrap.appendChild(btn);
    });
  }

  // ───────────────────────── 2. strength meter ─────────────────────────
  // Heuristic scoring — length, class mix, common-password gut check.
  // Any server-side policy still wins on submit; this is UX, not policy.
  const COMMON = [
    'password', 'password1', '12345678', 'qwerty123', 'letmein',
    'admin123', 'welcome1', 'iloveyou', '111111111', '123123123'
  ];

  function scorePassword(pw) {
    if (!pw) return 0;
    const lower = pw.toLowerCase();
    if (COMMON.indexOf(lower) !== -1) return 1;

    let score = 0;
    if (pw.length >= 8)  score += 1;
    if (pw.length >= 12) score += 1;
    if (pw.length >= 16) score += 1;
    if (/[a-z]/.test(pw)) score += 0.5;
    if (/[A-Z]/.test(pw)) score += 0.5;
    if (/\d/.test(pw))    score += 0.5;
    if (/[^\w\s]/.test(pw)) score += 0.5;

    const level = Math.max(1, Math.min(4, Math.floor(score)));
    return level;
  }

  function labelForLevel(level) {
    return [t.weak, t.weak, t.fair, t.good, t.strong][level] || t.weak;
  }

  function enhanceNewPasswordMeter() {
    // Only attach to "new password" fields — not the sign-in password.
    const selectors = [
      'input[name="password-new"]',
      'input[id="password-new"]',
      'input[name="password"][autocomplete="new-password"]',
      'input[id="password"][autocomplete="new-password"]'
    ];
    const input = document.querySelector(selectors.join(','));
    if (!input || input.dataset.doganMeter === '1') return;
    input.dataset.doganMeter = '1';

    const meter = document.createElement('div');
    meter.className = 'dogan-strength';
    meter.setAttribute('aria-live', 'polite');
    meter.innerHTML =
      '<div class="dogan-strength-track"><div class="dogan-strength-fill"></div></div>' +
      '<span class="dogan-strength-label"></span>';

    (input.closest('.dogan-password-wrap') || input.parentElement).insertAdjacentElement('afterend', meter);

    const label = meter.querySelector('.dogan-strength-label');

    input.addEventListener('input', function () {
      const level = scorePassword(input.value);
      meter.setAttribute('data-level', String(level));
      label.textContent = input.value ? labelForLevel(level) : '';
    });
  }

  // ───────────────── 2b. password policy checklist ─────────────────
  // Mirrors the realm passwordPolicy on auth.shahin-ai.com:
  //   length(12) upperCase(1) lowerCase(1) digits(1) specialChars(1) notUsername
  // Server-side policy still wins on submit; this is a live hint so the user
  // knows which rules they have/haven't met before clicking submit.
  function enhancePasswordPolicyHint() {
    const selectors = [
      'input[name="password-new"]',
      'input[id="password-new"]',
      'input[name="password"][autocomplete="new-password"]',
      'input[id="password"][autocomplete="new-password"]'
    ];
    const input = document.querySelector(selectors.join(','));
    if (!input || input.dataset.doganPolicy === '1') return;
    input.dataset.doganPolicy = '1';

    const email = document.querySelector('input[name="email"], input[type="email"], input[name="username"]');

    const rules = [
      { key: 'length',   label: t.policyLength,   test: function (pw) { return pw.length >= 12; } },
      { key: 'upper',    label: t.policyUpper,    test: function (pw) { return /[A-Z]/.test(pw); } },
      { key: 'lower',    label: t.policyLower,    test: function (pw) { return /[a-z]/.test(pw); } },
      { key: 'digit',    label: t.policyDigit,    test: function (pw) { return /\d/.test(pw); } },
      { key: 'special',  label: t.policySpecial,  test: function (pw) { return /[^A-Za-z0-9\s]/.test(pw); } },
      { key: 'notEmail', label: t.policyNotEmail, test: function (pw) {
          const u = (email && email.value || '').trim().toLowerCase();
          return pw.length > 0 && (!u || pw.toLowerCase() !== u);
        } }
    ];

    const panel = document.createElement('div');
    panel.className = 'dogan-policy';
    panel.setAttribute('aria-live', 'polite');

    const title = document.createElement('div');
    title.className = 'dogan-policy-title';
    title.textContent = t.policyTitle;
    panel.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'dogan-policy-list';
    rules.forEach(function (rule) {
      const li = document.createElement('li');
      li.className = 'dogan-policy-item';
      li.dataset.rule = rule.key;
      li.dataset.met = '0';
      li.setAttribute('aria-label', rule.label);
      const icon = document.createElement('span');
      icon.className = 'dogan-policy-icon';
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.className = 'dogan-policy-text';
      text.textContent = rule.label;
      li.appendChild(icon);
      li.appendChild(text);
      list.appendChild(li);
      rule.li = li;
    });
    panel.appendChild(list);

    // Anchor after the strength meter if present, else after the input wrap.
    const anchor = document.querySelector('.dogan-strength')
      || input.closest('.dogan-password-wrap')
      || input.parentElement;
    if (anchor) anchor.insertAdjacentElement('afterend', panel);

    function refresh() {
      const pw = input.value || '';
      rules.forEach(function (rule) {
        const ok = rule.test(pw);
        rule.li.dataset.met = ok ? '1' : '0';
      });
    }

    input.addEventListener('input', refresh);
    if (email) email.addEventListener('input', refresh);
    refresh();
  }

  // ───────────────────────── 3. email typo hint ─────────────────────────
  const DOMAINS = [
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com',
    'yahoo.com', 'icloud.com', 'me.com', 'protonmail.com',
    'shahin-ai.com', 'dogan-ai.com'
  ];

  // Simple Damerau–Levenshtein distance, capped at 3 for efficiency.
  function editDistance(a, b) {
    if (a === b) return 0;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 3) return 99;
    const prev = new Array(lb + 1), curr = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
      curr[0] = i;
      for (let j = 1; j <= lb; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= lb; j++) prev[j] = curr[j];
    }
    return curr[lb];
  }

  function suggestDomain(domain) {
    if (!domain) return null;
    if (DOMAINS.indexOf(domain) !== -1) return null;
    let best = null, bestDist = 99;
    for (let i = 0; i < DOMAINS.length; i++) {
      const d = editDistance(domain, DOMAINS[i]);
      if (d < bestDist) { best = DOMAINS[i]; bestDist = d; }
    }
    return (best && bestDist > 0 && bestDist <= 2) ? best : null;
  }

  function enhanceEmailTypoHint() {
    const inputs = document.querySelectorAll('input[type="email"], input[name="email"], input[name="username"][type="text"]');
    inputs.forEach(function (input) {
      if (input.dataset.doganEmailHint === '1') return;
      input.dataset.doganEmailHint = '1';

      const hint = document.createElement('div');
      hint.className = 'dogan-email-hint';
      hint.setAttribute('aria-live', 'polite');
      input.insertAdjacentElement('afterend', hint);

      input.addEventListener('blur', function () {
        hint.classList.remove('show');
        hint.innerHTML = '';
        const val = (input.value || '').trim();
        const at = val.indexOf('@');
        if (at < 1 || at === val.length - 1) return;
        const local = val.slice(0, at);
        const domain = val.slice(at + 1).toLowerCase();
        const suggestion = suggestDomain(domain);
        if (!suggestion) return;
        const full = local + '@' + suggestion;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = full;
        btn.addEventListener('click', function () {
          input.value = full;
          hint.classList.remove('show');
          input.focus();
        });
        hint.append(t.typo + ' ');
        hint.appendChild(btn);
        hint.append(' — ' + t.apply);
        hint.classList.add('show');
      });

      input.addEventListener('input', function () {
        hint.classList.remove('show');
      });
    });
  }

  // ───────── 4. auto-compose Full Name from First + Last ─────────
  // UX: user types `firstName` + `lastName`; we silently keep the
  // `userName` (Your full name) field in sync so they don't have to
  // retype. The moment the user edits userName directly we stop
  // auto-composing. If userName already has a value on page load
  // (e.g. after a failed submit) we treat that as user-edited.
  function enhanceAutoFullName() {
    const first = document.querySelector('input[name="firstName"]');
    const last  = document.querySelector('input[name="lastName"]');
    const full  = document.querySelector('input[name="userName"]');
    if (!first || !last || !full) return;
    if (full.dataset.shahinAutoInit === '1') return;
    full.dataset.shahinAutoInit = '1';

    const initiallyEmpty = !full.value || !full.value.trim();
    full.dataset.shahinAuto = initiallyEmpty ? '1' : '0';

    // Inline hint under the field — disappears once the user edits it.
    const hint = document.createElement('small');
    hint.className = 'shahin-auto-hint';
    hint.textContent = (lang === 'ar')
      ? 'يُملأ تلقائيًا من الاسم الأول والأخير — يمكنك التعديل'
      : 'Auto-filled from first + last name — you can edit';
    hint.dataset.state = initiallyEmpty ? 'auto' : 'user-edited';
    full.insertAdjacentElement('afterend', hint);

    function compose() {
      if (full.dataset.shahinAuto !== '1') return;
      const parts = [first.value.trim(), last.value.trim()].filter(Boolean);
      full.value = parts.join(' ');
    }

    first.addEventListener('input', compose);
    last.addEventListener('input', compose);

    // A real user edit (trusted event) turns auto-compose off.
    ['input', 'change', 'paste'].forEach(function (evt) {
      full.addEventListener(evt, function (e) {
        if (e && e.isTrusted === false) return;
        full.dataset.shahinAuto = '0';
        hint.dataset.state = 'user-edited';
      });
    });

    // First pass — covers re-render after a failed submit where
    // first/last already carry values but userName was cleared.
    compose();
  }

  // ───────── 5. submit loading state ─────────
  function enhanceSubmitLoading() {
    const forms = document.querySelectorAll('form');
    forms.forEach(function (form) {
      if (form.dataset.doganLoading === '1') return;
      form.dataset.doganLoading = '1';
      form.addEventListener('submit', function () {
        form.classList.add('dogan-loading');
        const btn = form.querySelector('input[type="submit"], button[type="submit"]');
        if (btn) btn.setAttribute('aria-busy', 'true');
      });
    });
  }

  function init() {
    try { enhancePasswordFields(); }    catch (_) { /* non-critical */ }
    try { enhanceNewPasswordMeter(); }  catch (_) { /* non-critical */ }
    try { enhancePasswordPolicyHint(); } catch (_) { /* non-critical */ }
    try { enhanceEmailTypoHint(); }     catch (_) { /* non-critical */ }
    try { enhanceAutoFullName(); }      catch (_) { /* non-critical */ }
    try { enhanceSubmitLoading(); }     catch (_) { /* non-critical */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
