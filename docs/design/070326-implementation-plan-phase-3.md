# Implementation plan — Phase 3: domain layer (backend)

**Date:** 07/03/2026
**Status:** Not started
**Related:** [Domain Analysis](./040326-domain-analysis.md) | [Use Cases](./040326-use-cases.md) | [Tech Stack & Structure](./040326-tech-stack-and-structure.md)

---

## Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Domain enums | Own TypeScript enums, not Prisma's | Zero framework dependencies in domain |
| Country/Field VOs | Include `id` + `name` | DB assigns UUIDs; avoids lookup-on-save complexity |
| Constructor style | Props object `{ id, name, ... }` | Readable with 6+ params, self-documenting |
| Base Entity class | No | 3-field duplication is tolerable; avoids inheritance |
| Mutability | Private fields + getters for mutable state | Simpler than returning new instances on every change |
| Factory methods | Plain constructors | No complex creation logic yet (YAGNI) |
| JobApplication repo | Separate interface | UC-12 needs standalone access for status changes |
| Unit tests | Yes, in this phase | Domain is pure TS, easiest to test, catches logic bugs early |

> **Regla fundamental de esta fase:** Ningún archivo dentro de `src/iam/domain/` o `src/recruitment/domain/` puede importar de `@nestjs/*`, `@prisma/*`, `rxjs`, u otro framework. Todo es TypeScript puro.

---

## Step 1 — Value objects

No hay dependencias entre estos archivos. Se pueden crear en cualquier orden.

### `backend/src/iam/domain/value-objects/role.vo.ts`

```typescript
export enum Role {
  RECRUITING_OFFICER = 'RECRUITING_OFFICER',
}
```

> String enum (no numérico) para que los valores sean legibles en logs y se mapeen 1:1 con los enums de Prisma en la capa de infraestructura.

---

### `backend/src/recruitment/domain/value-objects/job-description-status.vo.ts`

```typescript
export enum JobDescriptionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELED = 'CANCELED',
}
```

---

### `backend/src/recruitment/domain/value-objects/application-status.vo.ts`

```typescript
export enum ApplicationStatus {
  RECEIVED = 'RECEIVED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
```

---

### `backend/src/recruitment/domain/value-objects/country.vo.ts`

```typescript
export class Country {
  readonly id: string;
  readonly name: string;

  constructor(id: string, name: string) {
    if (!id || id.trim().length === 0) {
      throw new Error('Country id cannot be empty');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Country name cannot be empty');
    }
    this.id = id;
    this.name = name.trim();
  }

  equals(other: Country): boolean {
    return this.id === other.id && this.name === other.name;
  }
}
```

> `readonly` en todas las propiedades: inmutabilidad a nivel TypeScript. `equals()` permite comparación por valor, no por referencia. `trim()` normaliza espacios.

> Country y Field llevan `id` además de `name` porque la base de datos les asigna UUIDs y la capa de infraestructura necesita el `id` para persistir relaciones (ej: `company.countryId`). Es un compromiso pragmático: siguen siendo inmutables y comparables por valor, pero cargan un identificador para el mapping con la DB.

---

### `backend/src/recruitment/domain/value-objects/field.vo.ts`

```typescript
export class Field {
  readonly id: string;
  readonly name: string;

  constructor(id: string, name: string) {
    if (!id || id.trim().length === 0) {
      throw new Error('Field id cannot be empty');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Field name cannot be empty');
    }
    this.id = id;
    this.name = name.trim();
  }

  equals(other: Field): boolean {
    return this.id === other.id && this.name === other.name;
  }
}
```

---

## Step 2 — Entities

Dependen de los value objects del Step 1.

### `backend/src/iam/domain/entities/user.entity.ts`

```typescript
import { Role } from '../value-objects/role.vo';

export class User {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly role: Role;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    email: string;
    password: string;
    name: string;
    role: Role;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    if (!props.email || props.email.trim().length === 0) {
      throw new Error('User email cannot be empty');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('User name cannot be empty');
    }
    if (!props.password || props.password.length === 0) {
      throw new Error('User password cannot be empty');
    }

    this.id = props.id;
    this.email = props.email.trim().toLowerCase();
    this.name = props.name.trim();
    this.password = props.password;
    this.role = props.role;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
```

