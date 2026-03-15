// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Return true if item should be shown for the current version
function visible(item, version) {
    if (!item.versions) return true;           // no filter → always show
    return item.versions.includes(version);
}

function eventBlock(date, role, detailsHtml) {
    return `
    <div class="event">
        <div class="date">${esc(date)}</div>
        <div class="role">${esc(role)}</div>
        ${detailsHtml ? `<div class="details">${detailsHtml}</div>` : ''}
    </div>`;
}

// ─── About ───────────────────────────────────────────────────────────────────

function renderAbout(data) {
    const edu = (data.education || []).map(e => `
        <li>
            <strong>${esc(e.degree)}</strong> — ${esc(e.institution)}, ${esc(e.country)} (${esc(e.year)})
            ${e.topic ? `<br><em>${esc(e.topic)}</em>` : ''}
            ${e.distinction ? ` — Distinction: ${esc(e.distinction)}` : ''}
        </li>`).join('');

    const news = (data.recent_news || []).map(n => `
        <div class="research-area">
            <strong>${esc(n.date)}:</strong> ${esc(n.text)}
        </div>`).join('');

    const interests = (data.areas_of_interest || []).map(i =>
        `<li>${esc(i)}</li>`).join('');

    return `
    <h2>About Me</h2>
    <div style="display:flex;gap:2rem;align-items:flex-start;margin-bottom:1rem;">
        <div style="flex:2;">
            <p style="margin:0 0 1rem 0;">${esc(data.about)}</p>
            <h3 style="margin-top:0;">Areas of Interest</h3>
            <ul style="margin-left:2rem;margin-top:0.5rem;">${interests}</ul>
        </div>
        <div style="flex: 1;">
        <img src="../images/ChadliaJerad.JPG" alt="profile-img" style="width: 100%; height: auto; border-radius: 8px;">
    </div>
    </div>

    <h3>Education</h3>
    <ul style="margin-left:2rem;margin-top:0.5rem;">${edu}</ul>

    <h3>Recent News</h3>
    ${news}

    <h3>Short Bio</h3>
    <p>${esc(data.short_bio)}</p>`;
}

// ─── Experience ───────────────────────────────────────────────────────────────

function renderExperience(data, version) {
    function positionBlock(p) {
        if (!visible(p, version)) return '';
        const details = p.details ? p.details.map(d => `<p>${esc(d)}</p>`).join('') : '';
        return eventBlock(p.period, `${p.role} — ${p.institution}${p.country ? ', ' + p.country : ''}`, details);
    }

    const positions = (data.positions || []).map(positionBlock).join('');

    const stays = (data.stays_abroad || []).map(s => {
        if (!visible(s, version)) return '';
        let detail = '';
        if (s.project) detail += `<p>Project: ${esc(s.project)}</p>`;
        if (s.funder)  detail += `<p>Funded by: ${esc(s.funder)}</p>`;
        return eventBlock(s.period, `${esc(s.type)} — ${esc(s.institution)}, ${esc(s.country)}`, detail);
    }).join('');

    return `
    <h2>Experience</h2>
    <h3>Academic &amp; Professional Positions</h3>
    ${positions}
    <h3>Research Visits &amp; Stays Abroad</h3>
    ${stays}`;
}

// ─── Teaching ─────────────────────────────────────────────────────────────────

function renderTeaching(data) {
    // Split: current ENSI courses vs guest/past
    const current = (data.courses || []).filter(c => !c.period && !c.role);
    const guest   = (data.courses || []).filter(c => c.role === 'Invited Lecturer');
    const past    = (data.courses || []).filter(c => c.period && c.role !== 'Invited Lecturer');

    function courseCard(c) {
        const lang = c.language ? ` <span style="color:#2a5298;font-size:0.85rem;">[${esc(c.language)}]</span>` : '';
        const note = c.note ? `<p style="color:#666;font-size:0.9rem;margin-top:0.3rem;">${esc(c.note)}</p>` : '';
        return `
        <div class="research-area">
            <strong>${esc(c.title)}</strong>${lang} — ${esc(c.level)}
            ${note}
        </div>`;
    }

    const guestBlocks = guest.map(c => eventBlock(c.period, `${esc(c.title)} — ${esc(c.institution)}`,
        `<p>${esc(c.level)}</p>`)).join('');

    const pastList = past.map(c =>
        `<li>${esc(c.title)} (${esc(c.level)}) — ${esc(c.institution)} (${esc(c.period)})</li>`).join('');

    return `
    <h2>Teaching</h2>
    <h3>Current Courses — ENSI, University of Manouba</h3>
    <p style="margin-bottom:1rem;color:#555;font-size:0.95rem;">Classes marked [English] are taught in English, based on EECS 149/249A at UC Berkeley.</p>
    ${current.map(courseCard).join('')}
    <h3>Guest &amp; Invited Lectures</h3>
    ${guestBlocks}
    <h3>Previously Taught</h3>
    <ul style="margin-left:2rem;margin-top:0.5rem;">${pastList}</ul>`;
}

