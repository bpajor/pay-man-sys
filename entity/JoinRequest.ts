import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./User";
import { Company } from "./Company";

@Entity("join_requests")
@Unique(["user"])
export class JoinRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user: User) => user.join_requests)
    user: User;

    @ManyToOne(() => Company, (company: Company) => company.join_requests)
    company: Company;

    @Column({type: "enum", enum: ["pending", "approved", "rejected"], default: "pending"})
    status: "pending" | "approved" | "rejected";

    @Column({type: "timestamp", default: () => "CURRENT_TIMESTAMP"})
    requested_at: Date;

    @Column({type: "timestamp", nullable: true})
    responded_at: Date | null;
}