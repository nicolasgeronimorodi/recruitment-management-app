import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { LoginUseCase } from "./login.use-case";
import { UserRepository } from "src/iam/domain";
import { User } from "src/iam/domain/entities/user.entity";
import { Role } from "src/iam/domain/value-objects/role.vo";
import * as bcrypt from 'bcrypt';


describe('LoginUseCase', () => {
    let loginUseCase: LoginUseCase;
    let userRepository: jest.Mocked<UserRepository>;
    let jwtService: jest.Mocked<JwtService>;

    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const mockUser: User = {
        id: '1',
        email: 'admin@recruiting.com',
        password: hashedPassword,
        name: 'Admin Officer',
        role: Role.RECRUITING_OFFICER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    beforeEach( () => {
        userRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
        }  
        jwtService = {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
        } as unknown as jest.Mocked<JwtService>;
    
        loginUseCase = new LoginUseCase(userRepository, jwtService);
    });

    it('should return access_token and user on valid credentials', async () => {
        userRepository.findByEmail.mockResolvedValue(mockUser);

        const result = await loginUseCase.execute(
            'admin@recruiting.com',
            'admin123'
        );

        expect(result.access_token).toBe('mock-jwt-token');
        expect(result.user.email).toBe('admin@recruiting.com');
        expect(result.user.name).toBe('Admin Officer');
        expect(result.user.role).toBe(Role.RECRUITING_OFFICER);
        expect(jwtService.sign).toHaveBeenCalledWith({
            sub: 'uuid-1',
            email: 'admin@recruiting.com',
            role: Role.RECRUITING_OFFICER
        });
    });

    it('should throw UnauthorizedException if user not found', async () => {
        userRepository.findByEmail.mockResolvedValue(null);

        await expect(
            loginUseCase.execute('nobody@recruiting.com', 'admin123'),

        ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
        userRepository.findByEmail.mockResolvedValue(mockUser);

        await expect(
            loginUseCase.execute('admin@recruiting.com', 'wrongpassword'),
        ).rejects.toThrow(UnauthorizedException);
    })







})