import { InferType, object, string } from 'yup';

// Shared by every form that creates or signs in a user.
export const userNameSchema = string().trim().min(1).max(255).required();
export const emailSchema = string()
  .trim()
  .lowercase()
  .email()
  .max(255)
  .required();
// The web's sign-up form; Firebase keeps the password (its own minimum is 6).
export const newPasswordSchema = string().min(8).max(128).required();

// A Firebase ID token (a JWT Google signs): the web signs in with Firebase, then hands its token to the API.
const idTokenSchema = string().max(4096).required();

// The user of the token's Firebase account (its email verified).
export const loginRequestSchema = object({ idToken: idTokenSchema });
export type LoginRequest = InferType<typeof loginRequestSchema>;

// A new user for the token's Firebase account, named.
export const signUpRequestSchema = object({
  idToken: idTokenSchema,
  name: userNameSchema,
});
export type SignUpRequest = InferType<typeof signUpRequestSchema>;

// PATCH /me: the signed-in user's name (their email and password are their Firebase account's).
export const updateMeRequestSchema = object({ name: userNameSchema });
export type UpdateMeRequest = InferType<typeof updateMeRequestSchema>;

// What /login and /sign-up answer. Firebase keeps the session itself (and renews its tokens).
export interface SessionDto {
  userId: string;
}

// GET /me: the signed-in user.
export interface UserDto {
  id: string;
  name: string;
  email: string;
}

// GET /firebase-config: what the web needs to reach Identity Platform before anyone signs in (the server's env,
// not the build).
export interface FirebaseConfigDto {
  apiKey: string;
  authDomain: string;
}
