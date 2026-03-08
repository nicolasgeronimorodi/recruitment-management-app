export class Applicant {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly phone: string | null;
    readonly cvPath: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;


    constructor(props: {
        id: string;
        email: string;
        name: string;
        phone: string | null;
        cvPath: string | null;
        createdAt: Date;
        updatedAt: Date;
    }){
        if(!props.email || props.email.trim().length === 0){
            throw new Error('Applicant email cannot be empty');
        }
        if(!props.name || props.name.trim().length === 0){
            throw new Error('Applicant name cannot be empty');
        }

        this.id = props.id;
        this.email = props.email.trim().toLowerCase();
        this.name = props.name.trim();
        this.phone = props.phone;
        this.cvPath = props.cvPath;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }
}