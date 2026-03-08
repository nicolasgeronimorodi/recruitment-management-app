import { JobApplication } from './job-application.entity';
import { ApplicationStatus } from '../value-objects/application-status.vo';

const validProps = {
  id: 'uuid-1',
  status: ApplicationStatus.RECEIVED,
  jobDescriptionId: 'jd-uuid-1',
  applicantId: 'applicant-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JobApplication', () => {
  it('should create with valid props', () => {
    const ja = new JobApplication(validProps);
    expect(ja.id).toBe('uuid-1');
    expect(ja.status).toBe(ApplicationStatus.RECEIVED);
  });

  it('should throw on empty jobDescriptionId', () => {
    expect(
      () => new JobApplication({ ...validProps, jobDescriptionId: '' }),
    ).toThrow('JobApplication must reference a JobDescription');
  });

  it('should throw on empty applicantId', () => {
    expect(
      () => new JobApplication({ ...validProps, applicantId: '' }),
    ).toThrow('JobApplication must reference an Applicant');
  });

  // -- valid transitions --

  it('should transition from RECEIVED to UNDER_REVIEW', () => {
    const ja = new JobApplication(validProps);
    ja.changeStatus(ApplicationStatus.UNDER_REVIEW);
    expect(ja.status).toBe(ApplicationStatus.UNDER_REVIEW);
  });

  it('should transition from UNDER_REVIEW to ACCEPTED', () => {
    const ja = new JobApplication({
      ...validProps,
      status: ApplicationStatus.UNDER_REVIEW,
    });
    ja.changeStatus(ApplicationStatus.ACCEPTED);
    expect(ja.status).toBe(ApplicationStatus.ACCEPTED);
  });

  it('should transition from UNDER_REVIEW to REJECTED', () => {
    const ja = new JobApplication({
      ...validProps,
      status: ApplicationStatus.UNDER_REVIEW,
    });
    ja.changeStatus(ApplicationStatus.REJECTED);
    expect(ja.status).toBe(ApplicationStatus.REJECTED);
  });

  // -- invalid transitions --

  it('should throw on RECEIVED to ACCEPTED (skipping UNDER_REVIEW)', () => {
    const ja = new JobApplication(validProps);
    expect(() => ja.changeStatus(ApplicationStatus.ACCEPTED)).toThrow(
      'Invalid status transition from RECEIVED to ACCEPTED',
    );
  });

  it('should throw on RECEIVED to REJECTED (skipping UNDER_REVIEW)', () => {
    const ja = new JobApplication(validProps);
    expect(() => ja.changeStatus(ApplicationStatus.REJECTED)).toThrow(
      'Invalid status transition from RECEIVED to REJECTED',
    );
  });

  it('should throw on ACCEPTED to any status (terminal)', () => {
    const ja = new JobApplication({
      ...validProps,
      status: ApplicationStatus.ACCEPTED,
    });
    expect(() => ja.changeStatus(ApplicationStatus.UNDER_REVIEW)).toThrow(
      'Invalid status transition',
    );
  });

  it('should throw on REJECTED to any status (terminal)', () => {
    const ja = new JobApplication({
      ...validProps,
      status: ApplicationStatus.REJECTED,
    });
    expect(() => ja.changeStatus(ApplicationStatus.UNDER_REVIEW)).toThrow(
      'Invalid status transition',
    );
  });
});