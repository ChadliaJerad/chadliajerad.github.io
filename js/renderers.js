// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function mdLinks(str) {
    if (!str) return '';
    // escape everything, then restore links
    return esc(str).replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        (_, label, url) => `<a href="${url}" target="_blank">${label}</a>`);
}

// Return true if item should be shown for the current version
function visible(item, version) {
    if (!item.versions) return true;           // no filter → always show
    return item.versions.includes(version);
}

function eventBlock(date, role, detailsHtml) {
    return `
    <div class="event">
        <div class="date">${mdLinks(date)}</div>
        <div class="role">${mdLinks(role)}</div>
        ${detailsHtml ? `<div class="details">${detailsHtml}</div>` : ''}
    </div>`;
}

// ─── About ───────────────────────────────────────────────────────────────────

function renderAbout(data) {
    const edu = (data.education || []).map(e => `
        <li>
            <strong>${mdLinks(e.degree)}</strong> — ${mdLinks(e.institution)}, ${mdLinks(e.country)} (${mdLinks(e.year)})
            ${e.topic ? `<br><em>${mdLinks(e.topic)}</em>` : ''}
            ${e.distinction ? ` — Distinction: ${mdLinks(e.distinction)}` : ''}
        </li>`).join('');

    const news = (data.recent_news || []).map(n => `
        <div class="research-area">
            <strong>${mdLinks(n.date)}:</strong> ${mdLinks(n.text)}
        </div>`).join('');

    const interests = (data.areas_of_interest || []).map(i =>
        `<li>${mdLinks(i)}</li>`).join('');

    const software = (data.software || []).map(s => `
        <li><a href="${mdLinks(s.url)}" target="_blank">${mdLinks(s.name)}</a> — ${mdLinks(s.text)}</li>`).join('');
        
    return `
    <h2>About Me</h2>
    <div style="display:flex;gap:2rem;align-items:flex-start;margin-bottom:1rem;">
        <div style="flex:2;">
            <p style="margin:0 0 1rem 0;">${mdLinks(data.about)}</p>
            <h3 style="margin-top:0;">Areas of Interest</h3>
            <ul style="margin-left:2rem;margin-top:0.5rem;">${interests}</ul>
            <h3 style="margin-top:0;"></h3>
            <h3 style="margin-top:0;">Software</h3>
            <ul style="margin-left:2rem;margin-top:0.5rem;">${software}</ul>
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
    <p>${mdLinks(data.short_bio)}</p>`;
}

// ─── Experience ───────────────────────────────────────────────────────────────

function renderExperience(data, version) {
    function positionBlock(p) {
        if (!visible(p, version)) return '';
        const details = p.details ? p.details.map(d => `<p>${mdLinks(d)}</p>`).join('') : '';
        return eventBlock(p.period, `${p.role} — ${p.institution}${p.country ? ', ' + p.country : ''}`, details);
    }

    const positions = (data.positions || []).map(positionBlock).join('');

    const stays = (data.stays_abroad || []).map(s => {
        if (!visible(s, version)) return '';
        let detail = '';
        if (s.project) detail += `<p>Project: ${mdLinks(s.project)}</p>`;
        if (s.funder)  detail += `<p>Funded by: ${mdLinks(s.funder)}</p>`;
        return eventBlock(s.period, `${mdLinks(s.type)} — ${mdLinks(s.institution)}, ${mdLinks(s.country)}`, detail);
    }).join('');

    return `<h2>
        <a class="section-link" onclick="document.getElementById('pub-positions').scrollIntoView({behavior:'smooth'}); return false;" style="cursor:pointer;text-decoration:none;color:inherit;"><u>Positions</u></a> • 
        <a class="section-link" onclick="document.getElementById('pub-stays').scrollIntoView({behavior:'smooth'}); return false;" style="cursor:pointer;text-decoration:none;color:inherit;">Research Stays</a>
    </h2>
    <h3 id="pub-positions" style="scroll-margin-top:300px;">Positions</h3>${positions}
    <h3 id="pub-stays" style="scroll-margin-top:300px;">Research Stays Abroad</h3>${stays}`;

}

// ─── Teaching ─────────────────────────────────────────────────────────────────

