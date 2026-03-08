import {Role} from '../value-objects/role.vo';

export class User {
    readonly id: string;
    readonly email: string;
    readonly password: string;
    readonly name: string;
    readonly role: Role;
    readonly isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(props: {
        id: string;
        email: string;
        password: string;
        name: string;
        role: Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }){
        if(!props.email || props.email.trim().length === 0 ){
            throw new Error('User email cannot be empty');
        }
        if(!props.name || props.name.trim().length === 0 ){
            throw new Error('User name cannot be empty');
        }
        if(!props.password || props.password.trim().length === 0 ){
            throw new Error('User password cannot be empty');
        }
        this.id = props.id;
        this.email = props.email.trim().toLowerCase();
        this.name = props.name.trim();
        this.password = props.password;
        this.role = props.role;
        this.isActive = props.isActive;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;

    }
}

