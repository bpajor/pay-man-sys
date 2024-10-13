import session from 'express-session';

declare module 'express-session' {
  export interface SessionData {
    uid: number;
    email: string;
    account_type: "employee" | "manager";
    pending_2fa: boolean;
    unlogged_email: string;
    hashed_password: string;
  }
}