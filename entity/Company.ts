import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { Employee } from "./Employee";
import { JoinRequest } from "./JoinRequest";

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, type: "varchar", nullable: false })
  name: string;

  @Column({ type: "int", nullable: false })
  hours_per_day: number;

  @Column({type: "int", nullable: false, default: 20})
  max_days_per_month: number;

  @OneToOne(() => User, (user: User) => user.company)
  @JoinColumn()
  manager: User;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0.8,
  })
  sick_leave_percent_factor: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0.8,
  })
  vacation_percent_factor: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  on_demand_percent_factor: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0.0976,
  })
  retirement_rate: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0.05,
  })
  disability_rate: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0.09,
  })
  healthcare_rate: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0.2,
  })
  income_tax_rate: number;

  @OneToMany(() => Employee, (employee: Employee) => employee.company)
  employees: Employee[];

  @OneToMany(
    () => JoinRequest,
    (joinRequest: JoinRequest) => joinRequest.company
  )
  join_requests: JoinRequest[];
}
