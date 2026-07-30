(function () {
	'use strict';

	const DATA_URL = 'https://rupumped.github.io/successive-h-indices/rankings.json';
	const $loading = document.getElementById('explorer-loading');
	const $ui      = document.getElementById('explorer-ui');
	const $search  = document.getElementById('explorer-search');
	const $clear   = document.getElementById('explorer-clear');
	const $drop    = document.getElementById('explorer-dropdown');
	const $res     = document.getElementById('explorer-results');
	const $hints   = document.getElementById('explorer-hints');

	if (!$loading || !$ui || !$search || !$clear || !$drop || !$res || !$hints) return;

	let db, entries = [], instMap = {}, countryMap = {}, instRanks = {}, countryRanks = {};

	function push(map, key, val) {
		if (!map[key]) map[key] = [];
		map[key].push(val);
	}

	fetch(DATA_URL)
		.then(function (r) { return r.text(); })
		.then(function (text) {
			// The source JSON contains bare NaN (invalid JSON) for some entries.
			// Replace with null so the parser doesn't choke.
			return JSON.parse(text.replace(/:\s*NaN\b/g, ': null'));
		})
		.then(function (data) {
			db = data;
			var iR = buildTieRanks(db.institutions, 'h2');
			db.institutions.forEach(function (it, i) { instMap[it.name]   = { rank: iR[i], h2: it.h2 }; });
			var cR = buildTieRanks(db.countries, 'h3');
			db.countries.forEach(function (c, i)     { countryMap[c.name] = { rank: cR[i], h3: c.h3 }; });
			Object.keys(db.fields).forEach(function (n) {
				var fd = db.fields[n];
				var fI = buildTieRanks(fd.institutions, 'h2'), fC = buildTieRanks(fd.countries, 'h3');
				fd.institutions.forEach(function (it, i) { push(instRanks,   it.name, { cat: n, type: 'Field',    rank: fI[i], score: it.h2 }); });
				fd.countries.forEach(function (c, i)    { push(countryRanks, c.name,  { cat: n, type: 'Field',    rank: fC[i], score: c.h3  }); });
			});
			Object.keys(db.subfields).forEach(function (n) {
				var sd = db.subfields[n];
				var sI = buildTieRanks(sd.institutions, 'h2'), sC = buildTieRanks(sd.countries, 'h3');
				sd.institutions.forEach(function (it, i) { push(instRanks,   it.name, { cat: n, type: 'Subfield', rank: sI[i], score: it.h2 }); });
				sd.countries.forEach(function (c, i)    { push(countryRanks, c.name,  { cat: n, type: 'Subfield', rank: sC[i], score: c.h3  }); });
			});
			entries = []
				.concat(Object.keys(db.fields).map(function (n)    { return { name: n,      kind: 'field'       }; }))
				.concat(Object.keys(db.subfields).map(function (n) { return { name: n,      kind: 'subfield'    }; }))
				.concat(db.countries.filter(function (c)  { return c.name; }).map(function (c)  { return { name: c.name, kind: 'country'     }; }))
				.concat(db.institutions.filter(function (it) { return it.name; }).map(function (it) { return { name: it.name, kind: 'institution' }; }))
				.map(function (e) { return { name: e.name, kind: e.kind, nl: e.name.toLowerCase() }; });
			$loading.hidden = true;
			$ui.hidden = false;
			buildHints();
			handleHash();
		})
		.catch(function (err) {
			console.error('Rankings Explorer failed to load:', err);
			$loading.innerHTML = '<p>Failed to load data — try refreshing.</p>';
		});

	$clear.addEventListener('click', function () {
		$search.value = '';
		$clear.hidden = true;
		hideDrop();
		$res.innerHTML = '';
		$hints.hidden = false;
		if (window.location.hash.indexOf('#explore=') === 0) {
			history.replaceState(null, '', window.location.pathname + window.location.search);
		}
		$search.focus();
	});

	var timer;
	$search.addEventListener('input', function () {
		$clear.hidden = !$search.value;
		clearTimeout(timer);
		timer = setTimeout(suggest, 100);
	});

	function suggest() {
		var q = $search.value.trim();
		if (!q || !db) return hideDrop();
		var ql = q.toLowerCase();
		var pre = [], sub = [];
		for (var i = 0; i < entries.length; i++) {
			var e = entries[i];
			if (e.nl.indexOf(ql) === 0 && pre.length < 10) pre.push(e);
			else if (e.nl.indexOf(ql) >= 0 && sub.length < 20) sub.push(e);
			if (pre.length >= 10 && sub.length >= 20) break;
		}
		var hits = pre.concat(sub).slice(0, 10);
		hits.length ? showDrop(hits) : hideDrop();
	}

	function showDrop(hits) {
		$drop.innerHTML = '';
		hits.forEach(function (e) {
			var li = document.createElement('li');
			li.setAttribute('role', 'option');
			li.dataset.name = e.name;
			li.dataset.kind = e.kind;
			var badge = mk('span', 'type-badge'); badge.textContent = e.kind; badge.setAttribute('aria-hidden', 'true');
			var txt   = mk('span');               txt.textContent   = e.name;
			li.appendChild(badge); li.appendChild(txt);
			li.addEventListener('mousedown', function (ev) { ev.preventDefault(); pick(e.name, e.kind); });
			$drop.appendChild(li);
		});
		$drop.hidden = false;
	}

	function hideDrop() { $drop.hidden = true; $drop.innerHTML = ''; }
	function pick(name, kind) {
		$search.value = name;
		$clear.hidden = false;
		hideDrop();
		history.replaceState(null, '', '#explore=' + encodeURIComponent(name));
		render(name, kind);
	}

	function handleHash() {
		var hash = window.location.hash;
		if (hash.indexOf('#explore=') !== 0) return;
		var term = decodeURIComponent(hash.slice(9));
		var match = null;
		for (var i = 0; i < entries.length; i++) {
			if (entries[i].nl === term.toLowerCase()) { match = entries[i]; break; }
		}
		if (!match) return;
		$search.value = match.name;
		$clear.hidden = false;
		render(match.name, match.kind);
		document.getElementById('rankings-explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	window.addEventListener('hashchange', handleHash);

	$search.addEventListener('keydown', function (ev) {
		if ($drop.hidden) {
			if (ev.key === 'Enter') {
				var q = $search.value.trim().toLowerCase();
				var m = null;
				for (var i = 0; i < entries.length; i++) { if (entries[i].nl === q) { m = entries[i]; break; } }
				if (m) pick(m.name, m.kind);
			}
			return;
		}
		var items = Array.prototype.slice.call($drop.querySelectorAll('li'));
		if (!items.length) return;
		var ai = -1;
		for (var i = 0; i < items.length; i++) { if (items[i].classList.contains('active')) { ai = i; break; } }
		if (ev.key === 'ArrowDown') {
			ev.preventDefault();
			if (ai >= 0) items[ai].classList.remove('active');
			items[ai < 0 ? 0 : (ai + 1) % items.length].classList.add('active');
		} else if (ev.key === 'ArrowUp') {
			ev.preventDefault();
			if (ai >= 0) items[ai].classList.remove('active');
			items[ai <= 0 ? items.length - 1 : ai - 1].classList.add('active');
		} else if (ev.key === 'Enter') {
			ev.preventDefault();
			if (ai >= 0) { pick(items[ai].dataset.name, items[ai].dataset.kind); }
		} else if (ev.key === 'Escape') {
			hideDrop();
		}
	});

	document.addEventListener('click', function (ev) { if (!ev.target.closest('#rankings-explorer')) hideDrop(); });

	function render(name, kind) {
		$hints.hidden = true;
		$res.innerHTML = '';
		if      (kind === 'field' || kind === 'subfield') renderCategory(name, kind);
		else if (kind === 'institution')                   renderInstitution(name);
		else if (kind === 'country')                       renderCountry(name);
	}

	function renderCategory(name, kind) {
		var fd    = kind === 'field' ? db.fields[name] : db.subfields[name];
		var label = kind === 'field' ? 'Field' : 'Subfield';
		hdr(name, label);
		var grid = mk('div', 'results-grid');
		var hasTie = false;

		function tiedRows(items, scoreKey) {
			var rows = [], baseRank = 1;
			for (var i = 0; i < items.length; i++) {
				var score = items[i][scoreKey];
				var withPrev = i > 0 && score !== null && score === items[i - 1][scoreKey];
				var withNext = i < items.length - 1 && score !== null && score === items[i + 1][scoreKey];
				if (i > 0 && !withPrev) baseRank = i + 1;
				if (withPrev || withNext) hasTie = true;
				rows.push([(withPrev || withNext) ? baseRank + '*' : baseRank, items[i].name, score]);
			}
			return rows;
		}

		function col(lbl, headers, rows, linkKind) {
			var d  = mk('div');
			var lp = mk('p', 'table-label'); lp.textContent = lbl;
			d.appendChild(lp); d.appendChild(tbl(headers, rows, [1], 1, linkKind));
			return d;
		}
		grid.appendChild(col('Institutions', ['Rank', 'Institution', 'h<sub>2</sub>'],
			tiedRows(fd.institutions.slice(0, 10), 'h2'), 'institution'));
		grid.appendChild(col('Countries', ['Rank', 'Country', 'h<sub>3</sub>'],
			tiedRows(fd.countries.slice(0, 10), 'h3'), 'country'));
		$res.appendChild(grid);
		if (hasTie) $res.appendChild(note('* Tied score — entries with equal scores share a rank.'));
	}

	function renderInstitution(name) {
		var info = instMap[name];
		hdr(name, 'Institution', info ? info.rank : undefined);
		var specific = (instRanks[name] || []).slice().sort(function (a, b) { return a.rank - b.rank; });
		if (!specific.length) {
			$res.appendChild(empty('Not quite in the top 100 in any field'));
			return;
		}
		var container = mk('div', 'ranking-badges');
		specific.forEach(function (r) { container.appendChild(rankBadge(r.rank, r.cat, r.type.toLowerCase())); });
		$res.appendChild(container);
		$res.appendChild(note('Field and subfield ranks reflect position within the top 100 in that category.'));
	}

	function renderCountry(name) {
		var info = countryMap[name];
		hdr(name, 'Country', info ? info.rank : undefined);
		var specific = (countryRanks[name] || []).slice().sort(function (a, b) { return a.rank - b.rank; });
		if (!specific.length) {
			$res.appendChild(empty('Not quite in the top 100 in any field'));
			return;
		}
		var container = mk('div', 'ranking-badges');
		specific.forEach(function (r) { container.appendChild(rankBadge(r.rank, r.cat, r.type.toLowerCase())); });
		$res.appendChild(container);
		$res.appendChild(note('Field and subfield ranks reflect position within the top 100 in that category.'));
	}

	function rankBadge(rank, label, kind) {
		var medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : '';
		var b = mk(kind ? 'a' : 'span', 'ranking-badge');
		b.textContent = medal + '#' + fmt(rank) + ' ' + label;
		if (kind) {
			b.href = '#explore=' + encodeURIComponent(label);
			b.addEventListener('click', function (ev) { ev.preventDefault(); pick(label, kind); });
		}
		return b;
	}

	function hdr(name, label, overallRank) {
		var p = mk('p', 'results-header');
		var s = mk('strong'); s.textContent = name;
		var b = mk('span', 'type-badge'); b.textContent = label;
		p.appendChild(s); p.appendChild(document.createTextNode(' ')); p.appendChild(b);
		if (overallRank !== undefined) {
			p.appendChild(document.createTextNode(' '));
			p.appendChild(rankBadge(overallRank, 'Overall'));
		}
		var btn = document.createElement('button');
		btn.className = 'copy-link-btn';
		btn.title = 'Copy link';
		btn.setAttribute('aria-label', 'Copy link to this search');
		btn.textContent = '🔗';
		btn.addEventListener('click', function () {
			navigator.clipboard.writeText(window.location.href).then(function () {
				btn.textContent = '✅';
				setTimeout(function () { btn.textContent = '🔗'; }, 1500);
			});
		});
		p.appendChild(btn);
		$res.appendChild(p);
	}

	function empty(html) { var p = mk('p', 'explorer-empty'); p.innerHTML = html; return p; }
	function note(txt)   { var p = mk('p', 'explorer-note');  p.textContent = txt; return p; }
	function fmt(n)      { return n.toLocaleString('en-US'); }

	function tbl(headers, rows, leftCols, linkCol, linkKind) {
		leftCols = leftCols || [];
		var wrap  = mk('div', 'overflowable');
		var table = document.createElement('table');
		var thead = document.createElement('thead');
		var tr    = document.createElement('tr');
		headers.forEach(function (h) { var th = document.createElement('th'); th.innerHTML = h; tr.appendChild(th); });
		thead.appendChild(tr); table.appendChild(thead);
		var tbody = document.createElement('tbody');
		rows.forEach(function (cells) {
			var row = document.createElement('tr');
			cells.forEach(function (cell, i) {
				var td = document.createElement('td');
				if (linkKind !== undefined && i === linkCol) {
					var a = mk('a', 'explorer-row-link');
					a.textContent = cell;
					a.href = '#explore=' + encodeURIComponent(cell);
					a.addEventListener('click', function (ev) { ev.preventDefault(); pick(cell, linkKind); });
					td.appendChild(a);
				} else {
					td.textContent = cell;
				}
				if (leftCols.indexOf(i) >= 0) td.style.textAlign = 'left';
				row.appendChild(td);
			});
			tbody.appendChild(row);
		});
		table.appendChild(tbody); wrap.appendChild(table);
		return wrap;
	}

	function mk(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

	function buildTieRanks(items, scoreKey) {
		var ranks = [];
		for (var i = 0; i < items.length; i++) {
			var score = items[i][scoreKey];
			ranks.push(i === 0 || score === null || score !== items[i - 1][scoreKey] ? i + 1 : ranks[i - 1]);
		}
		return ranks;
	}

	function buildHints() {
		var lbl = mk('p', 'hints-label'); lbl.textContent = 'Did you know?';
		$hints.appendChild(lbl);
		var ul = document.createElement('ul'); ul.className = 'hints-list';
		function fact(parts) {
			var li = document.createElement('li');
			parts.forEach(function (p) {
				if (typeof p === 'string') {
					li.appendChild(document.createTextNode(p));
				} else {
					var a = document.createElement('a');
					a.textContent = p.text;
					a.href = '#explore=' + encodeURIComponent(p.name);
					a.addEventListener('click', function (ev) { ev.preventDefault(); pick(p.name, p.kind); });
					li.appendChild(a);
				}
			});
			ul.appendChild(li);
		}
		fact([{ text: 'CMU', name: 'Carnegie Mellon University', kind: 'institution' },
		      ' ranks #1 in ',
		      { text: 'CS', name: 'Computer Science', kind: 'field' },
		      ' but 175th overall']);
		fact([{ text: 'Wageningen', name: 'Wageningen University & Research', kind: 'institution' },
		      ' ranks #1 in ',
		      { text: 'Environmental Science', name: 'Environmental Science', kind: 'field' },
		      ' but 172nd overall']);
		fact([{ text: 'Shenyang Pharmaceutical University', name: 'Shenyang Pharmaceutical University', kind: 'institution' },
		      ' ranks #1 in ',
		      { text: 'Pharmacology', name: 'Pharmacology, Toxicology and Pharmaceutics', kind: 'field' },
		      ' but 535th overall']);
		$hints.appendChild(ul);
	}

	document.addEventListener('keydown', function (ev) {
		if (ev.key === '/' && document.activeElement !== $search && !ev.ctrlKey && !ev.metaKey) {
			ev.preventDefault();
			$search.focus();
		}
	});
})();
