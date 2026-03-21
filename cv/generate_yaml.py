#!/usr/bin/env python3
"""
generate_yaml.py
Generates Chadlia_Jerad_CV-Ext.yaml and Chadlia_Jerad_CV-Short.yaml
from the website's YAML data files and publications.bib.

Usage:
    python generate_yaml.py
Output files are written next to this script.
Data is read from ../assets/data/ and ../assets/publications.bib
relative to this script's location.
"""

import os
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML not found. Run: pip install pyyaml")

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
DATA_DIR   = SCRIPT_DIR / "../assets" / "data"
BIB_FILE   = SCRIPT_DIR / "../assets" / "publications.bib"

# ─── BibTeX parser (minimal, mirrors bib-parser.js logic) ─────────────────────

def parse_bib(bib_text):
    """Return dict keyed by lowercase cite_key with fields as strings."""
    entries = {}
    # Match @type{key, ...}
    for m in re.finditer(r'@(\w+)\s*\{\s*(\w+)\s*,([^@]*?)(?=\n@|\Z)', bib_text, re.S):
        entry_type = m.group(1).lower()
        key        = m.group(2).lower()
        body       = m.group(3)
        fields = {"entry_type": entry_type}
        for fm in re.finditer(r'(\w+)\s*=\s*\{((?:[^{}]|\{[^{}]*\})*)\}', body):
            fname = fm.group(1).lower()
            fval  = fm.group(2).strip()
            fields[fname] = fval
        entries[key] = fields
    return entries


def delatex(s):
    """Strip common LaTeX commands, keep readable text."""
    s = re.sub(r'\\[`\'^"~=.]\{?([a-zA-Z])\}?', r'\1', s)  # accents
    s = re.sub(r'\{\\([a-zA-Z]+)\s+([^}]*)\}', r'\2', s)    # {\cmd text}
    s = re.sub(r'\\[a-zA-Z]+\s*', '', s)                     # remaining cmds
    s = re.sub(r'[{}]', '', s)                                # braces
    return s.strip()


def format_authors(author_str):
    """'Last, First and Last2, First2' → 'First Last, First2 Last2'"""
    parts = re.split(r'\s+and\s+', author_str, flags=re.I)
    names = []
    for p in parts:
        p = p.strip()
        if ',' in p:
            last, first = [x.strip() for x in p.split(',', 1)]
            names.append(f"{first} {last}")
        else:
            names.append(p)
    return names


def build_venue(e):
    t = e.get("entry_type", "")
    if t == "article":
        j = delatex(e.get("journal", ""))
        v = e.get("volume", "")
        n = e.get("number", "")
        p = e.get("pages", "")
        note = e.get("note", "")
        parts = [j]
        if v:
            vn = f"vol. {v}"
            if n: vn += f"({n})"
            parts.append(vn)
        if p: parts.append(f"pp. {p}")
        return ", ".join(filter(None, parts)) + (f" [{note}]" if note else "")
    elif t in ("inproceedings", "proceedings"):
        b = delatex(e.get("booktitle", ""))
        p = e.get("pages", "")
        return b + (f", pp. {p}" if p else "")
    elif t == "incollection":
        b = delatex(e.get("booktitle", ""))
        pub = delatex(e.get("publisher", ""))
        return ", ".join(filter(None, [b, pub]))
    elif t == "techreport":
        inst = delatex(e.get("institution", ""))
        num  = e.get("number", "")
        return ", ".join(filter(None, [inst, num]))
    else:
        return delatex(e.get("journal", e.get("booktitle", "")))

# ─── Version filter ────────────────────────────────────────────────────────────

def keep(item, version):
    """Return True if item should appear in this version."""
    v = item.get("versions")
    if not v:
        return True
    return version in v

# ─── Load helpers ─────────────────────────────────────────────────────────────

def load(name):
    path = DATA_DIR / f"{name}.yaml"
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

# ─── Section builders ─────────────────────────────────────────────────────────

def abbreviate_degree(degree):
    """Convert full degree names to abbreviations."""
    degree_map = {
        "Doctorate in Electrical Engineering": "Ph.D.",
        "Master's degree in Automatic and Signal Processing": "MSc.",
        "Engineering Diploma in Electrical Engineering": "Dipl.-Ing.",
    }
    return degree_map.get(degree, degree)


