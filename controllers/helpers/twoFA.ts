import OTPAuth from "otpauth";

export const verify2fa = async (userSecret: string, token: string) => {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(userSecret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return totp.validate({ token }) !== null;
};