function renderTeaching(data) {
    // Split: current ENSI courses vs guest/past
    const current = (data.courses || []).filter(c => !c.period && !c.role);
    const guest   = (data.courses || []).filter(c => c.role === 'Invited Lecturer');
    const past    = (data.courses || []).filter(c => c.period && c.role !== 'Invited Lecturer');

    function courseCard(c) {
        const lang = c.language ? ` <span style="color:#2a5298;font-size:0.85rem;">[${mdLinks(c.language)}]</span>` : '';
        const note = c.note ? `<p style="color:#666;font-size:0.9rem;margin-top:0.3rem;">${mdLinks(c.note)}</p>` : '';
        return `
        <div class="research-area">
            <strong>${mdLinks(c.title)}</strong>${lang} — ${mdLinks(c.level)}
            ${note}
        </div>`;
    }

    const guestBlocks = guest.map(c => eventBlock(c.period, `${mdLinks(c.title)} — ${mdLinks(c.institution)}`,
        `<p>${mdLinks(c.level)}</p>`)).join('');

    const pastList = past.map(c =>
        `<li>${mdLinks(c.title)} (${mdLinks(c.level)}) — ${mdLinks(c.institution)} (${mdLinks(c.period)})</li>`).join('');

    return `
    <h2>Teaching</h2>
    <h3>Current Courses — ENSI, University of Manouba</h3>
    <p style="margin-bottom:1rem;color:#555;font-size:0.95rem;">Classes marked [English] are taught in English, based on EECS 149/249A at UC Berkeley.</p>
    ${current.map(courseCard).join('')}
    <h3>Guest Lecturer</h3>
    ${guestBlocks}
    <h3>Previously Taught</h3>
    <ul style="margin-left:2rem;margin-top:0.5rem;">${pastList}</ul>`;
}

// ─── Initiatives ──────────────────────────────────────────────────────────────

function renderInitiatives(data, version) {
    const blocks = (data.initiatives || []).map(i => {
        if (!visible(i, version)) return '';
        let details = '';
        if (i.venue)        details += `<p>${mdLinks(i.venue)}</p>`;
        if (i.co_organizers) details += i.co_organizers.map(o => `<p>— ${mdLinks(o)}</p>`).join('');
        if (i.funding)      details += `<p>Funded by: ${mdLinks(i.funding)}</p>`;
        if (i.partners)     details += `<p>Partners: ${i.partners.map(esc).join(' &amp; ')}</p>`;
        if (i.includes)     details += i.includes.map(x => `<p>Including: ${mdLinks(x)}</p>`).join('');
        if (i.details)      details += `<p>${mdLinks(i.details)}</p>`;
        return eventBlock(i.period, `${mdLinks(i.role)} — ${mdLinks(i.title)}`, details);
    }).join('');

    return `<h2>Initiatives</h2>${blocks}`;
}

// ─── Supervision ────────────────────────────────────────────────────────────────

function renderSupervision(data, version) {
    function studentBlock(s) {
        if (!visible(s, version)) return '';
        let details = `<p><em>${mdLinks(s.topic)}</em></p>`;
        if (s.co_supervisor)  details += `<p>Co-supervised with ${mdLinks(s.co_supervisor)}</p>`;
        if (s.co_supervisors) details += `<p>Co-supervised with ${s.co_supervisors.map(esc).join(', ')}</p>`;
        const dateLabel = s.status || (s.date ? `Defended ${s.date}` : '');
        return eventBlock(dateLabel, `${mdLinks(s.student)} — ${mdLinks(s.institution)}`, details);
    }

    const phd  = (data.phd  || []).map(studentBlock).join('');
    const msc  = (data.msc  || []).map(studentBlock).join('');

    return `
    <h2>Supervision</h2>
    <h3>PhD Students</h3>${phd}
    <h3>MSc Students</h3>${msc}`;
}

// ─── Distinctions ─────────────────────────────────────────────────────────────

function renderDistinctions(data, version) {
    const blocks = (data.distinctions || []).map(a => {
        if (!visible(a, version)) return '';
        let details = '';
        if (a.institution) details += `<p>${mdLinks(a.institution)}</p>`;
        if (a.details)     details += `<p>${mdLinks(a.details)}</p>`;
        return eventBlock(a.period, a.title, details);
    }).join('');

    const title = (data.titles && data.titles[version]) || 'Distinctions &amp; Fellowships';
    return `<h2>${title}</h2>${blocks}`;
}

// ─── Services ─────────────────────────────────────────────────────────────────

function renderServices(data, version) {
    // PC table
    const pcRows = (data.program_committee || []).map(p =>
        `<tr><td style="padding:0.3rem 1rem 0.3rem 0;font-weight:500;">${mdLinks(p.venue)}</td>` +
        `<td style="color:#555;">${p.years.join(', ')}</td></tr>`).join('');

    const chairing = (data.chairing || []).map(c => {
        if (!visible(c, version)) return '';
        return eventBlock(c.period, c.role, `<p>${mdLinks(c.details || c.event || '')}</p>${c.venue ? `<p>${mdLinks(c.venue)}</p>` : ''}`);
    }).join('');

    return `
    <h2>Services</h2>
    <h3>Program Committee &amp; Reviewing</h3>
    <table style="margin-left:1rem;margin-top:0.5rem;border-collapse:collapse;">
        ${pcRows}
    </table>
    <h3> Dissertation Committee</h3>
    ${chairing}`;
}

// ─── Contact ──────────────────────────────────────────────────────────────────
// Contact infor is only for CV generation

// ─── Publications (BibTeX-driven) ────────────────────────────────────────────

