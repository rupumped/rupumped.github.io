"""
Test suite for rupumped.github.io.

Run all tests:
    .venv/bin/pytest test_site.py -v

Skip network-dependent W3C tests:
    .venv/bin/pytest test_site.py -v -k "not w3c"

Dependencies:
    pip install pytest beautifulsoup4 requests
"""
import difflib
import re
import time
from datetime import date
from email.utils import parsedate
from pathlib import Path

import pytest
import requests
from bs4 import BeautifulSoup, Comment
import xml.etree.ElementTree as ET

REPO_ROOT = Path(__file__).parent
BASE_URL = "https://rupumped.github.io"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"

# Pages excluded from header/footer/head/alt-text checks
EXCLUDE_FROM_NAV_CHECKS = frozenset({
    "tarpit/entry.html",
    "tarpit/trap-1.html",
    "tarpit/trap-2.html",
    "tarpit/trap-3.html",
    "google99f709ec30b7f7fc.html",
    "404.html",
    "business-card.html",
})

# Pages excluded from sitemap completeness check
EXCLUDE_FROM_SITEMAP = frozenset({
    "tarpit/entry.html",
    "tarpit/trap-1.html",
    "tarpit/trap-2.html",
    "tarpit/trap-3.html",
    "google99f709ec30b7f7fc.html",
    "404.html",
    "business-card.html",
    "rss.html",
    "sitemap.html"
})

# Valid hrefs for nav active-link
NAV_HREFS = frozenset({
    "index.html",
    "about.html",
    "selected-work.html",
    "scholarship.html",
    "service.html",
    "blog.html",
})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_html_files(exclude: frozenset = frozenset()) -> list[Path]:
    """Return sorted root-level HTML files, minus excluded relative paths."""
    return [
        f for f in sorted(REPO_ROOT.glob("*.html"))
        if str(f.relative_to(REPO_ROOT)) not in exclude
    ]


def expected_url(rel_path: str) -> str:
    """Canonical URL for a root-relative HTML path."""
    return f"{BASE_URL}/" if rel_path == "index.html" else f"{BASE_URL}/{rel_path}"


def canonical_html(tag) -> str:
    """Collapse all whitespace runs in a tag's HTML string for stable comparison."""
    return re.sub(r"\s+", " ", str(tag)).strip()


def parse(f: Path) -> BeautifulSoup:
    return BeautifulSoup(f.read_text(encoding="utf-8"), "html.parser")


def normalise_footer(footer_tag) -> str:
    """
    Return canonical footer HTML with tarpit links stripped.
    index.html has hidden tarpit links in the footer that other pages don't have;
    remove any direct child of <footer> that contains a tarpit/ href.
    """
    soup = BeautifulSoup(str(footer_tag), "html.parser")
    footer = soup.find("footer")
    for child in list(footer.children):
        if isinstance(child, Comment):
            child.extract()
        elif not hasattr(child, "find_all"):
            continue
        elif child.find_all("a", href=lambda h: h and "tarpit/" in h):
            child.decompose()
        elif child.name == "a" and "tarpit/" in child.get("href", ""):
            child.decompose()
    return canonical_html(footer)


def normalise_header(header_tag) -> str:
    """
    Return a canonical header string suitable for cross-page comparison:
    - strips active-link class from every <a>
    - removes <li id="business-card"> (present only in index.html)
    """
    soup = BeautifulSoup(str(header_tag), "html.parser")
    for a in soup.find_all("a", class_="active-link"):
        classes = [c for c in a.get("class", []) if c != "active-link"]
        if classes:
            a["class"] = classes
        else:
            del a["class"]
    bc = soup.find("li", id="business-card")
    if bc:
        bc.decompose()
    return canonical_html(soup.find("header"))


# ---------------------------------------------------------------------------
# 1. Header consistency
# ---------------------------------------------------------------------------

def test_headers_consistent():
    """All page headers must be identical except for active-link and the index business-card."""
    files = get_html_files(EXCLUDE_FROM_NAV_CHECKS)
    normalised: dict[str, str] = {}
    for f in files:
        soup = parse(f)
        header = soup.find("header")
        assert header is not None, f"{f.name}: missing <header>"
        normalised[f.name] = normalise_header(header)

    names = list(normalised)
    ref = names[0]
    for name in names[1:]:
        assert normalised[name] == normalised[ref], (
            f"{name} header differs from {ref}"
        )


