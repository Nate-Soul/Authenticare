import { Schema, model, type Document, type Query } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../../../config/env.js";
import type { UserRole } from "../../types/user.js";

export interface UserDocument extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  tokenVersion: number;
  emailVerified: boolean;
  verificationTokenHash: string | null;
  verificationTokenExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(plain: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    tokenVersion: { type: Number, default: 0 },
    emailVerified: { type: Boolean, default: false },
    // Token hashes are `select: false` so they never ride along on ordinary reads.
    verificationTokenHash: { type: String, default: null, select: false },
    verificationTokenExpiresAt: { type: Date, default: null, select: false },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Excludes soft-deleted users from every find/findOne/findById by default.
// Callers that explicitly need deleted rows should use `.setOptions({ includeDeleted: true })`.
userSchema.pre(/^find/, function (this: Query<unknown, UserDocument>, next) {
  const options = this.getOptions();
  if (!options.includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

userSchema.pre("save", async function (next) {
  // BUG FIX (from the original repo): this guard used to be missing its
  // `return`, so every save — even ones that only touched firstName/email —
  // fell through and re-hashed the *already-hashed* password, silently
  // breaking login after any profile update.
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(env.BCRYPT_COST);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.matchPassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.password);
};

userSchema.index({ createdAt: -1 });
userSchema.index({ verificationTokenHash: 1 });
userSchema.index({ passwordResetTokenHash: 1 });

export const UserModel = model<UserDocument>("User", userSchema);
