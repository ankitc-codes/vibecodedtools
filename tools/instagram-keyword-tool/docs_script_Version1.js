// Converted browser-friendly logic based on your CLI tool

const modifiers = [
  'tips', 'reels', 'caption', 'script', 'how to', 'tutorial', 'best',
  'viral', 'ideas', 'hacks', 'trends', 'aesthetic', 'behind the scenes', 'challenge'
];

const synonyms = {
  beauty: ['makeup', 'skincare', 'glow'],
  fitness: ['workout', 'wellness', 'gym'],
  food: ['recipes', 'cooking', 'bakes'],
  travel: ['wanderlust', 'trip', 'vacation'],
  music: ['beats', 'song', 'track']
};

function normalize(s) { return s.trim().toLowerCase(); }

function generateFromSeed(seed) {
  const seedNorm = normalize(seed);
  const ideas = new Set();
  ideas.add(seedNorm);

  modifiers.forEach(mod => {
    ideas.add(`${seedNorm} ${mod}`);
    ideas.add(`${mod} ${seedNorm}`);
  });

  ideas.add(`how to ${seedNorm}`);

  Object.keys(synonyms).forEach(key => {
    if (seedNorm.includes(key)) {
      synonyms[key].forEach(s => ideas.add(`${seedNorm.replace(key, s)}`));
      synonyms[key].forEach(s => ideas.add(`${s} ${seedNorm.replace(key, '').trim()}`));
    }
  });

  ideas.add(seedNorm.replace(/\s+/g, ''));
  ideas.add('#' + seedNorm.replace(/\s+/g, ''));
  return Array.from(ideas).map(s => s.trim()).filter(Boolean);
}

function scoreKeyword(keyword, seed) {
  const k = normalize(keyword);
  const s = normalize(seed);

  let semantic = 0.75;
  if (k === s) semantic = 0.98;
  else if (k.includes(s)) semantic = 0.92;
  else {
    for (const key of Object.keys(synonyms)) {
      if (s.includes(key)) {
        if (synonyms[key].some(x => k.includes(x))) { semantic = 0.88; break; }
      }
    }
  }

  let bonus = 0;
  if (/\b(how to|tutorial|tips|best|viral|hacks|ideas|trends|reels|aesthetic)\b/.test(k)) bonus += 0.06;
  if (/^#?\w+$/.test(k)) bonus += 0.04;
  const wordCount = k.split(/\s+/).filter(Boolean).length;
  if (wordCount === 1) bonus += 0.03;
  if (wordCount >= 4) bonus -= 0.04;

  let raw = semantic + bonus;
  raw = Math.max(0.1, Math.min(1, raw));

  // deterministic pseudo-randomness based on chars
  const rand = (Array.from(k).reduce((a, c) => a + c.charCodeAt(0), 0) % 7) / 100;
  let pct = Math.round((raw + rand) * 100);
  pct = Math.min(100, pct);
  return pct;
}

function generate(keywordsInput) {
  const seeds = keywordsInput.split(',').map(s => s.trim()).filter(Boolean);
  const all = new Map();
  seeds.forEach(seed => {
    const ideas = generateFromSeed(seed);
    ideas.forEach(idea => {
      const pct = scoreKeyword(idea, seed);
      const prev = all.get(idea);
      if (!prev || pct > prev.score) all.set(idea, { score: pct, seed });
    });
  });

  const list = Array.from(all.entries()).map(([k, v]) => ({ keyword: k, score: v.score, seed: v.seed }));
  list.sort((a, b) => b.score - a.score || a.keyword.localeCompare(b.keyword));
  return list;
}

// DOM wiring
document.getElementById('generate').addEventListener('click', () => {
  const input = document.getElementById('seeds').value;
  if (!input.trim()) {
    alert('Please add seed keywords.');
    return;
  }
  const results = generate(input);
  const listDiv = document.getElementById('list');
  listDiv.innerHTML = '';
  results.forEach(r => {
    const p = document.createElement('p');
    p.textContent = `${r.keyword} — ${r.score}% (${r.seed})`;
    listDiv.appendChild(p);
  });

  const top10 = document.getElementById('top10');
  top10.innerHTML = '';
  results.slice(0, 10).forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.keyword} — ${r.score}%`;
    top10.appendChild(li);
  });
});

document.getElementById('copy').addEventListener('click', () => {
  const topText = Array.from(document.querySelectorAll('#top10 li')).map(li => li.textContent).join('\n');
  if (!topText) { alert('No Top 10 to copy. Generate first.'); return; }
  navigator.clipboard?.writeText(topText).then(() => { alert('Top 10 copied to clipboard'); });
});