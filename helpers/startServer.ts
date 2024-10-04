import { DataSource } from "typeorm";
import { Logger } from "winston";
import { orm_config } from "../ormconfig";
import Express from "express";
import { AppDataSource } from "../data-source";

export const startServer = async (app: Express.Application, logger: Logger) => {
  // try {
  //   await AppDataSource.initialize(); // Nawiązywanie połączenia z bazą danych
  //   logger.info("Connection with db established successfully");
  // } catch (error) {
  //   logger.error("Error connecting to the database:", error);
  //   process.exit(1);
  // }
  try {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error}`);
    process.exit(1);
  }
};