def build_education(about):
    entries = []
    for e in about.get("education", []):
        entry = {
            "institution": e["institution"],
            "area":        e.get("topic", e.get("area", "")),
            "degree":      abbreviate_degree(e["degree"]),
            "date":        str(e["year"]),
            "location":    e.get("country", ""),
        }
        h = []
        if e.get("distinction"): h.append(f"Distinction: {e['distinction']}")
        if h: entry["highlights"] = h
        entries.append(entry)
    return entries


def build_experience(data, version):
    entries = []
    for p in data.get("positions", []):
        if not keep(p, version): continue
        details = p.get("details") or []
        entry = {
            "company":  p.get("institution", ""),
            "position": p.get("role", ""),
            "date":     p.get("period", ""),
            "location": p.get("country", ""),
        }
        if details:
            entry["highlights"] = [str(d) for d in details]
        entries.append(entry)
    return entries


def build_stays(data, version):
    entries = []
    for s in data.get("stays_abroad", []):
        if not keep(s, version): continue
        h = []
        if s.get("project"): h.append(f"Project: {s['project']}")
        if s.get("funder"):  h.append(f"Funded by: {s['funder']}")
        entry = {
            "company":  f"{s.get('institution','')}, {s.get('country','')}",
            "position": s.get("type", "Research Stay"),
            "date":     s.get("period", ""),
        }
        if h: entry["highlights"] = h
        entries.append(entry)
    return entries


def build_publications(pub_yaml, bib_entries, version):
    entries = []
    for p in pub_yaml.get("publications", []):
        if not keep(p, version): continue
        key = p["cite_key"].lower()
        e = bib_entries.get(key)
        if not e:
            continue
        authors = format_authors(e.get("author", ""))
        # italicise Jerad (RenderCV markdown)
        authors = [f"*{a}*" if "Jerad" in a else a for a in authors]
        doi = e.get("doi", "")
        url = e.get("url", "")
        entry = {
            "title":   delatex(e.get("title", "")),
            "authors": authors,
            "journal": build_venue(e),
            "date":    str(e.get("year", "")),
        }
        if doi: entry["doi"] = doi
        if url: entry["url"] = url
        entries.append(entry)
    return entries


def build_talks(pub_yaml, version):
    """Talks are stored under talks_presentations in publications.yaml."""
    entries = []
    for t in pub_yaml.get("talks_presentations", []):
        if not keep(t, version): continue
        title = t.get("title") or " & ".join(t.get("titles", []))
        h = []
        if t.get("event"):   h.append(t["event"])
        if t.get("authors"): h.append(", ".join(t["authors"]))
        if t.get("url"):     h.append(f"[Link]({t['url']})")
        entry = {
            "name":    f"{t.get('type','Talk')} — {title}",
            "date":    str(t.get("period", "")),
            "summary": t.get("event", ""),
        }
        if h: entry["highlights"] = h
        entries.append(entry)
    return entries


def build_supervision(data, version):
    entries = []
    for level, label in [("phd", "PhD"), ("msc", "MSc")]:
        for s in data.get(level, []):
            if not keep(s, version): continue
            h = [s.get("topic", "")]
            cosup = s.get("co_supervisor") or ""
            cosups = s.get("co_supervisors") or []
            if cosup:  h.append(f"Co-supervised with {cosup}")
            if cosups: h.append(f"Co-supervised with {', '.join(cosups)}")
            date = s.get("status") or (f"Defended {s['date']}" if s.get("date") else "")
            entry = {
                "name":     s.get("student", ""),
                "date":     date,
                "location": s.get("institution", ""),
                "summary":  f"{label} thesis",
                "highlights": [x for x in h if x],
            }
            entries.append(entry)
    return entries


def build_initiatives(data, version):
    entries = []
    for i in data.get("initiatives", []):
        if not keep(i, version): continue
        h = []
        if i.get("venue"):         h.append(i["venue"])
        if i.get("funding"):       h.append(f"Funded by: {i['funding']}")
        if i.get("co_organizers"): h += [f"Co-organizer: {o}" for o in i["co_organizers"]]
        if i.get("partners"):      h.append(f"Partners: {' & '.join(i['partners'])}")
        if i.get("includes"):      h += [f"Including: {x}" for x in i["includes"]]
        if i.get("details"):       h.append(i["details"])
        entry = {
            "name":    i.get("title", ""),
            "date":    str(i.get("period", "")),
            "summary": i.get("role", ""),
        }
        if h: entry["highlights"] = h
        entries.append(entry)
    return entries


