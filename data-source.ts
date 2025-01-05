import { DataSource } from "typeorm";
import { orm_config } from "./ormconfig"; 

export const AppDataSource = new DataSource(orm_config); 