> Constructor con props object en lugar de argumentos posicionales: con 8+ parámetros, los posicionales son propensos a errores. El props object se auto-documenta en el call site.
>
> Todas las propiedades son `readonly`. User es inmutable una vez creado. Si en fases futuras se necesita mutación (ej: `deactivate()`), se relajan propiedades específicas.
>
> `password` se espera ya hasheado cuando llega a la entidad. La entidad de dominio no conoce bcrypt — eso es infraestructura.

---

### `backend/src/recruitment/domain/entities/company.entity.ts`

```typescript
import { Country } from '../value-objects/country.vo';
import { Field } from '../value-objects/field.vo';

export class Company {
  readonly id: string;
  readonly name: string;
  readonly countryId: string;
  readonly country: Country;
  readonly fields: Field[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    name: string;
    countryId: string;
    country: Country;
    fields: Field[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Company name cannot be empty');
    }
    if (!props.countryId || props.countryId.trim().length === 0) {
      throw new Error('Company must have a country');
    }

    this.id = props.id;
    this.name = props.name.trim();
    this.countryId = props.countryId;
    this.country = props.country;
    this.fields = [...props.fields];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
```

> `fields` se copia con spread (`[...props.fields]`) para evitar que el código externo mute el array interno de la entidad.
>
> `countryId` se mantiene junto al VO `country`. El `countryId` es la referencia cross-aggregate (un string plano). El `country` VO es la representación enriquecida cuando la entidad está completamente hidratada. Ambos son útiles: `countryId` para persistencia, `country` para lógica de presentación.

---

### `backend/src/recruitment/domain/entities/applicant.entity.ts`

```typescript
export class Applicant {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly phone: string | null;
  readonly cvPath: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    cvPath: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    if (!props.email || props.email.trim().length === 0) {
      throw new Error('Applicant email cannot be empty');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Applicant name cannot be empty');
    }

    this.id = props.id;
    this.email = props.email.trim().toLowerCase();
    this.name = props.name.trim();
    this.phone = props.phone;
    this.cvPath = props.cvPath;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
```

> `phone` y `cvPath` son nullable, igual que en el Prisma schema (`String?`).

---

### `backend/src/recruitment/domain/entities/job-application.entity.ts`

```typescript
import { ApplicationStatus } from '../value-objects/application-status.vo';

export class JobApplication {
  readonly id: string;
  private _status: ApplicationStatus;
  readonly jobDescriptionId: string;
  readonly applicantId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    status: ApplicationStatus;
    jobDescriptionId: string;
    applicantId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    if (!props.jobDescriptionId) {
      throw new Error('JobApplication must reference a JobDescription');
    }
    if (!props.applicantId) {
      throw new Error('JobApplication must reference an Applicant');
    }

    this.id = props.id;
    this._status = props.status;
    this.jobDescriptionId = props.jobDescriptionId;
    this.applicantId = props.applicantId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get status(): ApplicationStatus {
    return this._status;
  }

  changeStatus(newStatus: ApplicationStatus): void {
    if (!this.isValidTransition(this._status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${this._status} to ${newStatus}`,
      );
    }
    this._status = newStatus;
  }

  private isValidTransition(
    from: ApplicationStatus,
    to: ApplicationStatus,
  ): boolean {
    const validTransitions: Record<string, ApplicationStatus[]> = {
      [ApplicationStatus.RECEIVED]: [ApplicationStatus.UNDER_REVIEW],
      [ApplicationStatus.UNDER_REVIEW]: [
        ApplicationStatus.ACCEPTED,
        ApplicationStatus.REJECTED,
      ],
      [ApplicationStatus.ACCEPTED]: [],
      [ApplicationStatus.REJECTED]: [],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }
}
```

> `_status` es el único campo mutable, expuesto vía getter. Se relaja la inmutabilidad total porque las transiciones de estado son el comportamiento central de esta entidad.
>
> `isValidTransition` codifica la máquina de estados como un mapa de lookup. Los estados terminales (`ACCEPTED`, `REJECTED`) tienen arrays vacíos — no admiten transiciones.

---

### `backend/src/recruitment/domain/entities/job-description.entity.ts`

La entidad más rica del dominio. Tiene métodos de ciclo de vida y validación de publicación.

```typescript
import { JobDescriptionStatus } from '../value-objects/job-description-status.vo';

