import session from "express-session";

declare module "express-session" {
  export interface SessionData {
    user: { account_type: "employee" | "manager"; email: string; uid: number; company_id: number | null};
    pending_2fa: boolean;
    unlogged_email: string;
    hashed_password: string;
    jrequests_pending: boolean;
  }
}
