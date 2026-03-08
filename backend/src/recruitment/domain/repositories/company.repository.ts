import { Company } from "src/recruitment/domain/entities/company.entity";

export interface CompanyRepository {
    findById(id: string): Promise<Company | null>;
    findAll(): Promise<Company[]>;
    create(company: Company): Promise<Company>;
}