# ---------------------------------------------------------------------------
# 2. Footer consistency
# ---------------------------------------------------------------------------

def _html_to_lines(html: str) -> list[str]:
    """Split canonical HTML at tag boundaries for readable diffs."""
    return re.sub(r">\s*<", ">\n<", html).splitlines()


def test_footers_consistent():
    """All page footers must be identical."""
    files = get_html_files(EXCLUDE_FROM_NAV_CHECKS)
    footers: dict[str, str] = {}
    for f in files:
        soup = parse(f)
        footer = soup.find("footer")
        assert footer is not None, f"{f.name}: missing <footer>"
        footers[f.name] = normalise_footer(footer)

    names = list(footers)
    ref = names[0]
    for name in names[1:]:
        if footers[name] != footers[ref]:
            diff = "\n".join(difflib.unified_diff(
                _html_to_lines(footers[ref]),
                _html_to_lines(footers[name]),
                fromfile=ref,
                tofile=name,
                lineterm="",
            ))
            pytest.fail(f"{name} footer differs from {ref}:\n{diff}")


# ---------------------------------------------------------------------------
# 3. Sitemap completeness
# ---------------------------------------------------------------------------

def test_sitemap_contains_all_html():
    """Every public HTML file must appear in sitemap.xml, and every sitemap entry must exist on disk."""
    tree = ET.parse(REPO_ROOT / "sitemap.xml")
    root = tree.getroot()
    locs = {el.text.strip() for el in root.iter(f"{{{SITEMAP_NS}}}loc") if el.text}

    # Every non-excluded HTML file should be in the sitemap
    missing = []
    for f in get_html_files(EXCLUDE_FROM_SITEMAP):
        rel = str(f.relative_to(REPO_ROOT))
        url = expected_url(rel)
        if url not in locs:
            missing.append(f"  {rel}  →  {url}")
    assert not missing, "Files missing from sitemap:\n" + "\n".join(missing)

    # No sitemap entry should point at a file that doesn't exist
    phantom = []
    for loc in locs:
        if not loc.startswith(BASE_URL + "/"):
            continue
        path = loc[len(BASE_URL) + 1:]
        if not path:
            path = "index.html"
        candidate = REPO_ROOT / path
        if path.endswith(".html") and not candidate.exists():
            phantom.append(f"  {loc}")
    assert not phantom, "Sitemap references non-existent files:\n" + "\n".join(phantom)


# ---------------------------------------------------------------------------
# 4. RSS completeness
# ---------------------------------------------------------------------------

def test_rss_contains_all_blog_posts():
    """Every post linked from blog.html must appear as an item in rss.xml."""
    blog_soup = parse(REPO_ROOT / "blog.html")
    post_urls = set()
    for a in blog_soup.find_all("a", class_="post"):
        href = a.get("href", "")
        if not href or not href.endswith(".html"):
            continue  # skip PDFs, external links, empty hrefs
        if href.startswith("http"):
            continue  # external posts (e.g. MIT Tech articles) aren't in our RSS
        post_urls.add(f"{BASE_URL}/{href}")

    tree = ET.parse(REPO_ROOT / "rss.xml")
    channel = tree.getroot().find("channel")
    rss_refs: set[str] = set()
    for item in channel.findall("item"):
        for tag in ("link", "guid"):
            el = item.find(tag)
            if el is not None and el.text:
                rss_refs.add(el.text.strip())

    missing = sorted(post_urls - rss_refs)
    assert not missing, "Blog posts missing from RSS:\n" + "\n".join(f"  {u}" for u in missing)


# ---------------------------------------------------------------------------
# 5. HTML head completeness
# ---------------------------------------------------------------------------