export class JobDescription {
  readonly id: string;
  private _title: string;
  private _description: string;
  private _requirements: string | null;
  private _status: JobDescriptionStatus;
  readonly companyId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    title: string;
    description: string;
    requirements: string | null;
    status: JobDescriptionStatus;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    if (!props.companyId || props.companyId.trim().length === 0) {
      throw new Error('JobDescription must reference a Company');
    }

    this.id = props.id;
    this._title = props.title;
    this._description = props.description;
    this._requirements = props.requirements;
    this._status = props.status;
    this.companyId = props.companyId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get requirements(): string | null {
    return this._requirements;
  }

  get status(): JobDescriptionStatus {
    return this._status;
  }

  canBeEdited(): boolean {
    return this._status === JobDescriptionStatus.DRAFT;
  }

  canBePublished(): boolean {
    return (
      this._status === JobDescriptionStatus.DRAFT &&
      this._title.trim().length > 0 &&
      this._description.trim().length > 0 &&
      this.companyId.trim().length > 0
    );
  }

  canBeCanceled(): boolean {
    return this._status === JobDescriptionStatus.PUBLISHED;
  }

  edit(data: {
    title?: string;
    description?: string;
    requirements?: string | null;
  }): void {
    if (!this.canBeEdited()) {
      throw new Error('Only DRAFT job descriptions can be edited');
    }

    if (data.title !== undefined) {
      this._title = data.title;
    }
    if (data.description !== undefined) {
      this._description = data.description;
    }
    if (data.requirements !== undefined) {
      this._requirements = data.requirements;
    }
  }

  publish(): void {
    if (!this.canBePublished()) {
      throw new Error(
        'Cannot publish: must be DRAFT with title, description, and companyId',
      );
    }
    this._status = JobDescriptionStatus.PUBLISHED;
  }

  cancel(): void {
    if (!this.canBeCanceled()) {
      throw new Error('Only PUBLISHED job descriptions can be canceled');
    }
    this._status = JobDescriptionStatus.CANCELED;
  }
}
```

> Los campos mutables (`_title`, `_description`, `_requirements`, `_status`) usan el patrón private-con-getter. Solo los propios métodos de la entidad pueden cambiarlos, forzando el invariante "solo DRAFT puede editarse".
>
> `edit()` acepta un objeto parcial. Solo los campos presentes se actualizan. Esto evita obligar al caller a pasar todos los campos en cada edición.
>
> `canBePublished()` chequea tanto el status como la completitud de datos. Un DRAFT con título vacío no puede publicarse.
>
> No hay array `applications` en la entidad. Las aplicaciones se cargan por separado a través del repositorio cuando se necesitan. Esto mantiene la entidad liviana.

---

## Step 3 — Repository interfaces (ports)

Las interfaces definen los contratos que la capa de infraestructura (Phase 4+) debe implementar. Usan solo tipos de dominio, nunca tipos de Prisma.

### `backend/src/iam/domain/repositories/user.repository.ts`

```typescript
import { User } from '../entities/user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
  create(user: User): Promise<User>;
}
```

> `create` es para usuarios nuevos (INSERT). `save` es para actualizar existentes (UPDATE). Mantenerlos separados hace la intención explícita en los use cases.

---

### `backend/src/recruitment/domain/repositories/company.repository.ts`

```typescript
import { Company } from '../entities/company.entity';

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
  findAll(): Promise<Company[]>;
  create(company: Company): Promise<Company>;
}
```

---

### `backend/src/recruitment/domain/repositories/job-description.repository.ts`

```typescript
import { JobDescription } from '../entities/job-description.entity';

export interface JobDescriptionRepository {
  findById(id: string): Promise<JobDescription | null>;
  findAll(): Promise<JobDescription[]>;
  create(jobDescription: JobDescription): Promise<JobDescription>;
  save(jobDescription: JobDescription): Promise<JobDescription>;
}
```

> Tiene `create` y `save` porque JobDescription es mutable (edit, publish, cancel cambian su estado).

---

### `backend/src/recruitment/domain/repositories/job-application.repository.ts`

```typescript
import { JobApplication } from '../entities/job-application.entity';

