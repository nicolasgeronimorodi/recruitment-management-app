import { JobDescription } from './job-description.entity';
import { JobDescriptionStatus } from '../value-objects/job-description-status.vo'; 

const validProps = {
    id: 'uuid-1',
    title: 'Software Engineer',
    description: 'Develop and maintain software applications.',
    requirements: '3 years of experience in software development.',
    status: JobDescriptionStatus.DRAFT,
    companyId: 'company-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
}

describe('JobDescription', () => {
    it('should create with valid props', () => {
        const jd = new JobDescription(validProps);
        expect(jd.id).toBe('uuid-1');
        expect(jd.title).toBe('Software Engineer');
        expect(jd.description).toBe('Develop and maintain software applications.');
        expect(jd.requirements).toBe('3 years of experience in software development.');
        expect(jd.status).toBe(JobDescriptionStatus.DRAFT);
        expect(jd.companyId).toBe('company-uuid-1');
        expect(jd.createdAt).toBeInstanceOf(Date);
        expect(jd.updatedAt).toBeInstanceOf(Date); 
    });
    it('should throw on empty companyId', () => {
        expect( () => {
            new JobDescription({
                ...validProps,
                companyId: ''
            })
        }).toThrow('JobDescription must reference a Company');
    })

    // -- canBeEdited

    it('should return true for canBeEdited when status is DRAFT', () => {
        const jd = new JobDescription(validProps);
        expect(jd.canBeEdited()).toBe(true);
    });

    it('should return false for canBeEdited when status is PUBLISHED', () => {
        const jd = new JobDescription({
            ...validProps,
            status: JobDescriptionStatus.PUBLISHED
        });
        expect(jd.canBePublished()).toBe(false);
    })

        it('should return false for canBeEdited when status is CANCELED', () => {
        const jd = new JobDescription({
            ...validProps,
            status: JobDescriptionStatus.CANCELED
        });
        expect(jd.canBePublished()).toBe(false);
    })

     // -- edit --

  it('should update title when editing a DRAFT', () => {
    const jd = new JobDescription(validProps);
    jd.edit({ title: 'Updated Title' });
    expect(jd.title).toBe('Updated Title');
  });

  it('should update only provided fields', () => {
    const jd = new JobDescription(validProps);
    jd.edit({ title: 'Updated Title' });
    expect(jd.description).toBe('Develop and maintain software applications.');
  });

  it('should throw when editing a PUBLISHED job description', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    expect(() => jd.edit({ title: 'New' })).toThrow(
      'Only DRAFT job descriptions can be edited',
    );
  });

  // -- canBePublished --

  it('should return true for canBePublished when DRAFT with all fields', () => {
    const jd = new JobDescription(validProps);
    expect(jd.canBePublished()).toBe(true);
  });

  it('should return false for canBePublished when DRAFT with empty title', () => {
    const jd = new JobDescription({ ...validProps, title: '' });
    expect(jd.canBePublished()).toBe(false);
  });

  it('should return false for canBePublished when DRAFT with empty description', () => {
    const jd = new JobDescription({ ...validProps, description: '' });
    expect(jd.canBePublished()).toBe(false);
  });

  // -- publish --

  it('should change status to PUBLISHED', () => {
    const jd = new JobDescription(validProps);
    jd.publish();
    expect(jd.status).toBe(JobDescriptionStatus.PUBLISHED);
  });

  it('should throw when publishing an already PUBLISHED job description', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    expect(() => jd.publish()).toThrow();
  });

  // -- canBeCanceled --

  it('should return true for canBeCanceled when PUBLISHED', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    expect(jd.canBeCanceled()).toBe(true);
  });

  it('should return false for canBeCanceled when DRAFT', () => {
    const jd = new JobDescription(validProps);
    expect(jd.canBeCanceled()).toBe(false);
  });

  // -- cancel --

  it('should change status to CANCELED', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    jd.cancel();
    expect(jd.status).toBe(JobDescriptionStatus.CANCELED);
  });

  it('should throw when canceling a DRAFT', () => {
    const jd = new JobDescription(validProps);
    expect(() => jd.cancel()).toThrow(
      'Only PUBLISHED job descriptions can be canceled',
    );
  });
});




