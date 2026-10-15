import type { CredentialErrors } from "./credentials";

export type SignInState = {
  email: string;
  fieldErrors: CredentialErrors;
  formError: string | null;
};

export const initialSignInState: SignInState = { email: "", fieldErrors: {}, formError: null };