export interface JobApplicationRepository {
  findById(id: string): Promise<JobApplication | null>;
  findByJobDescriptionId(jobDescriptionId: string): Promise<JobApplication[]>;
  findByApplicantIdAndJobDescriptionId(
    applicantId: string,
    jobDescriptionId: string,
  ): Promise<JobApplication | null>;
  create(jobApplication: JobApplication): Promise<JobApplication>;
  save(jobApplication: JobApplication): Promise<JobApplication>;
}
```

> `findByApplicantIdAndJobDescriptionId` es esencial para el `ApplicationEligibilityService` (verificar duplicados).

---

### `backend/src/recruitment/domain/repositories/applicant.repository.ts`

```typescript
import { Applicant } from '../entities/applicant.entity';

export interface ApplicantRepository {
  findByEmail(email: string): Promise<Applicant | null>;
  findById(id: string): Promise<Applicant | null>;
  create(applicant: Applicant): Promise<Applicant>;
}
```

---

## Step 4 — Domain service

### `backend/src/recruitment/domain/services/application-eligibility.service.ts`

```typescript
import { ApplicantRepository } from '../repositories/applicant.repository';
import { JobApplicationRepository } from '../repositories/job-application.repository';
import { JobDescriptionRepository } from '../repositories/job-description.repository';
import { JobDescriptionStatus } from '../value-objects/job-description-status.vo';

export class ApplicationEligibilityService {
  constructor(
    private readonly applicantRepository: ApplicantRepository,
    private readonly jobApplicationRepository: JobApplicationRepository,
    private readonly jobDescriptionRepository: JobDescriptionRepository,
  ) {}

  async canApply(
    applicantEmail: string,
    jobDescriptionId: string,
  ): Promise<boolean> {
    const jobDescription =
      await this.jobDescriptionRepository.findById(jobDescriptionId);

    if (!jobDescription) {
      return false;
    }

    if (jobDescription.status !== JobDescriptionStatus.PUBLISHED) {
      return false;
    }

    const applicant =
      await this.applicantRepository.findByEmail(applicantEmail);

    if (!applicant) {
      return true;
    }

    const existingApplication =
      await this.jobApplicationRepository.findByApplicantIdAndJobDescriptionId(
        applicant.id,
        jobDescriptionId,
      );

    return existingApplication === null;
  }
}
```

> Es un **domain service**, no un NestJS service. Clase TypeScript pura que recibe interfaces de repositorio por constructor. El módulo NestJS en Phase 4 inyecta las implementaciones concretas de Prisma.
>
> Retorna un booleano simple. El use case que lo llama decide qué hacer con el resultado (lanzar error, retornar mensaje, etc.).

---

## Step 5 — Barrel exports

### `backend/src/iam/domain/index.ts`

```typescript
export { User } from './entities/user.entity';
export { Role } from './value-objects/role.vo';
export type { UserRepository } from './repositories/user.repository';
```

---

### `backend/src/recruitment/domain/index.ts`

```typescript
// Entities
export { Company } from './entities/company.entity';
export { JobDescription } from './entities/job-description.entity';
export { JobApplication } from './entities/job-application.entity';
export { Applicant } from './entities/applicant.entity';

// Value Objects
export { Country } from './value-objects/country.vo';
export { Field } from './value-objects/field.vo';
export { JobDescriptionStatus } from './value-objects/job-description-status.vo';
export { ApplicationStatus } from './value-objects/application-status.vo';

// Repository interfaces
export type { CompanyRepository } from './repositories/company.repository';
export type { JobDescriptionRepository } from './repositories/job-description.repository';
export type { JobApplicationRepository } from './repositories/job-application.repository';
export type { ApplicantRepository } from './repositories/applicant.repository';

// Domain services
export { ApplicationEligibilityService } from './services/application-eligibility.service';
```

> Las interfaces de repositorio se exportan con `export type` porque son solo tipos — no generan código JavaScript. Esto hace explícito que son contratos, no implementaciones.

---

## Step 6 — Unit tests

### `backend/src/recruitment/domain/value-objects/country.vo.spec.ts`

```typescript
import { Country } from './country.vo';

