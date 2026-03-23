// Static site — tab switching + version toggle only (no YAML/BibTeX loading)

const VERSION_TABS = new Set(['publications', 'initiatives', 'advising', 'commitment', 'experience']);
let currentVersion = 'short';

// ── Tab switching ─────────────────────────────────────────────────────────────
function showTab(name, push) {
    // Hide all sections
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    // Show target
    const section = document.getElementById('tab-' + name);
    if (section) section.classList.add('active');

    // Update nav highlight
    document.querySelectorAll('.tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === name));

    // Show/hide version toggle bar
    const bar = document.getElementById('version-toggle-bar');
    if (bar) bar.style.display = VERSION_TABS.has(name) ? 'block' : 'none';

    if (push) history.pushState({ tab: name }, '', '#' + name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Version toggle ────────────────────────────────────────────────────────────
function setVersion(v) {
    currentVersion = v;
    document.body.dataset.version = v;
    document.querySelectorAll('.version-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.v === v));
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');

    tabs.forEach((tab, index) => {
        tab.setAttribute('tabindex', '0');
        tab.addEventListener('click', () => showTab(tab.dataset.tab, true));
        tab.addEventListener('keydown', e => {
            let next;
            if      (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (e.key === 'ArrowLeft')  next = (index - 1 + tabs.length) % tabs.length;
            if (next !== undefined) { tabs[next].click(); tabs[next].focus(); }
        });
    });

    document.querySelectorAll('.version-btn').forEach(btn => {
        btn.addEventListener('click', () => setVersion(btn.dataset.v));
    });

    setVersion(currentVersion);
    const initial = (location.hash || '#about').slice(1);
    showTab(initial, false);

    window.addEventListener('popstate', e => {
        const name = (e.state && e.state.tab) || (location.hash || '#about').slice(1);
        showTab(name, false);
    });
});