// ─── Initiatives ──────────────────────────────────────────────────────────────

function renderInitiatives(data, version) {
    const blocks = (data.initiatives || []).map(i => {
        if (!visible(i, version)) return '';
        let details = '';
        if (i.venue)        details += `<p>${esc(i.venue)}</p>`;
        if (i.co_organizers) details += i.co_organizers.map(o => `<p>— ${esc(o)}</p>`).join('');
        if (i.funding)      details += `<p>Funded by: ${esc(i.funding)}</p>`;
        if (i.partners)     details += `<p>Partners: ${i.partners.map(esc).join(' &amp; ')}</p>`;
        if (i.includes)     details += i.includes.map(x => `<p>Including: ${esc(x)}</p>`).join('');
        if (i.details)      details += `<p>${esc(i.details)}</p>`;
        return eventBlock(i.period, `${esc(i.role)} — ${esc(i.title)}`, details);
    }).join('');

    return `<h2>Initiatives</h2>${blocks}`;
}

// ─── Mentoring ────────────────────────────────────────────────────────────────

function renderMentoring(data, version) {
    function studentBlock(s) {
        if (!visible(s, version)) return '';
        let details = `<p><em>${esc(s.topic)}</em></p>`;
        if (s.co_supervisor)  details += `<p>Co-supervised with ${esc(s.co_supervisor)}</p>`;
        if (s.co_supervisors) details += `<p>Co-supervised with ${s.co_supervisors.map(esc).join(', ')}</p>`;
        const dateLabel = s.status || (s.date ? `Defended ${s.date}` : '');
        return eventBlock(dateLabel, `${esc(s.student)} — ${esc(s.institution)}`, details);
    }

    const phd  = (data.phd  || []).map(studentBlock).join('');
    const msc  = (data.msc  || []).map(studentBlock).join('');

    return `
    <h2>Mentoring</h2>
    <h3>PhD Students</h3>${phd}
    <h3>MSc Students</h3>${msc}`;
}

// ─── Awards ───────────────────────────────────────────────────────────────────

function renderAwards(data, version) {
    const blocks = (data.awards || []).map(a => {
        if (!visible(a, version)) return '';
        let details = '';
        if (a.institution) details += `<p>${esc(a.institution)}</p>`;
        if (a.details)     details += `<p>${esc(a.details)}</p>`;
        return eventBlock(a.period, a.title, details);
    }).join('');

    return `<h2>Awards &amp; Fellowships</h2>${blocks}`;
}

// ─── Services ─────────────────────────────────────────────────────────────────