def build_distinctions(data, version):
    bullets = []
    for a in data.get("distinctions", []):
        if not keep(a, version): continue
        line = a.get("title", "")
        if a.get("institution"): line += f" — {a['institution']}"
        if a.get("period"):      line = f"{a['period']}: {line}"
        if a.get("details"):     line += f". {a['details']}"
        bullets.append({"bullet": line})
    return bullets


def build_service(data, version):
    # PC membership as one-liners
    pc_lines = []
    for p in data.get("program_committee", []):
        years = ", ".join(p.get("years", []))
        pc_lines.append({"bullet": f"{p['venue']} ({years})"})

    # Chairing
    chair_entries = []
    for c in data.get("chairing", []):
        if not keep(c, version): continue
        h = []
        if c.get("details"): h.append(c["details"])
        if c.get("event"):   h.append(c["event"])
        if c.get("venue"):   h.append(c["venue"])
        entry = {
            "name":    c.get("role", ""),
            "date":    str(c.get("period", "")),
        }
        if h: entry["highlights"] = h
        chair_entries.append(entry)

    return pc_lines, chair_entries


def build_teaching(data):
    current = [c for c in data.get("courses", []) if not c.get("period") and not c.get("role")]
    entries = []
    for c in current:
        lang = f" [{c['language']}]" if c.get("language") else ""
        entries.append({
            "bullet": f"{c['title']}{lang} — {c.get('level','')} — {c.get('institution','')}"
        })
    return entries

# ─── CV assembler ─────────────────────────────────────────────────────────────