def test_html_head_complete():
    """Every page <head> must contain all required meta, OG, favicon, font, and CSS elements."""
    errors: list[str] = []

    def check(condition: bool, msg: str) -> None:
        if not condition:
            errors.append(msg)

    for f in get_html_files(EXCLUDE_FROM_NAV_CHECKS):
        rel = str(f.relative_to(REPO_ROOT))
        url = expected_url(rel)
        soup = parse(f)
        head = soup.find("head")
        name = f.name

        if head is None:
            errors.append(f"{name}: missing <head>")
            continue

        # charset
        charset = head.find("meta", attrs={"charset": True})
        check(charset is not None, f"{name}: missing <meta charset>")
        if charset:
            check(charset["charset"].lower() == "utf-8", f"{name}: charset is not utf-8")

        # viewport
        vp = head.find("meta", attrs={"name": "viewport"})
        check(vp is not None, f"{name}: missing viewport meta")
        if vp:
            check("width=device-width" in vp.get("content", ""), f"{name}: bad viewport content")

        # author
        author = head.find("meta", attrs={"name": "author"})
        check(author is not None, f"{name}: missing author meta")
        if author:
            check(author.get("content") == "Nicholas S. Selby", f"{name}: wrong author")

        # description
        desc = head.find("meta", attrs={"name": "description"})
        check(bool(desc and desc.get("content")), f"{name}: missing/empty description")

        # canonical URL matches this file's own URL
        canonical = head.find("link", attrs={"rel": "canonical"})
        check(canonical is not None, f"{name}: missing canonical link")
        if canonical:
            check(
                canonical.get("href") == url,
                f"{name}: canonical {canonical.get('href')!r} != {url!r}",
            )

        # Open Graph tags
        def og(prop):
            return head.find("meta", attrs={"property": f"og:{prop}"})

        check(bool(og("title") and og("title").get("content")), f"{name}: missing og:title")
        if og("title") and og("title").get("content"):
            title_tag = head.find("title")
            if title_tag:
                check(
                    og("title")["content"] == title_tag.get_text(),
                    f"{name}: og:title {og('title')['content']!r} != <title> {title_tag.get_text()!r}",
                )
        check(bool(og("description") and og("description").get("content")), f"{name}: missing og:description")
        check(bool(og("image") and og("image").get("content")), f"{name}: missing og:image")
        check(bool(og("image:width") and og("image:width").get("content")), f"{name}: missing og:image:width")
        check(bool(og("image:height") and og("image:height").get("content")), f"{name}: missing og:image:height")
        check(bool(og("image:alt") and og("image:alt").get("content")), f"{name}: missing og:image:alt")
        check(og("url") is not None, f"{name}: missing og:url")
        if og("url"):
            check(
                og("url").get("content") == url,
                f"{name}: og:url {og('url').get('content')!r} != {url!r}",
            )
        og_type_val = og("type").get("content") if og("type") else None
        check(
            og_type_val in ("website", "article"),
            f"{name}: og:type is {og_type_val!r}, expected 'website' or 'article'",
        )

        # Favicons
        check(
            bool(head.find("link", attrs={"rel": "icon", "type": "image/svg+xml"})),
            f"{name}: missing SVG favicon",
        )
        check(
            bool(head.find("link", attrs={"rel": "icon", "sizes": "any"})),
            f"{name}: missing ICO favicon",
        )

        # Google Fonts preconnects
        preconnects = {lnk.get("href", "") for lnk in head.find_all("link", rel="preconnect")}
        check("https://fonts.googleapis.com" in preconnects, f"{name}: missing fonts.googleapis.com preconnect")
        check("https://fonts.gstatic.com" in preconnects, f"{name}: missing fonts.gstatic.com preconnect")

        # CSS: main.css + at least one page-specific stylesheet
        stylesheets = [lnk.get("href", "") for lnk in head.find_all("link", rel="stylesheet")]
        check("main.css" in stylesheets, f"{name}: missing main.css")
        check(any(s != "main.css" for s in stylesheets), f"{name}: no page-specific CSS")

    assert not errors, f"{len(errors)} head issue(s) found: " + " | ".join(errors)


# ---------------------------------------------------------------------------
# 6. Internal link / asset validity
# ---------------------------------------------------------------------------

