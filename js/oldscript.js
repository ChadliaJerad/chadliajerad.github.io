// Tab Navigation Functionality - dynamic tab loading from /tabs/*.html
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const main = document.getElementById('main');

    async function loadTab(name, push = true) {
        console.log('loadTab called for', name, { push });
        // Show loading state while fetching
        main.innerHTML = `<p class="loading">Loading ${name}…</p>`;

        try {
            if (location.protocol === 'file:') {
                // Offline mode: read from embedded <template> elements
                const tpl = document.getElementById(`tpl-${name}`);
                if (!tpl) {
                    console.error(`Template not found: tpl-${name}`);
                    throw new Error('template-not-found');
                }
                main.innerHTML = tpl.innerHTML;
            } else {
                // Add a timestamp query to avoid cached responses during debugging
                const url = `tabs/${name}.html?ts=${Date.now()}`;
                console.log('Fetching', url);
                const res = await fetch(url);
                console.log('Fetch response for', name, res.status, res.url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const html = await res.text();
                main.innerHTML = html;
            }

            // Update active tab classes
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));

            // Update hash (use push only when triggered by click)
            if (push) location.hash = `#${name}`;

            // Move focus to main for accessibility
            main.focus();
        } catch (err) {
            console.error('Failed to load tab:', name, err);

            if (location.protocol === 'file:') {
                main.innerHTML = `
                    <div class="load-error">
                        <p>Unable to load <strong>${name}</strong> from the offline templates.</p>
                        <p>This usually means the page doesn't include a fallback template for that tab (developer note: add a &lt;template id="tpl-${name}"&gt; block to <code>index.html</code>).</p>
                    </div>
                `;
            } else {
                main.innerHTML = `
                    <div class="load-error">
                        <p>Unable to load <strong>${name}</strong>.</p>
                        <p>Common causes: the server returned an error. Check DevTools → Network for details.</p>
                    </div>
                `;
            }
        }
    }

    // Click and keyboard navigation
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => loadTab(tab.dataset.tab, true));

        tab.addEventListener('keydown', function(e) {
            let newIndex;
            if (e.key === 'ArrowRight') {
                newIndex = (index + 1) % tabs.length;
                tabs[newIndex].click();
                tabs[newIndex].focus();
            } else if (e.key === 'ArrowLeft') {
                newIndex = (index - 1 + tabs.length) % tabs.length;
                tabs[newIndex].click();
                tabs[newIndex].focus();
            }
        });

        tab.setAttribute('tabindex', '0');
    });

    // Initial load based on hash, default to 'about'
    const initial = (location.hash || '#about').slice(1);
    const initialTab = document.querySelector(`.tab[data-tab="${initial}"]`);
    if (initialTab) {
        initialTab.classList.add('active');
        loadTab(initial, false);
    } else {
        document.querySelector('.tab[data-tab="about"]').classList.add('active');
        loadTab('about', false);
    }

    // Handle back/forward navigation
    window.addEventListener('hashchange', () => {
        const name = (location.hash || '#about').slice(1);
        loadTab(name, false);
    });
});