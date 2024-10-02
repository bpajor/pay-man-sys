import { DataSourceOptions } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const orm_config: DataSourceOptions = {
  type: "postgres",
  host: isProduction ? undefined : process.env.TYPEORM_HOST,
  port: isProduction ? undefined : Number(process.env.TYPEORM_PORT),
  username: isProduction ? undefined : process.env.TYPEORM_USERNAME,
  password: isProduction ? undefined : process.env.TYPEORM_PASSWORD,
  database: isProduction ? undefined : process.env.TYPEORM_DATABASE,
  url: isProduction ? process.env.DATABASE_URL : undefined,
  entities: ["./entity/**/*.ts"],
  synchronize: process.env.TYPEORM_SYNCHRONIZE === "true",
  logging: process.env.TYPEORM_LOGGING === "true",
  ssl: isProduction,
  extra: isProduction ? { ssl: { rejectUnauthorized: false } } : undefined,
};