function renderServices(data, version) {
    // PC table
    const pcRows = (data.program_committee || []).map(p =>
        `<tr><td style="padding:0.3rem 1rem 0.3rem 0;font-weight:500;">${esc(p.venue)}</td>` +
        `<td style="color:#555;">${p.years.join(', ')}</td></tr>`).join('');

    const chairing = (data.chairing || []).map(c => {
        if (!visible(c, version)) return '';
        return eventBlock(c.period, c.role, `<p>${esc(c.details || c.event || '')}</p>${c.venue ? `<p>${esc(c.venue)}</p>` : ''}`);
    }).join('');

    const talks = (data.talks_presentations || []).map(t => {
        if (!visible(t, version)) return '';
        const title = t.title || (t.titles && t.titles.join(' &amp; ')) || '';
        let details = '';
        if (t.authors) details += `<p>${t.authors.map(esc).join(', ')}</p>`;
        if (t.event)   details += `<p>${esc(t.event)}</p>`;
        if (t.url)     details += `<p><a href="${esc(t.url)}" target="_blank">Link</a></p>`;
        return eventBlock(t.period, `${esc(t.type)} — ${esc(title)}`, details);
    }).join('');

    return `
    <h2>Services</h2>
    <h3>Program Committee &amp; Reviewing</h3>
    <table style="margin-left:1rem;margin-top:0.5rem;border-collapse:collapse;">
        ${pcRows}
    </table>
    <h3>Chairing &amp; Opponent</h3>
    ${chairing}
    <h3>Talks &amp; Presentations</h3>
    ${talks}`;
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function renderContact(data) {
    const p = data.profiles || {};
    const profileLinks = [
        p.google_scholar ? `<li><a href="${esc(p.google_scholar)}" target="_blank" style="color:#1e3c72;">Google Scholar</a></li>` : '',
        p.linkedin       ? `<li><a href="${esc(p.linkedin)}"       target="_blank" style="color:#1e3c72;">LinkedIn</a></li>` : '',
        p.github         ? `<li><a href="${esc(p.github)}"         target="_blank" style="color:#1e3c72;">GitHub</a></li>` : '',
        p.homepage       ? `<li><a href="${esc(p.homepage)}"       target="_blank" style="color:#1e3c72;">Homepage</a></li>` : '',
    ].join('');

    const e = data.emails || {};
    return `
    <h2>Contact</h2>
    <div class="contact-info">
        ${e.professional ? `<div class="contact-item"><strong>Professional Email</strong><a href="mailto:${esc(e.professional)}">${esc(e.professional)}</a></div>` : ''}
        ${e.personal     ? `<div class="contact-item"><strong>Personal Email</strong><a href="mailto:${esc(e.personal)}">${esc(e.personal)}</a></div>` : ''}
        ${data.address   ? `<div class="contact-item"><strong>Address</strong>${esc(data.address)}</div>` : ''}
        ${data.phone     ? `<div class="contact-item"><strong>Phone</strong>${esc(data.phone)}</div>` : ''}
    </div>
    <h3 style="margin-top:2rem;">Find Me Online</h3>
    <ul style="margin-left:2rem;margin-top:1rem;line-height:2;">${profileLinks}</ul>`;
}

// ─── Publications ─────────────────────────────────────────────────────────────
// Publications are rendered directly from the existing publications.html
// (the .bib integration is a future step once a .bib file is provided)

// ─── Export ───────────────────────────────────────────────────────────────────

window.Renderers = {
    about:        renderAbout,
    experience:   renderExperience,
    teaching:     renderTeaching,
    initiatives:  renderInitiatives,
    mentoring:    renderMentoring,
    awards:       renderAwards,
    services:     renderServices,
    contact:      renderContact,
};

// ─── Publications (BibTeX-driven) ────────────────────────────────────────────

function renderPublications(pubYaml, bibEntries, version) {
    const list = (pubYaml.publications || []).filter(p => {
        if (!p.versions) return true;
        return p.versions.includes(version);
    });

    if (!list.length) {
        return '<h2>Publications</h2><p>No entries for this version.</p>';
    }

    // Group by year using bib data
    const groups = {};
    list.forEach(p => {
        const entry = bibEntries[p.cite_key.toLowerCase()];
        if (!entry) {
            console.warn('No bib entry for cite_key:', p.cite_key);
            return;
        }
        const year = entry.year || 'Unknown';
        if (!groups[year]) groups[year] = [];
        groups[year].push(entry);
    });

    // Sort years descending
    const years = Object.keys(groups).sort((a, b) => b - a);

    const html = years.map(year => {
        const pubs = groups[year].map(e => {
            const title   = BibParser.delatex(e.title || '');
            const authors = BibParser.formatAuthors(e.author || '');
            const venue   = BibParser.buildVenue(e);

            // Bold "Jerad" in author list
            const authorsHighlighted = authors.replace(
                /\bJerad\b/g,
                '<strong>Jerad</strong>'
            );

            return `
            <div class="publication">
                <div class="publication-title">${title}</div>
                <div class="publication-authors">${authorsHighlighted}</div>
                <div class="publication-venue">${venue}</div>
            </div>`;
        }).join('');

        return `<h3 style="color:#1e3c72;margin-top:1.5rem;margin-bottom:0.5rem;">${year}</h3>${pubs}`;
    }).join('');

    return `<h2>Publications</h2>${html}`;
}

// Add to exports
window.Renderers.publications_bib = renderPublications;
