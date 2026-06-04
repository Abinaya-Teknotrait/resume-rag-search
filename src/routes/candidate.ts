import { Router, Request, Response, NextFunction } from 'express';
import { getLogger } from '../services/LoggingService';
import { ResumeRepository } from '../repositories/ResumeRepository';
import { IApiResponse, IResume } from '../types/API';
import { AlgorithmResumeParser } from '../services/AlgorithmResumeParser';
import { NotFoundError, ValidationError } from '../utils/errors';

interface ICandidateEducation {
  degree: string;
  institution?: string;
  year?: string;
}

interface ICandidateExperience {
  title: string;
  company?: string;
  duration?: string;
  description?: string;
}

interface ICandidateProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  company?: string;
  education?: ICandidateEducation[];
  experience?: ICandidateExperience[];
  skills?: string[];
  projects?: { title: string; description: string }[];
  certifications?: string[];
  text?: string;
  experienceSummary?: string;
  processedAt?: string;
}

const router = Router();
const logger = getLogger();
const resumeRepository = new ResumeRepository();
const resumeParser = new AlgorithmResumeParser();

function isFieldValid(value: unknown, maxLength: number, invalidPattern?: RegExp): value is string {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;
  if (text.length > maxLength) return false;
  if (invalidPattern && invalidPattern.test(text)) return false;
  return true;
}

function normalizeSkills(skills: unknown): string[] | undefined {
  if (!Array.isArray(skills)) return undefined;

  const normalized = skills
    .flatMap((skill) => String(skill).split(/[;,|•·]/))
    .map((skill) => skill.trim())
    .filter(
      (skill) =>
        skill.length >= 2 &&
        skill.length <= 60 &&
        skill.split(/\s+/).length <= 3 &&
        !/^(SUMMARY|EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|CONTACT|SKILLS)/i.test(skill)
    );

  return normalized.length ? Array.from(new Set(normalized)) : undefined;
}

function normalizeEducation(education?: string): ICandidateEducation[] | undefined {
  if (!education || !education.trim()) return undefined;

  const entries = education
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ')
    .split(/[\r\n]+|;|\||•|·/g)
    .map((item) => item.trim())
    .filter(
      (item) =>
        item &&
        item.length < 240 &&
        !/^(SUMMARY|EXPERIENCE|SKILLS|PROJECTS|CERTIFICATIONS|CONTACT|ABOUT)/i.test(item)
    );

  if (entries.length === 0) return undefined;

  return entries.slice(0, 8).map((entry) => ({ degree: entry }));
}

function buildExperience(candidate: IResume, parsed: ReturnType<AlgorithmResumeParser['parseResume']>): ICandidateExperience[] | undefined {
  const role =
    isFieldValid(candidate.role, 220, /(SUMMARY|EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|CONTACT|SKILLS)/i)
      ? candidate.role.trim()
      : parsed.role;
  const company =
    isFieldValid(candidate.company, 120, /(SUMMARY|EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|CONTACT|SKILLS)/i)
      ? candidate.company.trim()
      : parsed.company;
  const duration =
    typeof candidate.totalExperience === 'number'
      ? `${candidate.totalExperience} yrs`
      : parsed.totalExperience
      ? `${parsed.totalExperience} yrs`
      : undefined;
  const description = candidate.experienceSummary?.trim() || buildExperienceSummary(candidate, parsed);

  if (!role && !company && !description) return undefined;

  return [
    {
      title: role || 'Candidate Experience',
      company,
      duration,
      description,
    },
  ];
}

function buildExperienceSummary(candidate: IResume, parsed: ReturnType<AlgorithmResumeParser['parseResume']>): string | undefined {
  if (isFieldValid(candidate.experienceSummary, 800)) {
    return candidate.experienceSummary.trim();
  }

  const sourceText = (candidate.text || parsed.rawText || '').trim();
  if (!sourceText) return undefined;

  const summaryLine = sourceText
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .find((line) => line.length >= 50 && line.length <= 320);

  return summaryLine || sourceText.slice(0, 320);
}

function mapResumeToCandidateProfile(candidate: IResume): ICandidateProfile {
  const parsed = resumeParser.parseResume(candidate.text || '');

  return {
    _id: candidate._id,
    name: candidate.name || parsed.name || 'Unknown Candidate',
    email: isFieldValid(candidate.email, 120) ? candidate.email.trim() : parsed.email,
    phone: isFieldValid(candidate.phone, 40) ? candidate.phone.trim() : parsed.phone,
    location: candidate.location,
    role:
      isFieldValid(candidate.role, 220, /(SUMMARY|EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|CONTACT|SKILLS)/i)
        ? candidate.role.trim()
        : parsed.role,
    company:
      isFieldValid(candidate.company, 120, /(SUMMARY|EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|CONTACT|SKILLS)/i)
        ? candidate.company.trim()
        : parsed.company,
    education: normalizeEducation(candidate.education) || normalizeEducation(parsed.education),
    experience: buildExperience(candidate, parsed),
    skills: normalizeSkills(candidate.skills) || parsed.skills,
    experienceSummary: buildExperienceSummary(candidate, parsed),
    text: candidate.text,
    processedAt: candidate.updatedAt?.toISOString() || candidate.createdAt?.toISOString(),
  };
}

router.get('/v1/candidate/:id', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    const candidateId = String(req.params.id || '').trim();
    if (!candidateId) {
      throw new ValidationError('Candidate id is required');
    }

    logger.debug('GET /v1/candidate/:id called', {
      requestId,
      candidateId,
    });

    const candidateResume = await resumeRepository.getResumeById(candidateId);
    if (!candidateResume) {
      throw new NotFoundError(`Candidate with id ${candidateId} not found`);
    }

    const candidateProfile = mapResumeToCandidateProfile(candidateResume);
    const response: IApiResponse<ICandidateProfile> = {
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      data: candidateProfile,
    };

    logger.info('GET /v1/candidate/:id succeeded', {
      requestId,
      candidateId,
      durationMs: response.durationMs,
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
