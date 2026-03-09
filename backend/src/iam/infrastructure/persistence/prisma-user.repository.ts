import { Injectable } from "@nestjs/common";
import { Role, User, UserRepository } from "src/iam/domain";
import { PrismaService } from "src/shared/prisma/prisma.service";
import { User as PrismaUser } from "@prisma/client";

@Injectable()
export class PrismaUserRepository implements UserRepository {
    constructor(private readonly prisma: PrismaService){}

    private toDomain(raw: PrismaUser){
        return new User({
            id: raw.id,
            email: raw.email,
            password: raw.password,
            name: raw.name,
            role: raw.role as Role,
            isActive: raw.isActive,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt
        })
    }

    async findByEmail(email: string): Promise<User | null> {
        const raw = await this.prisma.user.findUnique({
            where: {email: email.toLowerCase()},
        });
        return raw ? this.toDomain(raw) : null;
    }


    async findById(id: string): Promise<User | null> {
        const raw = await this.prisma.user.findUnique({
            where: {id }
        });
        return raw ? this.toDomain(raw) : null;
    }
    async save(user: User): Promise<User> {
        const raw = await this.prisma.user.update({
            where: {id: user.id},
            data: {
                email: user.email,
                password: user.password,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
            },
        });
        return this.toDomain(raw);
    }
    async create(user: User): Promise<User> {
        const raw = await this.prisma.user.create({
            data: {
                id: user.id,
                email: user.email,
                password: user.password,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
            }
        });
        return this.toDomain(raw);
    }
}