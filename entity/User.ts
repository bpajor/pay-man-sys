import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('users')
export class User {
  // uid - unique id for user
  @PrimaryGeneratedColumn()
  id: number;

  // @Column({ unique: true, length: 50, type: "varchar", nullable: false })
  // username: string;

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

  @Column({type: "enum", enum: ["employee", "manager"], })
  account_type: string;
}