function renderPublications(pubYaml, bibEntries, version) {
    const list = (pubYaml.publications || []).filter(p => {
        if (!p.versions) return true;
        return p.versions.includes(version);
    });

    if (!list.length) {
        return '<h2>Publications • Talks • Posters • Presentations</h2><p>No entries for this version.</p>';
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

            // Underline "Jerad" in author list
            const authorsHighlighted = authors.replace(
                /\bC. Jerad\b/g,
                '<u>C. Jerad</u>'
            );

            return `
            <div class="publication">
                <div class="publication-title">${title}</div>
                <div class="publication-authors">${authorsHighlighted}</div>
                <div class="publication-venue">${venue}</div>
            </div>`;
        }).join('');

        // return `<h3 style="color:#1e3c72;margin-top:1.5rem;margin-bottom:0.5rem;">${year}</h3>${pubs}`;
        return `${pubs}`;
    }).join('');

    const talks = (pubYaml.talks || []).map(t => {
        if (!visible(t, version)) return '';
        let titleHtml = '';
        if (t.title) {
            titleHtml = mdLinks(t.title);
        } else if (t.titles) {
            titleHtml = t.titles.map(title => `<div>— ${mdLinks(title)}</div>`).join('');
        }
        let details = '';
        if (t.event) details += `${mdLinks(t.event)} — ${mdLinks(t.period)}`;
        if (t.url) details += `, <a href="${mdLinks(t.url)}" target="_blank">Link</a>`;
        
        return `
            <div class="publication">
                <div class="publication-title">${titleHtml}</div>
                <div class="publication-venue">${details}</div>
            </div>`;
    }).join('');

    const posters = (pubYaml.posters || []).map(t => {
        if (!visible(t, version)) return '';
        let titleHtml = '';
        if (t.title) {
            titleHtml = mdLinks(t.title);
        } else if (t.titles) {
            titleHtml = t.titles.map(title => `<div>— ${mdLinks(title)}</div>`).join('');
        }
        let details = '';
        if (t.authors) details += `<div>${(t.authors.map(esc).join(', ')).replace(
                /\bC. Jerad\b/g,
                '<u>C. Jerad</u>'
            )}</div>`;
        if (t.event)   details += `${mdLinks(t.event)} —  ${mdLinks(t.period)}`;
        if (t.url)     details += `, <a href="${mdLinks(t.url)}" target="_blank">Link</a>`;
        
        return `
            <div class="publication">
                <div class="publication-title">${titleHtml}</div>
                <div class="publication-authors">${mdLinks(t.type)}</div>
                <div class="publication-venue">${details}</div>
            </div>`;
    }).join('');

    const presentations = (pubYaml.presentations || []).map(t => {
        if (!visible(t, version)) return '';
        let titleHtml = '';
        if (t.title) {
            titleHtml = mdLinks(t.title);
        } else if (t.titles) {
            titleHtml = t.titles.map(title => `<div>— ${mdLinks(title)}</div>`).join('');
        }
        let details = '';
        if (t.authors) details += `<div>${t.authors.map(esc).join(', ').replace(
                /\bC. Jerad\b/g,
                '<u>C. Jerad</u>'
            )}</div>`;
        if (t.event)   details += `${mdLinks(t.event)} — ${mdLinks(t.period)}`;
        if (t.url)     details += `, ` + `<a href="${mdLinks(t.url)}" target="_blank">Link</a>`;
        
        return `
            <div class="publication">
                <div class="publication-title">${titleHtml}</div>
                <div class="publication-authors">${mdLinks(t.type)}</div>
                <div class="publication-venue">${details}</div>
            </div>`;
    }).join('');

    return `<h2>
        <a class="section-link" onclick="document.getElementById('pub-publications').scrollIntoView({behavior:'smooth'}); return false;" style="cursor:pointer;text-decoration:none;color:inherit;"><u>Publications</u></a> • 
        <a class="section-link" onclick="document.getElementById('pub-talks').scrollIntoView({behavior:'smooth'}); return false;" style="cursor:pointer;text-decoration:none;color:inherit;">Talks</a> • 
        <a class="section-link" onclick="document.getElementById('pub-posters').scrollIntoView({behavior:'smooth'}); return false;" style="cursor:pointer;text-decoration:none;color:inherit;">Posters</a> • 
        <a class="section-link" onclick="document.getElementById('pub-presentations').scrollIntoView({behavior:'smooth'}); return false;" style="cursor:pointer;text-decoration:none;color:inherit;">Presentations</a>
    </h2>
    <h3 id="pub-publications" style="scroll-margin-top:300px;">Publications</h3>${html}
    <h3 id="pub-talks" style="scroll-margin-top:300px;">Invited Talks</h3>${talks}
    <h3 id="pub-posters" style="scroll-margin-top:300px;">Posters</h3>${posters}
    <h3 id="pub-presentations" style="scroll-margin-top:300px;">Presentations</h3>${presentations}`;
}

// Add to exports
// ─── Export ───────────────────────────────────────────────────────────────────

window.Renderers = {
    about:        renderAbout,
    experience:   renderExperience,
    teaching:     renderTeaching,
    initiatives:  renderInitiatives,
    supervision:  renderSupervision,
    distinctions: renderDistinctions,
    services:     renderServices,
    publications_bib:   renderPublications
};
