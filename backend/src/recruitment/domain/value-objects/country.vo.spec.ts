import { Country } from './country.vo';

describe('Country', () => {
    it('should create a country with a valid id and name', () => {
        const country = new Country('uuid-1', 'Argentina');
        expect(country.id).toBe('uuid-1');
        expect(country.name).toBe('Argentina');
    })
    it('should throw on empty id', () => {
        expect(() => new Country('', 'Argentina')).toThrow(
            'Country id cannot be empty',
        );
    });
    it('should throw on empty name', () => {
        expect( () => new Country('uuid-1', '')).toThrow(
            'Country name cannot be empty',
        );
    });
    it('should throw on whitespace-only name', () => {
        expect( () => new Country('uuid-1', ' ')).toThrow(
            'Country name cannot be empty',
        );
    });
    it('should return true for equals with same id and name', () => {
        const a = new Country('uuid-1', 'Argentina');
        const b = new Country('uuid-1', 'Argentina');
        expect(a.equals(b)).toBe(true);
    });
    it('should return false for equals with different id', ()=> {
        const a = new Country('uuid-1', 'Argentina');
        const b = new Country('uuid-2', 'Argentina');
        expect(a.equals(b)).toBe(false);
    })
    it('should return false for equals with diferent name', ()=> {
        const a = new Country('uuid-1', 'Argentina');
        const b = new Country('uuid-1', 'Argelia');
        expect(a.equals(b)).toBe(false);
    })
})