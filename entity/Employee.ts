import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "./User";
import { Company } from "./Company";
import { SalaryHistory } from "./SalaryHistory";

@Entity("employees")
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user: User) => user.employees)
  user: User;

  @ManyToOne(() => Company, (company: Company) => company.employees)
  company: Company;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  salary_per_hour: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  hired_at: Date;

  @OneToMany(
    () => SalaryHistory,
    (salaryHistory: SalaryHistory) => salaryHistory.employee
  )
  salary_histories: SalaryHistory[];

  @Column({ type: "varchar", length: 20, nullable: true })
  phone_number: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  home_address: string;

  @Column({ type: "date", nullable: true })
  date_of_birth: Date;

  @Column({ type: "json", nullable: true })
  health_insurance_metadata: {
    policy_number: string;
    provider: string;
    expiration_date: Date;
    notes: string;
  };

  @Column({type: "date", nullable: true})
  last_marked_day: Date;
}
