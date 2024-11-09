import Tokens from "csrf";
import { Request, Response, NextFunction } from "express";
import { Logger } from "winston";

export const csrfNonAuthenticatedGenerator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  if (!req.session.not_authenticated_csrf_secret) {
    const tokens = new Tokens();
    req.session.not_authenticated_csrf_secret = tokens.secretSync();
  }

  return next();
};

export const csrfBodyValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  logger.info("Validating csrf token");

  // if (!res.locals.enable_csrf) {
  //   return next();
  // }

  const tokens = new Tokens();

  const origin_validated = validateOrigin(req);

  if (!origin_validated) {
    logger.warn("Origin not validated");
    res.status(403);
    return next(new Error("Unathorized"));
  }

  let server_csrf_secret;
  if (!req.session.user) {
    server_csrf_secret = req.session.not_authenticated_csrf_secret;
  } else {
    server_csrf_secret = req.session.csrf_secret;
  }

  if (!server_csrf_secret) {
    logger.warn("Csrf token not found in session");
    res.status(403);
    return next(new Error("Unathorized"));
  }

  if (!req.body.csrf_token) {
    logger.warn("Csrf token not found in body");
    res.status(403);
    return next(new Error("Unathorized"));
  }

  const body_csrf_token = req.body.csrf_token;

  if (!tokens.verify(server_csrf_secret, body_csrf_token)) {
    logger.warn("Csrf token not validated");
    res.status(403);
    return next(new Error("Unathorized"));
  }

  logger.info("Csrf token validated");
  return next();
};

export const csrfAPIValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  logger.info("Validating csrf token");

  // if (!res.locals.enable_csrf) {
  //   return next();
  // }

  const tokens = new Tokens();

  const origin_validated = validateOrigin(req);

  if (!origin_validated) {
    logger.warn("Origin not validated");
    res.status(403);
    return res.json({ error: "Unathorized" });
  }

  let server_csrf_secret;
  if (!req.session.user) {
    server_csrf_secret = req.session.not_authenticated_csrf_secret;
  } else {
    server_csrf_secret = req.session.csrf_secret;
  }

  if (!server_csrf_secret) {
    logger.warn("Csrf token not found in session");
    res.status(403);
    return res.json({ error: "Unathorized" });
  }

  if (!req.get("X-CSRF-Token")) {
    logger.warn("Csrf token not found in headers");
    res.status(403);
    return res.json({ error: "Unathorized" });
  }

  const header_csrf_token = req.get("X-CSRF-TOKEN")!;

  if (!tokens.verify(server_csrf_secret, header_csrf_token)) {
    logger.warn("Csrf token not validated");
    res.status(403);
    return res.json({ error: "Unathorized" });
  }

  logger.info("Csrf token validated");
  return next();
};

const validateOrigin = (req: Request) => {
  const origin = req.get("ORIGIN");
  const referer = req.get("REFERER");

  const is_valid_origin = origin === "null" || origin === process.env.BASE_URL;
  const is_valid_referer = referer?.includes(process.env.BASE_URL!);

  if (!origin && !referer) {
    return false;
  }

  if (origin && !referer) {
    return is_valid_origin;
  }

  if (!origin && referer) {
    return is_valid_referer;
  }

  return is_valid_origin && is_valid_referer;
  // if (
  //   !(
  //     req.get("ORIGIN") === "null" ||
  //     req.get("ORIGIN") === process.env.BASE_URL ||
  //     req.get("REFERER")?.includes(process.env.BASE_URL!) 
  //   )
  // ) { 
  //   return false;
  // }

  // return true;
};
