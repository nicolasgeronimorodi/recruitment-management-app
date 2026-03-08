import { Applicant } from '../entities/applicant.entity';

export interface ApplicantRepository {
  findByEmail(email: string): Promise<Applicant | null>;
  findById(id: string): Promise<Applicant | null>;
  create(applicant: Applicant): Promise<Applicant>;
}