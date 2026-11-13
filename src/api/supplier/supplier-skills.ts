/**
 * Supplier skills: short free-text capabilities ("vegan menus",
 * "wedding dj") that sit between the broad categories and the full
 * description. They feed the embedding text and keyword search so the AI
 * can narrow a match to what the customer actually asked for.
 */

/** Cap per supplier — a long list dilutes the embedding like too many categories do. */
export const MAX_SUPPLIER_SKILLS = 20;

/** Cap per skill — anything longer is a sentence, not a skill. */
export const MAX_SKILL_LENGTH = 40;

/**
 * Trim, collapse whitespace, lowercase and dedupe. Over-long or empty
 * entries are dropped rather than rejected so an AI draft with one bad
 * item still saves the rest.
 */
export function normalizeSkills(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const value of raw) {
    const skill = String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!skill || skill.length > MAX_SKILL_LENGTH) continue;
    seen.add(skill);
    if (seen.size >= MAX_SUPPLIER_SKILLS) break;
  }
  return [...seen];
}

export interface SkillDraftSource {
  companyName: string;
  tagline: string | null;
  description: string | null;
  services: { name: string; description: string | null }[];
  categories: { category: { categoryName: string } }[];
}

/** Whether the profile has enough text for the AI to draft from. */
export function hasSkillDraftMaterial(s: SkillDraftSource): boolean {
  return !!(s.tagline || s.description || s.services.length > 0);
}

export const SKILL_DRAFT_SYSTEM_PROMPT = `You extract skills for a supplier on Solvo, a service marketplace in Costa Rica.

A skill is a short, specific capability a customer might search for — 1 to 4 words, lowercase, e.g. "vegan menus", "wedding dj", "same-day ac repair", "drone photography", "kids parties".

RULES:
- Return ONLY a JSON array of strings, nothing else. Example: ["vegan menus", "corporate catering"]
- 5 to 12 skills. Fewer is fine for a thin profile.
- Use ONLY what the profile states or clearly implies. Never invent services.
- Prefer specific over generic: "wedding cakes" beats "baking"; skip the bare category name.
- Write each skill in the profile's language. If the profile mixes Spanish and English, use English.`;

/** Profile text the AI drafts from. */
export function buildSkillDraftPrompt(s: SkillDraftSource): string {
  const lines = [`Business: ${s.companyName}`];
  if (s.tagline) lines.push(`Tagline: ${s.tagline}`);
  if (s.description) lines.push(`Description: ${s.description}`);
  if (s.services.length > 0) {
    lines.push(
      'Services:\n' +
        s.services
          .map((sv) => `- ${sv.description ? `${sv.name}: ${sv.description}` : sv.name}`)
          .join('\n'),
    );
  }
  if (s.categories.length > 0) {
    lines.push('Categories: ' + s.categories.map((c) => c.category.categoryName).join(', '));
  }
  return lines.join('\n');
}

/**
 * Pull the JSON array out of the model's reply. Models sometimes wrap it
 * in a code fence or a sentence, so look for the first `[...]` block.
 */
export function parseSkillDraft(reply: string): string[] {
  const match = reply.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return normalizeSkills(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return [];
  }
}
