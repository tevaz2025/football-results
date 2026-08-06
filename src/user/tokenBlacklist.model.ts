import mongoose, { Document, Schema } from 'mongoose';

export interface ITokenBlacklist extends Document {
  token: string;
  expiresAt: Date;
}

const TokenBlacklistSchema = new Schema<ITokenBlacklist>({
  token:     { type: String, required: true, unique: true },
  // TTL index: MongoDB elimina el documento automáticamente cuando expira el token
  // así la blacklist no crece para siempre
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', TokenBlacklistSchema);
