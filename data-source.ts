import { DataSource } from "typeorm";
import { orm_config } from "./ormconfig";  // Zaktualizuj ścieżkę w zależności od lokalizacji ormconfig.ts

export const AppDataSource = new DataSource(orm_config);  // Inicjalizujemy DataSource na podstawie konfiguracji
