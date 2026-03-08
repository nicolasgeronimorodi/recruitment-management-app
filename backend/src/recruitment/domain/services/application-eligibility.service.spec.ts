import { ApplicationEligibilityService } from './application-eligibility.service';
import { ApplicantRepository } from '../repositories/applicant.repository';
import { JobApplicationRepository } from '../repositories/job-application.repository';
import { JobDescriptionRepository } from '../repositories/job-description.repository';
import { JobDescription } from '../entities/job-description.entity';
import { Applicant } from '../entities/applicant.entity';
import { JobApplication } from '../entities/job-application.entity';
import { JobDescriptionStatus } from '../value-objects/job-description-status.vo';
import { ApplicationStatus } from '../value-objects/application-status.vo';

const now = new Date();

function makeJobDescription(
  overrides: Partial<ConstructorParameters<typeof JobDescription>[0]> = {},
): JobDescription {
  return new JobDescription({
    id: 'jd-uuid-1',
    title: 'Senior Developer',
    description: 'Description',
    requirements: null,
    status: JobDescriptionStatus.PUBLISHED,
    companyId: 'company-uuid-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function makeApplicant(
  overrides: Partial<ConstructorParameters<typeof Applicant>[0]> = {},
): Applicant {
  return new Applicant({
    id: 'applicant-uuid-1',
    email: 'applicant@example.com',
    name: 'John Doe',
    phone: null,
    cvPath: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function makeJobApplication(
  overrides: Partial<ConstructorParameters<typeof JobApplication>[0]> = {},
): JobApplication {
  return new JobApplication({
    id: 'ja-uuid-1',
    status: ApplicationStatus.RECEIVED,
    jobDescriptionId: 'jd-uuid-1',
    applicantId: 'applicant-uuid-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe('ApplicationEligibilityService', () => {
  let applicantRepo: ApplicantRepository;
  let jobApplicationRepo: JobApplicationRepository;
  let jobDescriptionRepo: JobDescriptionRepository;
  let service: ApplicationEligibilityService;

  beforeEach(() => {
    applicantRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    jobApplicationRepo = {
      findById: jest.fn(),
      findByJobDescriptionId: jest.fn(),
      findByApplicantIdAndJobDescriptionId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    jobDescriptionRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    service = new ApplicationEligibilityService(
      applicantRepo,
      jobApplicationRepo,
      jobDescriptionRepo,
    );
  });

  it('should return false when job description does not exist', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(null);

    const result = await service.canApply('applicant@example.com', 'jd-uuid-1');
    expect(result).toBe(false);
  });

  it('should return false when job description is not PUBLISHED', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(
      makeJobDescription({ status: JobDescriptionStatus.DRAFT }),
    );

    const result = await service.canApply('applicant@example.com', 'jd-uuid-1');
    expect(result).toBe(false);
  });

  it('should return true when applicant does not exist (new applicant)', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(
      makeJobDescription(),
    );
    (applicantRepo.findByEmail as jest.Mock).mockResolvedValue(null);

    const result = await service.canApply('new@example.com', 'jd-uuid-1');
    expect(result).toBe(true);
  });

  it('should return true when applicant exists but has not applied to this job', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(
      makeJobDescription(),
    );
    (applicantRepo.findByEmail as jest.Mock).mockResolvedValue(
      makeApplicant(),
    );
    (
      jobApplicationRepo.findByApplicantIdAndJobDescriptionId as jest.Mock
    ).mockResolvedValue(null);

    const result = await service.canApply(
      'applicant@example.com',
      'jd-uuid-1',
    );
    expect(result).toBe(true);
  });

  it('should return false when applicant has already applied to this job', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(
      makeJobDescription(),
    );
    (applicantRepo.findByEmail as jest.Mock).mockResolvedValue(
      makeApplicant(),
    );
    (
      jobApplicationRepo.findByApplicantIdAndJobDescriptionId as jest.Mock
    ).mockResolvedValue(makeJobApplication());

    const result = await service.canApply(
      'applicant@example.com',
      'jd-uuid-1',
    );
    expect(result).toBe(false);
  });
});