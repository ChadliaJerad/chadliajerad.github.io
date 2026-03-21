// ─── State ────────────────────────────────────────────────────────────────────
let currentVersion = 'long';
const yamlCache = {};
let bibCache = null;   // parsed bib entries, loaded once

// Tabs that respect the short/long toggle
const VERSION_TABS = new Set(['publications', 'initiatives', 'supervision', 'services', 'experience']);

// ─── Version Toggle ───────────────────────────────────────────────────────────
function buildVersionToggle(tabName) {
    if (!VERSION_TABS.has(tabName)) return '';
    return `
    <div class="tab-header">
      <div id="version-toggle">
        <button class="version-btn ${currentVersion==='short'?'active':''}" data-v="short">Short</button>
        <button class="version-btn ${currentVersion==='long' ?'active':''}" data-v="long">Long</button>
      </div>
    </div>`;
}

function attachToggleListeners() {
    const toggle = document.getElementById('version-toggle');
    if (!toggle) return;
    toggle.querySelectorAll('.version-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentVersion = btn.dataset.v;
            const active = document.querySelector('.tab.active');
            if (active) loadTab(active.dataset.tab, false);
        });
    });
}

// ─── YAML loader (cached) ─────────────────────────────────────────────────────
async function loadYaml(name) {
    if (yamlCache[name]) return yamlCache[name];
    const res = await fetch(`assets/data/${name}.yaml?ts=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${name}.yaml`);
    yamlCache[name] = jsyaml.load(await res.text());
    return yamlCache[name];
}

// ─── BIB loader (cached) ──────────────────────────────────────────────────────
async function loadBib() {
    if (bibCache) return bibCache;
    const res = await fetch(`assets/publications.bib?ts=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading publications.bib`);
    bibCache = BibParser.parse(await res.text());
    return bibCache;
}

// ─── Tab loader ───────────────────────────────────────────────────────────────
async function loadTab(name, push = true) {
    const main = document.getElementById('main');
    main.innerHTML = `<p class="loading">Loading ${name}…</p>`;

    try {
        let html;

        if (name === 'publications') {
            // Load YAML (version flags) + BIB (metadata) in parallel
            const [pubYaml, bibEntries] = await Promise.all([loadYaml('publications'), loadBib()]);
            html = window.Renderers.publications_bib(pubYaml, bibEntries, currentVersion);
        } else {
            const data = await loadYaml(name);
            const renderer = window.Renderers && window.Renderers[name];
            if (!renderer) throw new Error(`No renderer for tab: ${name}`);
            html = renderer(data, currentVersion);
        }

        main.innerHTML = buildVersionToggle(name) + html;
        attachToggleListeners();
        document.querySelectorAll('.tab').forEach(t =>
            t.classList.toggle('active', t.dataset.tab === name));
        if (push) history.pushState({ tab: name }, '', `#${name}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        console.error('Failed to load tab:', name, err);
        main.innerHTML = `
            <div class="load-error">
                <p>Unable to load <strong>${name}</strong>.</p>
                <p>${err.message}</p>
            </div>`;
    }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        tab.setAttribute('tabindex', '0');
        tab.addEventListener('click', () => loadTab(tab.dataset.tab, true));
        tab.addEventListener('keydown', e => {
            let next;
            if      (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (e.key === 'ArrowLeft')  next = (index - 1 + tabs.length) % tabs.length;
            if (next !== undefined) { tabs[next].click(); tabs[next].focus(); }
        });
    });

    const initial = (location.hash || '#about').slice(1);
    const target  = document.querySelector(`.tab[data-tab="${initial}"]`) ||
                    document.querySelector('.tab[data-tab="about"]');
    target.classList.add('active');
    loadTab(target.dataset.tab, false);

    window.addEventListener('popstate', e => {
        const name = (e.state && e.state.tab) || (location.hash || '#about').slice(1);
        loadTab(name, false);
    });
});