describe('Country', () => {
  it('should create a country with valid id and name', () => {
    const country = new Country('uuid-1', 'Argentina');
    expect(country.id).toBe('uuid-1');
    expect(country.name).toBe('Argentina');
  });

  it('should trim whitespace from name', () => {
    const country = new Country('uuid-1', '  Argentina  ');
    expect(country.name).toBe('Argentina');
  });

  it('should throw on empty id', () => {
    expect(() => new Country('', 'Argentina')).toThrow(
      'Country id cannot be empty',
    );
  });

  it('should throw on empty name', () => {
    expect(() => new Country('uuid-1', '')).toThrow(
      'Country name cannot be empty',
    );
  });

  it('should throw on whitespace-only name', () => {
    expect(() => new Country('uuid-1', '   ')).toThrow(
      'Country name cannot be empty',
    );
  });

  it('should return true for equals with same id and name', () => {
    const a = new Country('uuid-1', 'Argentina');
    const b = new Country('uuid-1', 'Argentina');
    expect(a.equals(b)).toBe(true);
  });

  it('should return false for equals with different name', () => {
    const a = new Country('uuid-1', 'Argentina');
    const b = new Country('uuid-1', 'Chile');
    expect(a.equals(b)).toBe(false);
  });

  it('should return false for equals with different id', () => {
    const a = new Country('uuid-1', 'Argentina');
    const b = new Country('uuid-2', 'Argentina');
    expect(a.equals(b)).toBe(false);
  });
});
```

---

### `backend/src/recruitment/domain/value-objects/field.vo.spec.ts`

```typescript
import { Field } from './field.vo';

describe('Field', () => {
  it('should create a field with valid id and name', () => {
    const field = new Field('uuid-1', 'Technology');
    expect(field.id).toBe('uuid-1');
    expect(field.name).toBe('Technology');
  });

  it('should trim whitespace from name', () => {
    const field = new Field('uuid-1', '  Technology  ');
    expect(field.name).toBe('Technology');
  });

  it('should throw on empty id', () => {
    expect(() => new Field('', 'Technology')).toThrow(
      'Field id cannot be empty',
    );
  });

  it('should throw on empty name', () => {
    expect(() => new Field('uuid-1', '')).toThrow('Field name cannot be empty');
  });

  it('should return true for equals with same id and name', () => {
    const a = new Field('uuid-1', 'Technology');
    const b = new Field('uuid-1', 'Technology');
    expect(a.equals(b)).toBe(true);
  });

  it('should return false for equals with different name', () => {
    const a = new Field('uuid-1', 'Technology');
    const b = new Field('uuid-1', 'Finance');
    expect(a.equals(b)).toBe(false);
  });
});
```

---

### `backend/src/iam/domain/entities/user.entity.spec.ts`

```typescript
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
    expect(user.role).toBe(Role.RECRUITING_OFFICER);
  });

  it('should normalize email to lowercase', () => {
    const user = new User({ ...validProps, email: 'Admin@Recruiting.COM' });
    expect(user.email).toBe('admin@recruiting.com');
  });

  it('should trim email', () => {
    const user = new User({ ...validProps, email: '  admin@recruiting.com  ' });
    expect(user.email).toBe('admin@recruiting.com');
  });

  it('should trim name', () => {
    const user = new User({ ...validProps, name: '  Admin Officer  ' });
    expect(user.name).toBe('Admin Officer');
  });

  it('should throw on empty email', () => {
    expect(() => new User({ ...validProps, email: '' })).toThrow(
      'User email cannot be empty',
    );
  });

  it('should throw on empty name', () => {
    expect(() => new User({ ...validProps, name: '' })).toThrow(
      'User name cannot be empty',
    );
  });

  it('should throw on empty password', () => {
    expect(() => new User({ ...validProps, password: '' })).toThrow(
      'User password cannot be empty',
    );
  });
});
```

---

### `backend/src/recruitment/domain/entities/job-description.entity.spec.ts`

```typescript
import { JobDescription } from './job-description.entity';
import { JobDescriptionStatus } from '../value-objects/job-description-status.vo';

