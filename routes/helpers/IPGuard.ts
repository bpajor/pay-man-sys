import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";

export const IPGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (
    process.env.NODE_ENVIRONMENT === "local" &&
    (ip === "::1" || ip === "127.0.0.1")
  ) {
    return next();
  }

  if (!ip) {
    res.status(403);
    return next(new Error("Forbidden"));
  }

  try {
    // await isIPReliable(ip);
    // next();
    if (await isIPReliable(ip)) {
      logger.info(`IP address ${ip} is reliable`);
      return next();
    } else {
      logger.warn(`IP address ${ip} is not reliable`);
      res.status(403);
      return next(new Error("Forbidden"));
    }
  } catch (error) {
    return next(new Error("Internal server error"));
  }
};

export const isIPReliable = async (ip: string | string[]): Promise<boolean> => {
  if (Array.isArray(ip)) {
    for (const singleIP of ip) {
      try {
        const is_ip_reliable = await isIPReliable(singleIP);
        if (!is_ip_reliable) {
          return false;
        }
      } catch (error) {
        throw new Error("Error while checking IP address");
      }
    }
    return true;
  }

  try {
    const response = await axios.get("https://api.abuseipdb.com/api/v2/check", {
      params: {
        ipAddress: ip,
        maxAgeInDays: 90,
        verbose: true,
      },
      headers: {
        Key: process.env.ABUSEIP_API_KEY, // Zamień na swój klucz API
        Accept: "application/json",
      },
    });

    if (response.status !== 200) {
      throw new Error("Error while checking IP address");
    }

    if (response.data.data.reports.length > 0) {
      return false;
    }
  } catch (error) {
    throw new Error("Error while checking IP address");
  }

  return true;
};
