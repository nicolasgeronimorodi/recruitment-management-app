import { User } from "../entities/user.entity";

export interface UserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    save(user: User): Promise<User>;
    create(user: User): Promise<User>;
}