def test_internal_links_resolve():
    """All relative href/src attributes must point to files that exist on disk."""
    broken: list[str] = []
    for f in get_html_files(EXCLUDE_FROM_NAV_CHECKS):
        soup = parse(f)
        for tag in soup.find_all(True):
            for attr in ("href", "src"):
                val = tag.get(attr, "")
                if not val:
                    continue
                # Skip absolute URLs, mailto, fragments, data URIs
                if re.match(r"^(https?://|mailto:|#|//|data:)", val):
                    continue
                # Strip query strings and fragments before resolving
                path_part = val.split("?")[0].split("#")[0]
                if not path_part:
                    continue
                resolved = (f.parent / path_part).resolve()
                if not resolved.exists():
                    broken.append(
                        f"  {f.relative_to(REPO_ROOT)}: <{tag.name} {attr}={val!r}>"
                    )
    assert not broken, "Broken internal links/assets:\n" + "\n".join(broken)

# ---------------------------------------------------------------------------
# 7. Exactly one active-link per page
# ---------------------------------------------------------------------------

def test_single_active_link():
    """
    Each of the 6 main nav pages must have exactly one active-link pointing to itself.
    All other pages must have zero active-links.
    """
    for f in get_html_files(EXCLUDE_FROM_NAV_CHECKS):
        rel = str(f.relative_to(REPO_ROOT))
        soup = parse(f)
        active = soup.select("nav a.active-link")

        if rel in NAV_HREFS:
            assert len(active) == 1, (
                f"{f.name}: expected 1 active-link, got {len(active)}"
            )
            href = active[0].get("href", "")
            assert href == rel, (
                f"{f.name}: active-link points to {href!r}, expected {rel!r}"
            )
        else:
            assert len(active) == 0, (
                f"{f.name}: non-nav page should have 0 active-links, got {len(active)} "
                f"(pointing to {[a.get('href') for a in active]})"
            )


# ---------------------------------------------------------------------------
# 8. Image alt text
# ---------------------------------------------------------------------------

def test_image_alt_text():
    """Every <img> must have a non-empty alt attribute."""
    missing: list[str] = []
    for f in get_html_files(EXCLUDE_FROM_NAV_CHECKS):
        soup = parse(f)
        for img in soup.find_all("img"):
            alt = img.get("alt")
            if alt is None or not alt.strip():
                missing.append(f"  {f.name}: <img src={img.get('src', '?')!r}>")
    assert not missing, "Images missing alt text:\n" + "\n".join(missing)


# ---------------------------------------------------------------------------
# 9. RSS integrity
# ---------------------------------------------------------------------------

def test_rss_integrity():
    """RSS feed must have unique GUIDs and parseable pubDates."""
    tree = ET.parse(REPO_ROOT / "rss.xml")
    channel = tree.getroot().find("channel")

    guids: list[str] = []
    bad_dates: list[str] = []

    for item in channel.findall("item"):
        guid_el = item.find("guid")
        if guid_el is not None and guid_el.text:
            guids.append(guid_el.text.strip())

        pub_el = item.find("pubDate")
        if pub_el is not None and pub_el.text:
            if parsedate(pub_el.text.strip()) is None:
                bad_dates.append(pub_el.text.strip())

    dupes = sorted({g for g in guids if guids.count(g) > 1})
    assert not dupes, f"Duplicate GUIDs in RSS: {dupes}"
    assert not bad_dates, f"Invalid pubDate values in RSS: {bad_dates}"


# ---------------------------------------------------------------------------
# 10. Sitemap validity
# ---------------------------------------------------------------------------

def test_sitemap_validity():
    """Sitemap must have unique <loc> values and valid ISO 8601 <lastmod> dates."""
    tree = ET.parse(REPO_ROOT / "sitemap.xml")
    root = tree.getroot()

    locs = [el.text.strip() for el in root.iter(f"{{{SITEMAP_NS}}}loc") if el.text]
    lastmods = [el.text.strip() for el in root.iter(f"{{{SITEMAP_NS}}}lastmod") if el.text]

    dupes = sorted({l for l in locs if locs.count(l) > 1})
    assert not dupes, f"Duplicate <loc> in sitemap: {dupes}"

    bad_dates = []
    for d in lastmods:
        try:
            date.fromisoformat(d)
        except ValueError:
            bad_dates.append(d)
    assert not bad_dates, f"Invalid <lastmod> dates in sitemap: {bad_dates}"


# ---------------------------------------------------------------------------
# 11. rss.html entries match rss.xml items
# ---------------------------------------------------------------------------