const validProps = {
  id: 'uuid-1',
  title: 'Senior Developer',
  description: 'We are looking for a senior developer',
  requirements: '5 years of experience',
  status: JobDescriptionStatus.DRAFT,
  companyId: 'company-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JobDescription', () => {
  it('should create with valid props', () => {
    const jd = new JobDescription(validProps);
    expect(jd.id).toBe('uuid-1');
    expect(jd.title).toBe('Senior Developer');
    expect(jd.status).toBe(JobDescriptionStatus.DRAFT);
  });

  it('should throw on empty companyId', () => {
    expect(
      () => new JobDescription({ ...validProps, companyId: '' }),
    ).toThrow('JobDescription must reference a Company');
  });

  // -- canBeEdited --

  it('should return true for canBeEdited when DRAFT', () => {
    const jd = new JobDescription(validProps);
    expect(jd.canBeEdited()).toBe(true);
  });

  it('should return false for canBeEdited when PUBLISHED', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    expect(jd.canBeEdited()).toBe(false);
  });

  it('should return false for canBeEdited when CANCELED', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.CANCELED,
    });
    expect(jd.canBeEdited()).toBe(false);
  });

  // -- edit --

  it('should update title when editing a DRAFT', () => {
    const jd = new JobDescription(validProps);
    jd.edit({ title: 'Updated Title' });
    expect(jd.title).toBe('Updated Title');
  });

  it('should update only provided fields', () => {
    const jd = new JobDescription(validProps);
    jd.edit({ title: 'Updated Title' });
    expect(jd.description).toBe('We are looking for a senior developer');
  });

  it('should throw when editing a PUBLISHED job description', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    expect(() => jd.edit({ title: 'New' })).toThrow(
      'Only DRAFT job descriptions can be edited',
    );
  });

  // -- canBePublished --

  it('should return true for canBePublished when DRAFT with all fields', () => {
    const jd = new JobDescription(validProps);
    expect(jd.canBePublished()).toBe(true);
  });

  it('should return false for canBePublished when DRAFT with empty title', () => {
    const jd = new JobDescription({ ...validProps, title: '' });
    expect(jd.canBePublished()).toBe(false);
  });

  it('should return false for canBePublished when DRAFT with empty description', () => {
    const jd = new JobDescription({ ...validProps, description: '' });
    expect(jd.canBePublished()).toBe(false);
  });

  // -- publish --

  it('should change status to PUBLISHED', () => {
    const jd = new JobDescription(validProps);
    jd.publish();
    expect(jd.status).toBe(JobDescriptionStatus.PUBLISHED);
  });

  it('should throw when publishing an already PUBLISHED job description', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    expect(() => jd.publish()).toThrow();
  });

  // -- canBeCanceled --

  it('should return true for canBeCanceled when PUBLISHED', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    expect(jd.canBeCanceled()).toBe(true);
  });

  it('should return false for canBeCanceled when DRAFT', () => {
    const jd = new JobDescription(validProps);
    expect(jd.canBeCanceled()).toBe(false);
  });

  // -- cancel --

  it('should change status to CANCELED', () => {
    const jd = new JobDescription({
      ...validProps,
      status: JobDescriptionStatus.PUBLISHED,
    });
    jd.cancel();
    expect(jd.status).toBe(JobDescriptionStatus.CANCELED);
  });

  it('should throw when canceling a DRAFT', () => {
    const jd = new JobDescription(validProps);
    expect(() => jd.cancel()).toThrow(
      'Only PUBLISHED job descriptions can be canceled',
    );
  });
});
```

---

### `backend/src/recruitment/domain/entities/job-application.entity.spec.ts`

```typescript
import { JobApplication } from './job-application.entity';
import { ApplicationStatus } from '../value-objects/application-status.vo';

