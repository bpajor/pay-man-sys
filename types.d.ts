import session from "express-session";

export type UserSession = { account_type: "employee" | "manager"; email: string; uid: number; company_id: number | null, employee_id: number | null, authorized_employees_ids: number[] };

declare module "express-session" {
  export interface SessionData {
    user: UserSession;
    pending_2fa: boolean;
    unlogged_email: string;
    hashed_password: string;
    jrequests_pending: boolean;
    not_authenticated_csrf_secret: string;
    csrf_secret: string;
  }
}
