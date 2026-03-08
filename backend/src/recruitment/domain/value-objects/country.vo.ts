export class Country {
    readonly id: string;
    readonly name: string;

    constructor(id: string, name: string){
        if(!id || id.trim().length === 0){
            throw new Error('Country id cannot be empty');
        }
        if(!name || name.trim().length === 0){
            throw new Error('Country name cannot be empty');
        }
        this.id = id;
        this.name = name;
    }

    equals(other: Country): boolean {
        return this.id === other.id && this.name === other.name
    };


}