import { User } from './user.entity';
import { Role } from '../value-objects/role.vo';

const validProps = {
    id: 'uuid-1',
    email: 'admin@recruiting.com',
    password: 'hashed-password',
    name: 'Admin Officer',
    role: Role.RECRUITING_OFFICER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('User', () => {
    it('should create a user with valid props', () => {
        const user = new User(validProps);
        expect(user.id).toBe('uuid-1');
        expect(user.email).toBe('admin@recruiting.com');
        expect(user.password).toBe('hashed-password');
        expect(user.name).toBe('Admin Officer');
        expect(user.role).toBe(Role.RECRUITING_OFFICER);
        expect(user.isActive).toBe(true);
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should normalize email to lowercase', () => {
       const user = new User({...validProps, email: 
        'Admin@Recruiting.COM'});
        expect(user.email).toBe('admin@recruiting.com'); 
    });

    it('should trim email', () => {
        const user = new User({...validProps, email: 
            ' admin@recruiting.com '});
            expect(user.email).toBe('admin@recruiting.com')
    });

    it('should throw if email is empty', () => {
        expect(() => {
            new User({...validProps, email: ''});
        }).toThrow('User email cannot be empty');  
    });
    
    it('should throw if password is empty', () => {
        expect(() => {
            new User({...validProps, password: ''});
        }).toThrow('User password cannot be empty');  
    });  

})


