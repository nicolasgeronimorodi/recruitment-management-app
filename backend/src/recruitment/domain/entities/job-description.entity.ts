import { JobDescriptionStatus } from '../value-objects/job-description-status.vo';

export class JobDescription {
    readonly id: string;
    private _title: string;
    private _description: string;
    private _requirements: string | null;
    private _status: JobDescriptionStatus;
    readonly companyId: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(props: {
        id: string;
        title: string;
        description: string;
        requirements: string | null;
        status: JobDescriptionStatus;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
    }){
        if(!props.companyId || props.companyId.trim().length === 0 ){
            throw new Error('JobDescription must reference a Company');
        }

        this.id = props.id;
        this._title = props.title;
        this._description = props.description;
        this._requirements = props.requirements;
        this._status = props.status;
        this.companyId = props.companyId;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    get title(): string {
        return this._title;
    }
    get description(): string {
        return this._description;
    }

    get requirements():string | null {
        return this._requirements;
    }

    get status(): JobDescriptionStatus {
        return this._status;
    }

    canBeEdited():boolean {
        return this._status === JobDescriptionStatus.DRAFT;
    }

    canBePublished(): boolean {
      return (
        this._status === JobDescriptionStatus.DRAFT &&
        this._title.trim().length > 0 &&
        this._description.trim().length > 0 &&
        this.companyId.trim.length > 0
      )
    };

    canBeCanceled(): boolean {
        return this._status === JobDescriptionStatus.PUBLISHED;
    }

    edit(data: {
        title?: string;
        description?: string;
        requirements?: string | null
    }): void {
        if(!this.canBeEdited()){
            throw new Error('Only DRAFT job descriptions can be edited');
        }
        if(data.title !== undefined){
            this._title = data.title;
        }
        if(data.description !== undefined){
            this._description = data.description;
        }
        if(data.requirements !== undefined){
            this._requirements = data.requirements;
        }
    }

    publish():void {
        if(!this.canBePublished()){
            throw new Error('Cannot publish: must be DRAFT with title, description and companyId',)
        }
        this._status = JobDescriptionStatus.PUBLISHED;
    }

    cancel(): void {
        if(!this.canBeCanceled()){
            throw new Error('Only PUBLISHED job descriptions can be canceled');
        }
    }


}