def test_rss_html_matches_rss_xml():
    """Every item link in rss.xml must appear as an article-container href in rss.html, and vice versa."""
    # Collect URLs from rss.html  (<a class="article-container" href="...">)
    html_soup = parse(REPO_ROOT / "rss.html")
    html_urls = {
        a["href"]
        for a in html_soup.find_all("a", class_="article-container")
        if a.get("href")
    }

    # Collect URLs from rss.xml  (<link> or <guid> per <item>)
    tree = ET.parse(REPO_ROOT / "rss.xml")
    channel = tree.getroot().find("channel")
    xml_urls: set[str] = set()
    for item in channel.findall("item"):
        for tag in ("link", "guid"):
            el = item.find(tag)
            if el is not None and el.text:
                xml_urls.add(el.text.strip())

    in_xml_not_html = sorted(xml_urls - html_urls)
    in_html_not_xml = sorted(html_urls - xml_urls)

    problems = []
    if in_xml_not_html:
        problems.append("In rss.xml but missing from rss.html:\n" + "\n".join(f"  {u}" for u in in_xml_not_html))
    if in_html_not_xml:
        problems.append("In rss.html but missing from rss.xml:\n" + "\n".join(f"  {u}" for u in in_html_not_xml))
    assert not problems, "\n".join(problems)


# ---------------------------------------------------------------------------
# 12. sitemap.html entries match sitemap.xml locs
# ---------------------------------------------------------------------------

def test_sitemap_html_matches_sitemap_xml():
    """Every <loc> in sitemap.xml must appear as a link in sitemap.html, and vice versa."""
    # Collect URLs from sitemap.html — only absolute rupumped.github.io hrefs in <main>
    html_soup = parse(REPO_ROOT / "sitemap.html")
    main = html_soup.find("main")
    assert main is not None, "sitemap.html: missing <main>"
    html_urls = {
        a["href"]
        for a in main.find_all("a", href=True)
        if a["href"].startswith(BASE_URL)
    }

    # Collect URLs from sitemap.xml
    tree = ET.parse(REPO_ROOT / "sitemap.xml")
    root = tree.getroot()
    xml_urls = {el.text.strip() for el in root.iter(f"{{{SITEMAP_NS}}}loc") if el.text}

    in_xml_not_html = sorted(xml_urls - html_urls)
    in_html_not_xml = sorted(html_urls - xml_urls)

    problems = []
    if in_xml_not_html:
        problems.append("In sitemap.xml but missing from sitemap.html:\n" + "\n".join(f"  {u}" for u in in_xml_not_html))
    if in_html_not_xml:
        problems.append("In sitemap.html but missing from sitemap.xml:\n" + "\n".join(f"  {u}" for u in in_html_not_xml))
    assert not problems, "\n".join(problems)


# ---------------------------------------------------------------------------
# 13. W3C compliance  (requires network; skip with: pytest -k "not w3c")
# ---------------------------------------------------------------------------

@pytest.mark.network
def test_w3c_compliance():
    """Every page must pass the W3C Nu HTML validator with zero errors (warnings OK)."""
    files = get_html_files(EXCLUDE_FROM_NAV_CHECKS)
    all_errors: dict[str, list] = {}
    skipped: list[str] = []

    for f in files:
        try:
            resp = requests.post(
                "https://validator.w3.org/nu/?out=json",
                headers={
                    "Content-Type": "text/html; charset=utf-8",
                    "User-Agent": "rupumped-site-tests/1.0 (https://rupumped.github.io)",
                    "Accept": "application/json",
                },
                data=f.read_bytes(),
                timeout=30,
            )
            if resp.status_code == 403:
                skipped.append(f.name)
                time.sleep(2)
                continue
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            skipped.append(f"{f.name} ({e})")
            continue

        errors = [m for m in resp.json().get("messages", []) if m.get("type") == "error"]
        if errors:
            all_errors[f.name] = errors
        time.sleep(1)  # be polite to the W3C validator

    if skipped:
        print(f"\nW3C: skipped {len(skipped)} pages due to network/auth issues: {skipped}")

    if all_errors:
        lines = []
        for name, errs in all_errors.items():
            for e in errs:
                lines.append(f"  {name}:{e.get('lastLine', '?')}: {e.get('message', '')}")
        pytest.fail("W3C validation errors:\n" + "\n".join(lines))
