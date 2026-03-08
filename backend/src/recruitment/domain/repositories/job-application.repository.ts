import { Applicant } from "../entities/applicant.entity";
import { JobApplication } from "../entities/job-application.entity";

export interface JobApplicationRepository {
    findById(id: string): Promise<JobApplication | null>;
    findByJobDescriptionId(jobDescriptionId: string): Promise<JobApplication[]>;
    findByApplicantIdAndJobDescriptionId(
        applicantId: string,
        jobDescriptionId: string,
    ): Promise<JobApplication | null>;
    create(jobApplication: JobApplication): Promise<JobApplication>;
    save(jobApplication: JobApplication): Promise<JobApplication>;

}

export interface ApplicantRepository {
    findByEmail(email: string): Promise<Applicant | null>;
    findById(id: string): Promise<Applicant | null>;
    create(applicant: Applicant): Promise<Applicant>;
    
}
