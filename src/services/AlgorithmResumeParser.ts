import { cleanText } from '../utils/textCleaner';
import { EMAIL_REGEX, EXPERIENCE_REGEX, PHONE_REGEX } from '../utils/regex';
import { DEFAULT_SKILLS } from '../config/skills';

const ROLE_KEYWORDS = [
  'engineer',
  'developer',
  'manager',
  'designer',
  'consultant',
  'analyst',
  'qa',
  'intern',
  'lead',
  'director',
  'architect',
];

const EDUCATION_KEYWORDS = ['bachelor', 'b.e', 'b.sc', "b.tech", 'm.s', 'm.tech', 'master', 'mba', 'phd'];

export class AlgorithmResumeParser {
  constructor() {}

  parseResume(rawText: string) {
    const cleaned = cleanText(rawText || '');
    const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);

    // Name heuristic: first non-empty line that doesn't contain @ or digits
    let name: string | undefined = undefined;
    for (const line of lines.slice(0, 3)) {
      if (!/\b@\b/.test(line) && !/\d/.test(line) && line.length < 80) {
        name = line;
        break;
      }
    }

    // Email
    const emailMatch = cleaned.match(EMAIL_REGEX);
    const email = emailMatch ? emailMatch[0] : undefined;

    // Phone
    const phoneMatch = cleaned.match(PHONE_REGEX);
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    // Skills: detect from a static skills dictionary first, then fallback to heuristic line parsing
    let skills: string[] = [];
    const normalizedText = cleaned.toLowerCase();
    for (const skill of DEFAULT_SKILLS) {
      const lowerSkill = skill.toLowerCase();
      const regex = new RegExp(`\\b${lowerSkill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalizedText)) {
        skills.push(skill);
      }
    }
    skills = Array.from(new Set(skills));

    if (skills.length === 0) {
      // fallback: heuristic based on the skills line or comma-separated values
      for (const line of lines) {
        if (/\bskills?\b/i.test(line) || /key skills/i.test(line)) {
          const parts = line.split(/[:\-]/).slice(1).join(':') || line;
          skills = parts.split(/[;,|•·]/).map((s) => s.trim()).filter(Boolean);
          break;
        }
      }
      if (skills.length === 0) {
        for (const line of lines) {
          const parts = line.split(/[,;|]/).map((p) => p.trim());
          if (parts.length >= 2 && parts.every((p) => p.length < 40)) {
            skills = parts.filter(Boolean);
            break;
          }
        }
      }
    }

    // Role and Company: try patterns like "Role at Company" or first two lines
    let role: string | undefined = undefined;
    let company: string | undefined = undefined;
    for (const line of lines.slice(0, 6)) {
      const atMatch = line.match(/(.+)\s+at\s+(.+)/i);
      if (atMatch) {
        role = atMatch[1].trim();
        company = atMatch[2].trim();
        break;
      }
      // role keyword heuristic
      const low = line.toLowerCase();
      for (const kw of ROLE_KEYWORDS) {
        if (low.includes(kw)) {
          role = role || line;
          break;
        }
      }
    }
    // Company fallback: look for 'Company:' lines
    if (!company) {
      for (const line of lines) {
        const m = line.match(/company[:\-]\s*(.+)/i);
        if (m) {
          company = m[1].trim();
          break;
        }
      }
    }

    // Education
    let education: string | undefined = undefined;
    for (const line of lines) {
      const low = line.toLowerCase();
      for (const kw of EDUCATION_KEYWORDS) {
        if (low.includes(kw)) {
          education = line;
          break;
        }
      }
      if (education) break;
    }

    // Experience (years)
    let totalExperience: number | undefined = undefined;
    const expMatch = cleaned.match(EXPERIENCE_REGEX);
    if (expMatch) totalExperience = parseFloat(expMatch[1]);

    return {
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      location: undefined,
      skills,
      company: company || undefined,
      role: role || undefined,
      education: education || undefined,
      totalExperience: totalExperience || undefined,
      rawText: cleaned,
    };
  }
}
