import test from "node:test";
import assert from "node:assert/strict";
import { registerUserSchema, verifySignupOtpSchema } from "../../../lib/db/src/schema/schema";
import {
  authEmailSchema,
  authErrorMessage,
  signupInputSchema,
  signupVerificationSchema,
} from "../../pdf-convert-master/src/lib/authValidation";

test("signup trims email/name but preserves the exact password in both clients and API", () => {
  const input = { email: "  student@example.com \n", password: " password ", name: " Student " };
  const expected = { email: "student@example.com", password: " password ", name: "Student" };
  assert.deepEqual(signupInputSchema.parse(input), expected);
  assert.deepEqual(registerUserSchema.parse(input), expected);
});

test("signup form and API agree on accepted and rejected email formats", () => {
  for (const email of ["student@example.com", "student+class@example.co.uk", " student@example.com ", "a@b", "student@", "@example.com", "a..b@example.com", "student@example.com extra"]) {
    const input = { email, password: "example-password", name: "Student" };
    assert.equal(signupInputSchema.safeParse(input).success, registerUserSchema.safeParse(input).success, email);
    assert.equal(authEmailSchema.safeParse(email).success, registerUserSchema.safeParse(input).success, email);
  }
  assert.equal(authEmailSchema.safeParse("a@b").success, false);
});

test("signup form and API reject short passwords and blank or overly long names", () => {
  for (const overrides of [{ password: "12345" }, { name: " " }, { name: "A".repeat(121) }]) {
    const input = { email: "student@example.com", password: "example-password", name: "Student", ...overrides };
    assert.equal(signupInputSchema.safeParse(input).success, false);
    assert.equal(registerUserSchema.safeParse(input).success, false);
  }
});

test("verification preserves the six-digit OTP requirement and trims input", () => {
  const input = { email: " student@example.com ", code: " 012345 " };
  assert.deepEqual(signupVerificationSchema.parse(input), verifySignupOtpSchema.parse(input));
  assert.equal(signupVerificationSchema.parse(input).code, "012345");
  for (const code of ["12345", "1234567", "abcdef"]) {
    assert.equal(signupVerificationSchema.safeParse({ ...input, code }).success, false);
    assert.equal(verifySignupOtpSchema.safeParse({ ...input, code }).success, false);
  }
});

test("legacy production validation details are displayed instead of the generic error", () => {
  assert.equal(authErrorMessage({
    error: "Validation failed",
    details: [{ path: ["email"], message: "Invalid email format" }],
  }, "Sign up failed"), "Invalid email format");
  assert.equal(authErrorMessage({ error: "User already exists with this email" }, "Sign up failed"), "User already exists with this email");
  assert.equal(authErrorMessage({ error: "Validation failed" }, "Sign up failed"), "Please check your details and try again.");
  assert.equal(authErrorMessage(null, "Sign up failed"), "Sign up failed");
});
