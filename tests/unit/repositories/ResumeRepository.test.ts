import { buildMongoFilters } from '../../../src/repositories/ResumeRepository';

describe('buildMongoFilters', () => {
  it('maps legacy filter aliases to the canonical location field', () => {
    const query = buildMongoFilters({
      location: 'Chennai',
      company: 'Acme Labs',
      role: 'QA Engineer',
      skills: ['Java', 'Selenium'],
      minYearsExperience: 2,
      maxYearsExperience: 5,
      technologies: ['Playwright'],
    });

    expect(query).toEqual({
      location: 'Chennai',
      currentOrganisation: 'Acme Labs',
      currentTitle: 'QA Engineer',
      skills: { $in: ['Java', 'Selenium'] },
      $or: [
        { totalExperience: { $gte: 2, $lte: 5 } },
        { relevantExperience: { $gte: 2, $lte: 5 } },
      ],
      technologies: ['Playwright'],
    });
  });

  it('preserves the canonical location field when provided', () => {
    const query = buildMongoFilters({
      location: 'Bangalore',
      currentOrganisation: 'Contoso',
      currentTitle: 'Automation Lead',
      yearsOfExperience: 4,
    });

    expect(query).toEqual({
      location: 'Bangalore',
      currentOrganisation: 'Contoso',
      currentTitle: 'Automation Lead',
      yearsOfExperience: 4,
    });
  });
});
