import { Country } from '../value-objects/country.vo';
import { Field } from '../value-objects/field.vo';

export class Company {
    readonly id: string;
    readonly name: string;
    readonly countryId: string;
    readonly country: Country;
    readonly fields: Field[];
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(props: {
        id: string;
        name: string;
        readonly countryId: string;
        readonly country: Country;
        readonly fields: Field[];
        readonly createdAt: Date;
        readonly updatedAt: Date;
    }){
        if(!props.name || props.name.trim().length === 0){
            throw new Error('Company name cannot be empty');
        }
        if(!props.countryId || props.countryId.trim().length === 0){
            throw new Error('Company must have a country');
        }

        this.id = props.id;
        this.name = props.name;
        this.countryId = props.countryId;
        this.country = props.country;
        this.fields = [...props.fields];
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }


    

}