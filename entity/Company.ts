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
import { BudgetHistory } from "./BudgetHistory";

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, type: "varchar", nullable: false })
  name: string;

  @OneToOne(() => User, (user: User) => user.company)
  @JoinColumn()
  manager: User;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @OneToMany(() => Employee, (employee: Employee) => employee.company)
  employees: Employee[];

  @OneToMany(
    () => JoinRequest,
    (joinRequest: JoinRequest) => joinRequest.company
  )
  join_requests: JoinRequest[];

  @OneToMany(
    () => BudgetHistory,
    (budgetHistory: BudgetHistory) => budgetHistory.company
  )
  budget_histories: BudgetHistory[];
}
