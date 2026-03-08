// Entities
export { Company } from './entities/company.entity';
export { JobDescription } from './entities/job-description.entity';
export { JobApplication } from './entities/job-application.entity';
export { Applicant } from './entities/applicant.entity';

// Value Objects
export { Country } from './value-objects/country.vo';
export { Field } from './value-objects/field.vo';
export { JobDescriptionStatus } from './value-objects/job-description-status.vo';
export { ApplicationStatus } from './value-objects/application-status.vo';

// Repository interfaces
export type { CompanyRepository } from './repositories/company.repository';
export type { JobDescriptionRepository } from './repositories/job-description.repository';
export type { JobApplicationRepository } from './repositories/job-application.repository';
export type { ApplicantRepository } from './repositories/applicant.repository';

// Domain services
export { ApplicationEligibilityService } from './services/application-eligibility.service';