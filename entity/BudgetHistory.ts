import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Company } from "./Company";

@Entity("budget_history")
@Unique(['company', 'period'])
export class BudgetHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company, (company: Company) => company.budget_histories)
  company: Company;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: false })
  total_salary: number;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: false })
  total_bonus: number;

  @Column({ type: "date", nullable: false })
  period: Date;

  @Column({ length: 255, nullable: true })
  description: string;
}
