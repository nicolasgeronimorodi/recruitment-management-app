import { ApplicationStatus } from '../value-objects/application-status.vo'

export class JobApplication {
    readonly id: string;
    private _status: ApplicationStatus;
    readonly jobDescriptionId: string;
    readonly applicantId: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(
        props: {
            id: string;
            status: ApplicationStatus,
            jobDescriptionId: string,
            applicantId: string,
            createdAt: Date,
            updatedAt: Date
        }
    ){
        if(!props.jobDescriptionId){
            throw new Error('JobApplication must reference a JobDescription');  
        }
        if(!props.applicantId){
            throw new Error('JobApplication must reference an Applicant');  
        }
        this.id = props.id;
        this._status = props.status;
        this.jobDescriptionId = props.jobDescriptionId;
        this.applicantId = props.applicantId;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    get status(): ApplicationStatus {
        return this._status;
    }

    changeStatus(newStatus: ApplicationStatus):void{
        if(!this.isValidTransition(this._status, newStatus)){
            throw new Error(`Invalid status transition from ${this._status} to ${newStatus}`,);
        }
        this._status = newStatus;
    }

    private isValidTransition(
        from: ApplicationStatus,
        to: ApplicationStatus,
    ): boolean {
        const validTransitions: Record<string, ApplicationStatus[]> = {
            [ApplicationStatus.RECEIVED]: [ApplicationStatus.UNDER_REVIEW],
            [ApplicationStatus.UNDER_REVIEW]: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
            [ApplicationStatus.ACCEPTED]: [],
            [ApplicationStatus.REJECTED]: [],
        }
        return validTransitions[from]?.includes(to) ?? false;
    }





}