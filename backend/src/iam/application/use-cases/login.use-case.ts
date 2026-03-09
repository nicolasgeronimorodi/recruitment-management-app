import {Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { UserRepository } from '../../domain/repositories/user-repository'; 


export interface LoginResult {
    access_token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}

@Injectable()
export class LoginUseCase {
    constructor(
        @Inject('USER_REPOSITORY')
        private readonly userRepository: UserRepository,
        private readonly jwtService: JwtService,
    ){
    }

    async execute(email: string, password: string): Promise<LoginResult>{
        const user = await this.userRepository.findByEmail(email);
        if(!user){
            throw new UnauthorizedException('Invalid credentials'); 
        }
        if(!user.isActive){
            throw new UnauthorizedException('User is inactive');    
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid){throw new UnauthorizedException('Invalid credentials')}
        
        const payload = { sub: user.id, email: user.email, role: user.role};
        const access_token = this.jwtService.sign(payload);
        return {
            access_token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
        };
    }
}