#!/usr/bin/env node
/**
 * Seed exercise_info table in Supabase with AI-generated coaching content.
 * Usage: node scripts/seedExerciseInfo.js
 * Requires VITE_ANTHROPIC_API_KEY (in .env or environment).
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ───────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const result = {};
    readFileSync(join(__dirname, '../.env'), 'utf8')
      .split('\n')
      .forEach((line) => {
        const eq = line.indexOf('=');
        if (eq === -1) return;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (key) result[key] = val;
      });
    return result;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };

const ANTHROPIC_KEY = env.VITE_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY;
const SUPABASE_URL  = env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = env.VITE_SUPABASE_ANON_KEY;

if (!ANTHROPIC_KEY) {
  console.error('❌  Missing VITE_ANTHROPIC_API_KEY in .env or environment');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Import exercise list ─────────────────────────────────────────────────
const { exercises } = await import('../src/data/exercises.js');

const CONCURRENCY = 5;
const MODEL       = 'claude-sonnet-4-20250514';

function buildPrompt(name) {
  return `You are a certified strength coach. Explain how to perform ${name} including: starting position, step-by-step execution, key coaching cues, common mistakes to avoid, and primary muscles worked. Return JSON only with keys: setup, execution, coaching_cues, common_mistakes, muscles_worked. Be concise and practical.`;
}

// ── Fetch info from Claude ───────────────────────────────────────────────
async function fetchInfo(name) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(name) }],
  });
  const raw = msg.content[0].text.trim();
  // Strip markdown code fences if present
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(json);
}

// ── Upsert one exercise (ignore conflict = safe re-run) ──────────────────
async function upsertInfo(name, info) {
  const { error } = await supabase.from('exercise_info').upsert(
    {
      exercise_name:   name,
      setup:           info.setup            ?? null,
      execution:       info.execution        ?? null,
      coaching_cues:   info.coaching_cues    ?? null,
      common_mistakes: info.common_mistakes  ?? null,
      muscles_worked:  info.muscles_worked   ?? null,
    },
    { onConflict: 'exercise_name', ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
}

// ── Process one exercise with one retry ──────────────────────────────────
async function processExercise(ex, position, total) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await fetchInfo(ex.name);
      await upsertInfo(ex.name, info);
      process.stdout.write(`✓ ${position}/${total} — ${ex.name}\n`);
      return { ok: true };
    } catch (err) {
      if (attempt === 1) {
        process.stdout.write(`✗ Failed: ${ex.name} — retrying once\n`);
        // Small back-off before retry
        await new Promise((r) => setTimeout(r, 1500));
      } else {
        process.stdout.write(`✗ Skipped: ${ex.name} (${err.message})\n`);
        return { ok: false, name: ex.name };
      }
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const total = exercises.length;
  console.log(`\nSeeding exercise coaching info for ${total} exercises (${CONCURRENCY} concurrent)…\n`);

  const failed = [];

  for (let i = 0; i < exercises.length; i += CONCURRENCY) {
    const batch   = exercises.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((ex, j) => processExercise(ex, i + j + 1, total))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && !r.value?.ok) {
        failed.push(r.value?.name ?? '?');
      } else if (r.status === 'rejected') {
        failed.push('?');
      }
    }
  }

  console.log(`\nSeeded: ${total - failed.length}/${total}.`);
  if (failed.length) {
    console.log(`Failed: ${failed.length} — ${failed.join(', ')}`);
  } else {
    console.log('All exercises seeded successfully!');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
