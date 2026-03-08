import { JobDescription } from '../entities/job-description.entity';

export interface JobDescriptionRepository {
  findById(id: string): Promise<JobDescription | null>;
  findAll(): Promise<JobDescription[]>;
  create(jobDescription: JobDescription): Promise<JobDescription>;
  save(jobDescription: JobDescription): Promise<JobDescription>;
}