import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Employee } from "./Employee";

@Entity("salary_history")
@Unique(["employee", "period"])
export class SalaryHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Employee, (employee: Employee) => employee.salary_histories)
  employee: Employee;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  salary_per_hour: number;

  // @Column({ type: "int", nullable: false })
  // hours__per_day: number;

  @Column({ type: "int", nullable: false, default: 0 })
  days_worked: number;

  @Column({type: "int", nullable: false, default: 0})
  days_sick_leave: number;

  @Column({type: "int", nullable: false, default: 0})
  days_vacation: number;

  @Column({type: "int", nullable: false, default: 0})
  days_on_demand_leave: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  bonus: number;

  @Column({ type: "date", nullable: false })
  period: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  retirement_contributions: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  disability_contributions: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  healthcare_contributions: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  income_tax: number;

  @Column({ length: 255, nullable: true })
  description: string;
}
