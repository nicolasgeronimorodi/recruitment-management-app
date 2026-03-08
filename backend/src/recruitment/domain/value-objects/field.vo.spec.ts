import { Field } from '../value-objects/field.vo';

describe('Field ', ()=> {
    it('should create a field with valid id and name', ()=> {
        const field = new Field('uuid-1', 'Finance');
        expect(field.id).toBe('uuid-1');
        expect(field.name).toBe('Finance');
    });
    it('should throw on empty id', ()=> {
        expect( () => {
            new Field('', 'Software development')
        }).toThrow('Field id cannot be empty');
    });
    it('should throw on a whitespace-only name', ()=> {
        expect( () => {
            new Field('uuid-1', '  ')
        }).toThrow('Field name cannot be empty')
    });
    it('should return true for equals with same id and name', () => {
        const a = new Field('uuid-1', 'Software engineering');
        const b = new Field('uuid-1', 'Software engineering');
        expect(a.equals(b)).toBe(true);
    });
    it('should return false for equals with different id', ()=> {
        const a = new Field('uuid-1', 'Software engineering');
        const b = new Field('uuid-2', 'Software engineering');
        expect(a.equals(b)).toBe(false);
    })
    it('should return false for equals with diferent name', ()=> {
        const a = new Field('uuid-1', 'Software engineering');
        const b = new Field('uuid-1', 'Software development');
        expect(a.equals(b)).toBe(false);
    })


})