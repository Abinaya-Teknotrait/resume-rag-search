import { AlgorithmResumeParser } from './AlgorithmResumeParser';

export class LLMResumeParser {
  constructor() {}

  async parseWithLLM(rawText: string) {
    // Placeholder — real LLM integration in later phases
    // Use AlgorithmResumeParser as a fallback to provide structured output for now
    const algo = new AlgorithmResumeParser();
    return algo.parseResume(rawText || '');
  }

  async parseResume(rawText: string) {
    // adapter to match AlgorithmResumeParser API
    const result = await this.parseWithLLM(rawText || '');
    return result;
  }
}