const validProps = {
  id: 'uuid-1',
  status: ApplicationStatus.RECEIVED,
  jobDescriptionId: 'jd-uuid-1',
  applicantId: 'applicant-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JobApplication', () => {
  it('should create with valid props', () => {
    const ja = new JobApplication(validProps);
    expect(ja.id).toBe('uuid-1');
    expect(ja.status).toBe(ApplicationStatus.RECEIVED);
  });

  it('should throw on empty jobDescriptionId', () => {
    expect(
      () => new JobApplication({ ...validProps, jobDescriptionId: '' }),
    ).toThrow('JobApplication must reference a JobDescription');
  });

  it('should throw on empty applicantId', () => {
    expect(
      () => new JobApplication({ ...validProps, applicantId: '' }),
    ).toThrow('JobApplication must reference an Applicant');
  });

  // -- valid transitions --

  it('should transition from RECEIVED to UNDER_REVIEW', () => {
    const ja = new JobApplication(validProps);
    ja.changeStatus(ApplicationStatus.UNDER_REVIEW);
    expect(ja.status).toBe(ApplicationStatus.UNDER_REVIEW);
  });

  it('should transition from UNDER_REVIEW to ACCEPTED', () => {
    const ja = new JobApplication({
      ...validProps,
      status: ApplicationStatus.UNDER_REVIEW,
    });
    ja.changeStatus(ApplicationStatus.ACCEPTED);
    expect(ja.status).toBe(ApplicationStatus.ACCEPTED);
  });

  it('should transition from UNDER_REVIEW to REJECTED', () => {
    const ja = new JobApplication({
      ...validProps,
      status: ApplicationStatus.UNDER_REVIEW,
    });
    ja.changeStatus(ApplicationStatus.REJECTED);
    expect(ja.status).toBe(ApplicationStatus.REJECTED);
  });

  // -- invalid transitions --

  it('should throw on RECEIVED to ACCEPTED (skipping UNDER_REVIEW)', () => {
    const ja = new JobApplication(validProps);
    expect(() => ja.changeStatus(ApplicationStatus.ACCEPTED)).toThrow(
      'Invalid status transition from RECEIVED to ACCEPTED',
    );
  });

  it('should throw on RECEIVED to REJECTED (skipping UNDER_REVIEW)', () => {
    const ja = new JobApplication(validProps);
    expect(() => ja.changeStatus(ApplicationStatus.REJECTED)).toThrow(
      'Invalid status transition from RECEIVED to REJECTED',
    );
  });

  it('should throw on ACCEPTED to any status (terminal)', () => {
    const ja = new JobApplication({
      ...validProps,
      status: ApplicationStatus.ACCEPTED,
    });
    expect(() => ja.changeStatus(ApplicationStatus.UNDER_REVIEW)).toThrow(
      'Invalid status transition',
    );
  });

  it('should throw on REJECTED to any status (terminal)', () => {
    const ja = new JobApplication({
      ...validProps,
      status: ApplicationStatus.REJECTED,
    });
    expect(() => ja.changeStatus(ApplicationStatus.UNDER_REVIEW)).toThrow(
      'Invalid status transition',
    );
  });
});
```

---

### `backend/src/recruitment/domain/services/application-eligibility.service.spec.ts`

```typescript
import { ApplicationEligibilityService } from './application-eligibility.service';
import { ApplicantRepository } from '../repositories/applicant.repository';
import { JobApplicationRepository } from '../repositories/job-application.repository';
import { JobDescriptionRepository } from '../repositories/job-description.repository';
import { JobDescription } from '../entities/job-description.entity';
import { Applicant } from '../entities/applicant.entity';
import { JobApplication } from '../entities/job-application.entity';
import { JobDescriptionStatus } from '../value-objects/job-description-status.vo';
import { ApplicationStatus } from '../value-objects/application-status.vo';

const now = new Date();

