/**
 * Minimal BibTeX parser — handles the fields we care about.
 * Returns an object keyed by cite_key (lowercase), each value is a flat
 * object of field → string (LaTeX-decoded).
 */
(function () {

    // ── LaTeX → Unicode ──────────────────────────────────────────────────────
    const LATEX_MAP = {
        "\\'a": 'á', "\\'e": 'é', "\\'i": 'í', "\\'o": 'ó', "\\'u": 'ú',
        "\\'A": 'Á', "\\'E": 'É', "\\'I": 'Í', "\\'O": 'Ó', "\\'U": 'Ú',
        '\\`a': 'à', '\\`e': 'è', '\\`i': 'ì', '\\`o': 'ò', '\\`u': 'ù',
        '\\^a': 'â', '\\^e': 'ê', '\\^i': 'î', '\\^o': 'ô', '\\^u': 'û',
        '\\"a': 'ä', '\\"e': 'ë', '\\"i': 'ï', '\\"o': 'ö', '\\"u': 'ü',
        '\\"A': 'Ä', '\\"E': 'Ë', '\\"O': 'Ö', '\\"U': 'Ü',
        '{\\ae}': 'æ', '{\\AE}': 'Æ', '{\\oe}': 'œ', '{\\OE}': 'Œ',
        '{\\aa}': 'å', '{\\AA}': 'Å', '{\\ss}': 'ß',
        '\\~n': 'ñ', '\\~N': 'Ñ', '{\\c c}': 'ç', '{\\c C}': 'Ç',
        '\\&': '&', '\\%': '%', '\\$': '$', '\\#': '#',
        '{\\textendash}': '–', '{\\textemdash}': '—',
        '--': '–',
    };

    function delatex(str) {
        if (!str) return '';
        // Remove outer braces used only for capitalisation: {Word} → Word
        let s = str.replace(/\{([^{}]*)\}/g, '$1');
        // Apply character map
        for (const [latex, uni] of Object.entries(LATEX_MAP)) {
            s = s.split(latex).join(uni);
        }
        // Strip remaining lone backslashes
        s = s.replace(/\\\s*/g, '');
        return s.trim();
    }

    // ── Author formatting ────────────────────────────────────────────────────
    // "First Last and First Last" → abbreviated "F. Last, F. Last"
    function formatAuthors(raw) {
        const names = raw.split(/\s+and\s+/i);
        return names.map(name => {
            name = delatex(name).trim();
            // "Last, First" form
            if (name.includes(',')) {
                const [last, first] = name.split(',').map(s => s.trim());
                const initials = first.split(/\s+/).map(w => w[0] + '.').join(' ');
                return `${initials} ${last}`;
            }
            // "First ... Last" form
            const parts = name.split(/\s+/);
            if (parts.length === 1) return name;
            const last = parts.pop();
            const initials = parts.map(w => w[0] + '.').join(' ');
            return `${initials} ${last}`;
        }).join(', ');
    }

    // ── Field value extractor ────────────────────────────────────────────────
    // Handles {…} and "…" delimiters, including nested braces
    function extractValue(str) {
        str = str.trim();
        if (str[0] === '{') {
            let depth = 0, i = 0;
            for (; i < str.length; i++) {
                if (str[i] === '{') depth++;
                else if (str[i] === '}') { depth--; if (depth === 0) break; }
            }
            return str.slice(1, i);
        }
        if (str[0] === '"') {
            return str.slice(1, str.lastIndexOf('"'));
        }
        // bare value (number etc.)
        return str.replace(/,\s*$/, '');
    }

    // ── Main parser ──────────────────────────────────────────────────────────
    function parseBib(text) {
        const entries = {};
        // Match each @type{key, ...}
        const entryRe = /@(\w+)\s*\{\s*([^,\s]+)\s*,([^@]*)/g;
        let m;
        while ((m = entryRe.exec(text)) !== null) {
            const type = m[1].toLowerCase();
            const key  = m[2].toLowerCase();
            const body = m[3];

            if (type === 'comment' || type === 'string' || type === 'preamble') continue;

            const fields = { _type: type, _key: key };
            // Parse fields: name = value,
            const fieldRe = /(\w+)\s*=\s*(.+?)(?=,\s*\w+\s*=|,?\s*\}?\s*$)/gs;
            let fm;
            while ((fm = fieldRe.exec(body)) !== null) {
                const fname = fm[1].toLowerCase();
                const fval  = extractValue(fm[2].trim());
                fields[fname] = fval;
            }
            entries[key] = fields;
        }
        return entries;
    }

    // ── Venue string builder ─────────────────────────────────────────────────
    function buildVenue(e) {
        const t = e._type;
        const parts = [];

        if (t === 'article') {
            if (e.journal) parts.push(`<em>${delatex(e.journal)}</em>`);
            if (e.volume)  parts.push(`vol. ${delatex(e.volume)}`);
            if (e.number)  parts.push(`no. ${delatex(e.number)}`);
            if (e.pages)   parts.push(`pp. ${delatex(e.pages).replace('--','–')}`);
            if (e.year)    parts.push(e.year);
            if (e.note)    parts.push(delatex(e.note));
        } else if (t === 'inproceedings') {
            if (e.booktitle) parts.push(`<em>${delatex(e.booktitle)}</em>`);
            if (e.pages)     parts.push(`pp. ${delatex(e.pages).replace('--','–')}`);
            if (e.year)      parts.push(e.year);
        } else if (t === 'incollection') {
            if (e.booktitle) parts.push(`<em>${delatex(e.booktitle)}</em>`);
            if (e.series)    parts.push(delatex(e.series));
            if (e.volume)    parts.push(`vol. ${delatex(e.volume)}`);
            if (e.publisher) parts.push(delatex(e.publisher));
            if (e.year)      parts.push(e.year);
            if (e.note)      parts.push(delatex(e.note));
        } else if (t === 'techreport') {
            if (e.institution) parts.push(delatex(e.institution));
            if (e.number)      parts.push(`Tech. Rep. ${delatex(e.number)}`);
            if (e.year)        parts.push(e.year);
        } else {
            // fallback
            if (e.journal || e.booktitle)
                parts.push(`<em>${delatex(e.journal || e.booktitle)}</em>`);
            if (e.year) parts.push(e.year);
        }

        let venue = parts.join(', ');

        // Append DOI / URL link
        if (e.doi) {
            const href = e.doi.startsWith('http') ? e.doi : `https://doi.org/${e.doi}`;
            venue += ` <a href="${href}" target="_blank" style="color:#1e3c72;">DOI</a>`;
        } else if (e.url) {
            venue += ` <a href="${e.url}" target="_blank" style="color:#1e3c72;">Link</a>`;
        }

        return venue;
    }

    // ── Public API ───────────────────────────────────────────────────────────
    window.BibParser = {
        parse: parseBib,
        formatAuthors,
        buildVenue,
        delatex,
    };

})();
