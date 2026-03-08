import { SetMetadata } from "@nestjs/common";
import { Role } from '../../iam/domain/value-objects/role.vo';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
