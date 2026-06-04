import request from 'supertest';
import { createExpressApp } from '../../../src/app';
import type { IResume } from '../../../src/types/API';

describe('Candidate route', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should expose GET /v1/candidate/:id and return candidate profile', async () => {
    const mockCandidate: IResume = {
      _id: 'candidate-1',
      text: 'Full resume text for candidate 1',
      name: 'Test Candidate',
      email: 'test@example.com',
      phone: '555-1234',
      location: 'Remote',
      company: 'Acme',
      role: 'Software Engineer',
      jobTitles: ['Software Engineer'],
      education: 'B.Sc. Computer Science',
      skills: ['Node.js', 'MongoDB'],
      totalExperience: 5,
      relevantExperience: 4,
      experienceSummary: 'Experienced backend engineer',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest
      .spyOn(require('../../../src/repositories/ResumeRepository').ResumeRepository.prototype, 'getResumeById')
      .mockResolvedValue(mockCandidate);

    const app = createExpressApp();
    const response = await request(app).get('/v1/candidate/candidate-1');

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBe('candidate-1');
    expect(response.body.data.name).toBe('Test Candidate');
    expect(response.body.data.email).toBe('test@example.com');
    expect(response.body.data.education).toEqual([{ degree: 'B.Sc. Computer Science' }]);
    expect(response.body.data.experience).toEqual([
      {
        title: 'Software Engineer',
        company: 'Acme',
        duration: '5 yrs',
        description: 'Experienced backend engineer',
      },
    ]);
  });

  it('should fallback to parser values when stored resume fields are noisy', async () => {
    const rawText = 'SUMMARYExperienced manual tester with 3 years of QA work...';
    const mockCandidate: IResume = {
      _id: 'candidate-2',
      text: rawText,
      name: 'Noisy Candidate',
      email: 'noise@example.com',
      phone: '123-456-7890',
      location: 'Remote',
      company: 'EXPERIENCETCS | MAR-2024 – till date| Chennai, India',
      role: 'SUMMARYExperienced manual tester with 3 years of QA work...',
      jobTitles: [],
      education: 'SUMMARYExperienced manual tester with 3 years of QA work...',
      skills: ['This is not a skill line, just long noisy garbage text'],
      totalExperience: 3,
      relevantExperience: 3,
      experienceSummary: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest
      .spyOn(require('../../../src/repositories/ResumeRepository').ResumeRepository.prototype, 'getResumeById')
      .mockResolvedValue(mockCandidate);

    jest
      .spyOn(require('../../../src/services/AlgorithmResumeParser').AlgorithmResumeParser.prototype, 'parseResume')
      .mockReturnValue({
        name: 'Noisy Candidate',
        email: 'clean@example.com',
        phone: '999-888-7777',
        location: 'Bangalore',
        skills: ['Java', 'Selenium'],
        company: 'CleanCorp',
        role: 'QA Engineer',
        education: 'Bachelor of Engineering',
        totalExperience: 3,
        rawText,
      });

    const app = createExpressApp();
    const response = await request(app).get('/v1/candidate/candidate-2');

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.role).toBe('QA Engineer');
    expect(response.body.data.company).toBe('CleanCorp');
    expect(response.body.data.skills).toEqual(['Java', 'Selenium']);
    expect(response.body.data.education).toEqual([{ degree: 'Bachelor of Engineering' }]);
  });

  it('should fall back to resume text when experience summary is empty', async () => {
    const rawText = 'Senior QA Engineer with 8 years in test automation and product delivery.\nSkilled in Selenium, Cypress, and full stack test frameworks.';
    const mockCandidate: IResume = {
      _id: 'candidate-3',
      text: rawText,
      name: 'Fallback Summary Candidate',
      email: 'fallback@example.com',
      phone: '222-333-4444',
      location: 'Remote',
      company: 'CleanCorp',
      role: 'QA Engineer',
      jobTitles: ['QA Engineer'],
      education: 'Bachelor of Science',
      skills: ['Selenium', 'Cypress'],
      totalExperience: 8,
      relevantExperience: 8,
      experienceSummary: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest
      .spyOn(require('../../../src/repositories/ResumeRepository').ResumeRepository.prototype, 'getResumeById')
      .mockResolvedValue(mockCandidate);

    jest
      .spyOn(require('../../../src/services/AlgorithmResumeParser').AlgorithmResumeParser.prototype, 'parseResume')
      .mockReturnValue({
        name: 'Fallback Summary Candidate',
        email: 'fallback@example.com',
        phone: '222-333-4444',
        location: 'Remote',
        skills: ['Selenium', 'Cypress'],
        company: 'CleanCorp',
        role: 'QA Engineer',
        education: 'Bachelor of Science',
        totalExperience: 8,
        rawText,
      });

    const app = createExpressApp();
    const response = await request(app).get('/v1/candidate/candidate-3');

    expect(response.status).toBe(200);
    expect(response.body.data.experienceSummary).toBe('Senior QA Engineer with 8 years in test automation and product delivery.');
    expect(response.body.data.experience?.[0].description).toBe('Senior QA Engineer with 8 years in test automation and product delivery.');
  });

  it('should return 404 when candidate is not found', async () => {
    jest
      .spyOn(require('../../../src/repositories/ResumeRepository').ResumeRepository.prototype, 'getResumeById')
      .mockResolvedValue(null);

    const app = createExpressApp();
    const response = await request(app).get('/v1/candidate/not-found-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