function makeJobDescription(
  overrides: Partial<ConstructorParameters<typeof JobDescription>[0]> = {},
): JobDescription {
  return new JobDescription({
    id: 'jd-uuid-1',
    title: 'Senior Developer',
    description: 'Description',
    requirements: null,
    status: JobDescriptionStatus.PUBLISHED,
    companyId: 'company-uuid-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function makeApplicant(
  overrides: Partial<ConstructorParameters<typeof Applicant>[0]> = {},
): Applicant {
  return new Applicant({
    id: 'applicant-uuid-1',
    email: 'applicant@example.com',
    name: 'John Doe',
    phone: null,
    cvPath: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function makeJobApplication(
  overrides: Partial<ConstructorParameters<typeof JobApplication>[0]> = {},
): JobApplication {
  return new JobApplication({
    id: 'ja-uuid-1',
    status: ApplicationStatus.RECEIVED,
    jobDescriptionId: 'jd-uuid-1',
    applicantId: 'applicant-uuid-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe('ApplicationEligibilityService', () => {
  let applicantRepo: ApplicantRepository;
  let jobApplicationRepo: JobApplicationRepository;
  let jobDescriptionRepo: JobDescriptionRepository;
  let service: ApplicationEligibilityService;

  beforeEach(() => {
    applicantRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    jobApplicationRepo = {
      findById: jest.fn(),
      findByJobDescriptionId: jest.fn(),
      findByApplicantIdAndJobDescriptionId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    jobDescriptionRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    service = new ApplicationEligibilityService(
      applicantRepo,
      jobApplicationRepo,
      jobDescriptionRepo,
    );
  });

  it('should return false when job description does not exist', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(null);

    const result = await service.canApply('applicant@example.com', 'jd-uuid-1');
    expect(result).toBe(false);
  });

  it('should return false when job description is not PUBLISHED', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(
      makeJobDescription({ status: JobDescriptionStatus.DRAFT }),
    );

    const result = await service.canApply('applicant@example.com', 'jd-uuid-1');
    expect(result).toBe(false);
  });

  it('should return true when applicant does not exist (new applicant)', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(
      makeJobDescription(),
    );
    (applicantRepo.findByEmail as jest.Mock).mockResolvedValue(null);

    const result = await service.canApply('new@example.com', 'jd-uuid-1');
    expect(result).toBe(true);
  });

  it('should return true when applicant exists but has not applied to this job', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(
      makeJobDescription(),
    );
    (applicantRepo.findByEmail as jest.Mock).mockResolvedValue(
      makeApplicant(),
    );
    (
      jobApplicationRepo.findByApplicantIdAndJobDescriptionId as jest.Mock
    ).mockResolvedValue(null);

    const result = await service.canApply(
      'applicant@example.com',
      'jd-uuid-1',
    );
    expect(result).toBe(true);
  });

  it('should return false when applicant has already applied to this job', async () => {
    (jobDescriptionRepo.findById as jest.Mock).mockResolvedValue(
      makeJobDescription(),
    );
    (applicantRepo.findByEmail as jest.Mock).mockResolvedValue(
      makeApplicant(),
    );
    (
      jobApplicationRepo.findByApplicantIdAndJobDescriptionId as jest.Mock
    ).mockResolvedValue(makeJobApplication());

    const result = await service.canApply(
      'applicant@example.com',
      'jd-uuid-1',
    );
    expect(result).toBe(false);
  });
});
```

> Los tests usan mock objects planos que cumplen la interfaz del repositorio. `jest.fn()` permite verificar llamadas y configurar retornos con `mockResolvedValue`.

---

## Folder structure summary

```
backend/src/
├── iam/
│   └── domain/
│       ├── entities/
│       │   ├── user.entity.ts
│       │   └── user.entity.spec.ts
│       ├── value-objects/
│       │   └── role.vo.ts
│       ├── repositories/
│       │   └── user.repository.ts
│       └── index.ts
│
└── recruitment/
    └── domain/
        ├── entities/
        │   ├── company.entity.ts
        │   ├── job-description.entity.ts
        │   ├── job-description.entity.spec.ts
        │   ├── job-application.entity.ts
        │   ├── job-application.entity.spec.ts
        │   └── applicant.entity.ts
        ├── value-objects/
        │   ├── country.vo.ts
        │   ├── country.vo.spec.ts
        │   ├── field.vo.ts
        │   ├── field.vo.spec.ts
        │   ├── job-description-status.vo.ts
        │   └── application-status.vo.ts
        ├── services/
        │   ├── application-eligibility.service.ts
        │   └── application-eligibility.service.spec.ts
        ├── repositories/
        │   ├── company.repository.ts
        │   ├── job-description.repository.ts
        │   ├── job-application.repository.ts
        │   └── applicant.repository.ts
        └── index.ts
```

Total: 24 archivos (18 source + 6 test).

---

## Verification

Una vez creados todos los archivos:

```bash
# 1. Compilación TypeScript — debe pasar sin errores
cd backend
npx tsc --noEmit

# 2. Unit tests — todos deben pasar
npm test

# 3. Verificar zero imports de frameworks en la capa de dominio
grep -r "@nestjs\|@prisma\|from 'rxjs'" src/iam/domain/ src/recruitment/domain/
# Debe retornar cero resultados
```

---

## Phase 3 milestone

- [ ] Todos los archivos creados en la estructura indicada
- [ ] `npx tsc --noEmit` compila sin errores
- [ ] `npm test` — todos los tests pasan
- [ ] Grep de framework imports retorna vacío
