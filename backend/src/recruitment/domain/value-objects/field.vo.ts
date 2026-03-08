export class Field {
    readonly id: string;
    readonly name: string;

    constructor(id: string, name: string){
        if(!id || id.trim().length === 0){
            throw new Error('Field id cannot be empty');
        }
        if(!name || name.trim().length === 0){
            throw new Error('Field name cannot be empty');
        }
        this.id = id;
        this.name = name;
    }

    equals(other: Field): boolean {
        return this.id === other.id && this.name === other.name
    };


}