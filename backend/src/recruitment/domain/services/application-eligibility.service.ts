import { ApplicantRepository } from '../repositories/applicant.repository';
import { JobApplicationRepository } from '../repositories/job-application.repository';
import { JobDescriptionRepository } from '../repositories/job-description.repository';
import { JobDescriptionStatus } from '../value-objects/job-description-status.vo';

export class ApplicationEligibilityService {
  constructor(
    private readonly applicantRepository: ApplicantRepository,
    private readonly jobApplicationRepository: JobApplicationRepository,
    private readonly jobDescriptionRepository: JobDescriptionRepository,
  ) {}

  async canApply(
    applicantEmail: string,
    jobDescriptionId: string,
  ): Promise<boolean> {
    const jobDescription =
      await this.jobDescriptionRepository.findById(jobDescriptionId);

    if (!jobDescription) {
      return false;
    }

    if (jobDescription.status !== JobDescriptionStatus.PUBLISHED) {
      return false;
    }

    const applicant =
      await this.applicantRepository.findByEmail(applicantEmail);

    if (!applicant) {
      return true;
    }

    const existingApplication =
      await this.jobApplicationRepository.findByApplicantIdAndJobDescriptionId(
        applicant.id,
        jobDescriptionId,
      );

    return existingApplication === null;
  }
}