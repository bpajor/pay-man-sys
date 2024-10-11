import { Logger } from "winston";
import { AppDataSource } from "../data-source";

export const connectToDb = async (logger: Logger) => {
  try {
    await AppDataSource.initialize(); // Nawiązywanie połączenia z bazą danych
    logger.info("Connection with db established successfully");
  } catch (error) {
    logger.error("Error connecting to the database:", error);
    process.exit(1);
  }
};
