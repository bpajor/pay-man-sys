import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "./Company";
import { JoinRequest } from "./JoinRequest";
import { Employee } from "./Employee";

@Entity("users")
export class User {
  // uid - unique id for user
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, type: "varchar", nullable: false })
  name: string;

  @Column({ length: 50, type: "varchar", nullable: false })
  last_name: string;

  @Column({ unique: true, length: 50, type: "varchar", nullable: false })
  email: string;

  @Column({ length: 255, type: "varchar", nullable: false })
  password_hash: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "enum", enum: ["employee", "manager"] })
  account_type: string;

  @Column({ type: "varchar", nullable: true })
  reset_token: string | null;

  @Column({ type: "timestamp", nullable: true })
  reset_token_expiration: Date | null;

  @Column({ type: "varchar", nullable: true })
  two_fa_secret: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone_number: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  home_address: string;

  @Column({ type: "date", nullable: true })
  date_of_birth: Date;

  @OneToOne(() => Company, (company: Company) => company.manager)
  company: Company;

  @OneToMany(
    () => JoinRequest,
    (joinRequest: JoinRequest) => joinRequest.user
  )
  join_requests: JoinRequest[];

  @OneToMany(() => Employee, (employee: Employee) => employee.user)
  employees: Employee[];
}
