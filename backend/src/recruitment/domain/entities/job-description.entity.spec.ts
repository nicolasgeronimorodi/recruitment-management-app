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
});




