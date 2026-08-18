#!/usr/bin/env node
/*
Simple Instagram Keyword Research Tool
Generates keyword ideas for Instagram captions and short scripts with importance percentages.
Usage: node index.js "seed keyword, another seed"
*/

const modifiers = [
  'tips', 'reels', 'caption', 'script', 'how to', 'tutorial', 'best', 'viral', 'ideas', 'hacks', 'trends', 'aesthetic', 'behind the scenes', 'challenge'
];

const synonyms = {
  beauty: ['makeup', 'skincare', 'glow'],
  fitness: ['workout', 'wellness', 'gym'],
  food: ['recipes', 'cooking', 'bakes'],
  travel: ['wanderlust', 'trip', 'vacation'],
  music: ['beats', 'song', 'track']
};

function normalize(s) {
  return s.trim().toLowerCase();
}

function generateFromSeed(seed) {
  const seedNorm = normalize(seed);
  const ideas = new Set();
  ideas.add(seedNorm);

  // Combine with modifiers
  modifiers.forEach(mod => {
    ideas.add(`${seedNorm} ${mod}`);
    ideas.add(`${mod} ${seedNorm}`);
  });

  // Add "how to" form explicitly
  ideas.add(`how to ${seedNorm}`);

  // Add synonyms
  Object.keys(synonyms).forEach(key => {
    if (seedNorm.includes(key)) {
      synonyms[key].forEach(s => ideas.add(`${seedNorm.replace(key, s)}`));
      synonyms[key].forEach(s => ideas.add(`${s} ${seedNorm.replace(key, '').trim()}`));
    }
  });

  // Short/hashtag forms
  ideas.add(seedNorm.replace(/\s+/g, ''));
  ideas.add('#' + seedNorm.replace(/\s+/g, ''));

  return Array.from(ideas).map(s => s.trim()).filter(Boolean);
}

function scoreKeyword(keyword, seed) {
  const k = normalize(keyword);
  const s = normalize(seed);

  // Base semantic factor
  let semantic = 0.75;
  if (k === s) semantic = 0.98;
  else if (k.includes(s)) semantic = 0.92;
  else {
    // check synonyms
    for (const key of Object.keys(synonyms)) {
      if (s.includes(key)) {
        if (synonyms[key].some(x => k.includes(x))) {
          semantic = 0.88;
          break;
        }
      }
    }
  }

  // Bonuses
  let bonus = 0;
  if (/\b(how to|tutorial|tips|best|viral|hacks|ideas|trends|reels|aesthetic)\b/.test(k)) bonus += 0.06;
  if (/^#?\w+$/.test(k)) bonus += 0.04; // hashtag or single-word
  // shorter is often better for hashtags/captions
  const wordCount = k.split(/\s+/).filter(Boolean).length;
  if (wordCount === 1) bonus += 0.03;
  if (wordCount >= 4) bonus -= 0.04;

  let raw = semantic + bonus;
  if (raw > 1) raw = 1;
  if (raw < 0.1) raw = 0.1;

  // Convert to percentage and add slight randomness for ranking stability (deterministic using char codes)
  const rand = (Array.from(k).reduce((a, c) => a + c.charCodeAt(0), 0) % 7) / 100; // 0..0.06
  let pct = Math.round((raw + rand) * 100);
  if (pct > 100) pct = 100;
  return pct;
}

function generate(keywordsInput) {
  const seeds = keywordsInput.split(',').map(s => s.trim()).filter(Boolean);
  const all = new Map(); // keyword -> best score and origin seed

  seeds.forEach(seed => {
    const ideas = generateFromSeed(seed);
    ideas.forEach(idea => {
      const pct = scoreKeyword(idea, seed);
      const prev = all.get(idea);
      if (!prev || pct > prev.score) all.set(idea, { score: pct, seed });
    });
  });

  // Build sorted list
  const list = Array.from(all.entries()).map(([k, v]) => ({ keyword: k, score: v.score, seed: v.seed }));
  list.sort((a, b) => b.score - a.score || a.keyword.localeCompare(b.keyword));
  return list;
}

// CLI
const input = process.argv.slice(2).join(' ');
if (!input) {
  console.log('\nUsage: node index.js "seed keyword, another seed"\nExample: node index.js "vegan recipes, summer outfits"\n');
  process.exit(0);
}

const results = generate(input);
console.log('\nKeyword ideas for:', input);
console.log('-----------------------------------------');
results.forEach(r => {
  console.log(`${r.keyword} — ${r.score}% (${r.seed})`);
});
console.log('\nTop 10:');
results.slice(0, 10).forEach((r, i) => console.log(`${i + 1}. ${r.keyword} — ${r.score}%`));
console.log('\nYou can pipe or redirect the output.');