def build_cv(version):
    about      = load("about")
    experience = load("experience")
    pub_yaml   = load("publications")
    supervision  = load("supervision")
    initiatives= load("initiatives")
    distinctions = load("distinctions")
    services   = load("services")
    teaching   = load("teaching")
    contact    = load("contact")

    bib_text   = BIB_FILE.read_text(encoding="utf-8")
    bib        = parse_bib(bib_text)

    pc_bullets, chair_entries = build_service(services, version)

    dist_title = distinctions.get("titles", {}).get(version, "Distinctions, Fellowships & Grants")

    stays = build_stays(experience, version)

    cv = {
        "cv": {
            "name":     "Chadlia Jerad",
            "photo":    about.get("personal", {}).get("photo", ""),
            "headline": "Associate Professor — Embedded Systems & Cyber-Physical Systems",
            "location": "Tunis, Tunisia",
            "email":    contact.get("emails", {}).get("professional", ""),
            "phone":    contact.get("phone", ""),
            "website":  contact.get("profiles", {}).get("homepage", ""),
            "social_networks": [
                {"network": "LinkedIn", "username": contact.get("profiles", {}).get("linkedin", "").split("/in/")[-1].strip("/")},
                {"network": "GitHub",   "username": contact.get("profiles", {}).get("github", "").split("github.com/")[-1].strip("/")},
            ],
            "sections": {
                "about": [{"bullet": about.get("about", "")}],
                "education": build_education(about),
                "experience": build_experience(experience, version),
                **({"research_stays": stays} if stays else {}),
                "publications": build_publications(pub_yaml, bib, version),
                "talks_and_presentations": build_talks(pub_yaml, version),
                "graduate_supervision": build_supervision(supervision, version),
                "initiatives": build_initiatives(initiatives, version),
                dist_title: build_distinctions(distinctions, version),
                "program_committee": pc_bullets,
                "chairing_and_opponent_duties": chair_entries,
                "teaching": build_teaching(teaching),
            }
        },
        "design": {
            "theme": "classic",
            # "page": {
            #     "size": "us-letter",
            #     "top_margin": "0.7in",
            #     "bottom_margin": "0.7in",
            #     "left_margin": "0.7in",
            #     "right_margin": "0.7in",
            #     "show_footer": True,
            #     "show_top_note": True,
            # },
            # "colors": {
            #     "body": "rgb(0, 0, 0)",
            #     "name": "rgb(0, 79, 144)",
            #     "headline": "rgb(0, 79, 144)",
            #     "connections": "rgb(0, 79, 144)",
            #     "section_titles": "rgb(0, 79, 144)",
            #     "links": "rgb(0, 79, 144)",
            #     "footer": "rgb(128, 128, 128)",
            #     "top_note": "rgb(128, 128, 128)",
            # },
            # "typography": {
            #     "line_spacing": "0.6em",
            #     "alignment": "justified",
            #     "date_and_location_column_alignment": "right",
            #     "font_family": {
            #         "body": "Source Sans 3",
            #         "name": "Source Sans 3",
            #         "headline": "Source Sans 3",
            #         "connections": "Source Sans 3",
            #         "section_titles": "Source Sans 3",
            #     },
            #     "font_size": {
            #         "body": "10pt",
            #         "name": "30pt",
            #         "headline": "10pt",
            #         "connections": "10pt",
            #         "section_titles": "1.4em",
            #     },
            #     "small_caps": {
            #         "name": False,
            #         "headline": False,
            #         "connections": False,
            #         "section_titles": False,
            #     },
            #     "bold": {
            #         "name": True,
            #         "headline": False,
            #         "connections": False,
            #         "section_titles": True,
            #     },
            # },
            # "links": {
            #     "underline": False,
            #     "show_external_link_icon": False,
            # },
            # "header": {
            #     "alignment": "center",
            #     "photo_width": "3.5cm",
            #     "photo_position": "left",
            #     "photo_space_left": "0.4cm",
            #     "photo_space_right": "0.4cm",
            #     "space_below_name": "0.7cm",
            #     "space_below_headline": "0.7cm",
            #     "space_below_connections": "0.7cm",
            #     "connections": {
            #         "phone_number_format": "national",
            #         "hyperlink": True,
            #         "show_icons": True,
            #         "display_urls_instead_of_usernames": False,
            #         "separator": "",
            #         "space_between_connections": "0.5cm",
            #     },
            # },
            # "section_titles": {
            #     "type": "with_partial_line",
            #     "line_thickness": "0.5pt",
            #     "space_above": "0.5cm",
            #     "space_below": "0.3cm",
            # },
            # "sections": {
            #     "allow_page_break": True,
            #     "space_between_regular_entries": "1.2em",
            #     "space_between_text_based_entries": "0.3em",
            #     "show_time_spans_in": ["experience"],
            # },
            # "entries": {
            #     "date_and_location_width": "4.15cm",
            #     "side_space": "0.2cm",
            #     "space_between_columns": "0.1cm",
            #     "allow_page_break": False,
            #     "short_second_row": True,
            #     "degree_width": "1cm",
            #     "summary": {
            #         "space_above": "0cm",
            #         "space_left": "0cm",
            #     },
            #     "highlights": {
            #         "bullet": "•",
            #         "nested_bullet": "•",
            #         "space_left": "0.15cm",
            #         "space_above": "0cm",
            #         "space_between_items": "0cm",
            #         "space_between_bullet_and_text": "0.5em",
            #     },
            # },
        },
        "locale": {
            "language": "english",
            # "last_updated": "Last updated in",
            # "month": "month",
            # "months": "months",
            # "year": "year",
            # "years": "years",
            # "present": "present",
            # "phrases": {
            #     "degree_with_area": "DEGREE in AREA",
            # },
            # "month_abbreviations": ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"],
            # "month_names": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        },
        "settings": {
            "current_date": "today",
            "render_command": {
                "output_folder": "rendercv_output",
                "pdf_path": "OUTPUT_FOLDER/Chadlia_Jerad_CV.pdf",
            }
        }
       
    }

    # Remove empty sections
    cv["cv"]["sections"] = {
        k: v for k, v in cv["cv"]["sections"].items() if v
    }

    return cv

# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    for version, suffix in [("long", "Ext"), ("short", "Short")]:
        cv = build_cv(version)
        out_path = SCRIPT_DIR / f"Chadlia_Jerad_CV-{suffix}.yaml"
        with open(out_path, "w", encoding="utf-8") as f:
            yaml.dump(cv, f, allow_unicode=True, sort_keys=False, default_flow_style=False, width=120)
        print(f"Written: {out_path}")

if __name__ == "__main__":
    main()
