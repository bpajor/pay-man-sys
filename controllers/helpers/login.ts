import axios from "axios";
import crypto from "crypto";
import { Logger } from "winston";

export const hasPasswordBeenLeaked = async (
  password: string,
  logger: Logger
): Promise<boolean> => {
  const hashed_password = crypto
    .createHash("sha1")
    .update(password)
    .digest("hex");

  try {
    logger.info("Checking password against haveibeenpwned database");
    const response = await axios.get(
      `https://api.pwnedpasswords.com/range/${hashed_password.slice(0, 5)}`
    );

    if (response.status !== 200) {
      logger.error("haveibeenpwned database responed with non 200 status code");
      throw new Error("Error while checking password");
    }

    logger.info("haveibeenpwned database responded with 200 status code");

    const passwords = response.data.split("\n");

    for (const p of passwords) {
      const [hash, count] = p.split(":");

      if (hash === hashed_password.slice(5).toUpperCase()) {
        logger.warn("Password has been leaked");
        return true;
      }
    }
  } catch (error) {
    throw new Error("Error while checking password");
  }

  return false;
};
