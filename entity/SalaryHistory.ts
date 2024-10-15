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

  @Column({ type: "int", nullable: false })
  hours_worked: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  bonus: number;

  @Column({ type: "date", nullable: false })
  period: Date;

  @Column({ length: 255, nullable: true })
  description: string;
}
