import { DataSourceOptions } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

const is_not_local = process.env.NODE_ENVIRONMENT !== "local";
console.log(process.env.NODE_ENVIRONMENT);
console.log(`is_not_local: \n\n\n\n\n\n\n${is_not_local}`);

export const orm_config: DataSourceOptions= {
  type: "postgres",
  host: is_not_local ? undefined : process.env.TYPEORM_HOST,
  port: is_not_local ? undefined : Number(process.env.TYPEORM_PORT),
  username: is_not_local ? undefined : process.env.TYPEORM_USERNAME,
  password: is_not_local ? undefined : process.env.TYPEORM_PASSWORD,
  database: is_not_local ? undefined : process.env.TYPEORM_DATABASE,
  url: is_not_local ? process.env.DATABASE_URL : undefined,
  entities: is_not_local ? ["build/entity/**/*.js"] : ["build/entity/**/*.js", "./entity/**/*.ts"],
  migrations: ["build/migration/**/*.js"],
  synchronize: process.env.TYPEORM_SYNCHRONIZE === "true",
  logging: process.env.TYPEORM_LOGGING === "true",
  ssl: is_not_local,
  extra: is_not_local ? { ssl: { rejectUnauthorized: false } } : undefined,
};