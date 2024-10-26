import { UserSession } from "../../types";

export const userInSessionFieldsExist = (check_mask: string[], session_user: UserSession): boolean => {
  return check_mask.every((field) => {
    return field in session_user;
  });
};
