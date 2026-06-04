export interface Experience {
  company: string;
  title: string;
  duration?: string;
  description?: string;
}

export interface Education {
  degree: string;
  institution: string;
  year?: string;
}

export interface CandidateProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  company?: string;
  education?: Education[];
  experience?: Experience[];
  skills?: string[];
  projects?: { title: string; description: string }[];
  certifications?: string[];
  text?: string;
  experienceSummary?: string;
  processedAt?: string;
}
