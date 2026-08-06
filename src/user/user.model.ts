import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'viewer' | 'admin';

export interface IPrediction {
  matchId: mongoose.Types.ObjectId;
  homeScore: number;
  awayScore: number;
  createdAt: Date;
}

export interface IFavoriteTeam {
  teamId: number;
  teamName: string;
  logo: string;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  favoriteMatches: mongoose.Types.ObjectId[];
  favoriteTeams: IFavoriteTeam[];
  predictions: IPrediction[];
  loginAttempts: number;       // intentos fallidos de login
  lockUntil: Date | null;      // bloqueado hasta esta fecha
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

const PredictionSchema = new Schema<IPrediction>({
  matchId:   { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  homeScore: { type: Number, required: true, min: 0 },
  awayScore: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'El username es obligatorio'],
      unique: true,
      trim: true,
      minlength: [3, 'El username debe tener al menos 3 caracteres'],
      maxlength: [30, 'El username no puede tener más de 30 caracteres'],
      match: [/^[a-zA-Z0-9_]+$/, 'El username solo puede tener letras, números y guiones bajos'],
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      select: false,  // nunca se devuelve en queries salvo que se pida explícitamente
    },
    role:            { type: String, enum: ['viewer', 'admin'], default: 'viewer' },
    favoriteMatches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
    favoriteTeams: [{
      teamId:   { type: Number, required: true },
      teamName: { type: String, required: true, trim: true },
      logo:     { type: String, default: '' },
      _id: false,
    }],
    predictions:     [PredictionSchema],

    // Seguridad: bloqueo por intentos fallidos
    loginAttempts: { type: Number, default: 0 },
    lockUntil:     { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash de contraseña antes de guardar — sal de 12 rondas (muy seguro)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Nunca devolver el password ni datos de bloqueo en las respuestas
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    return ret;
  },
});

// Verifica si la cuenta está bloqueada
UserSchema.methods.isLocked = function (): boolean {
  return this.lockUntil !== null && this.lockUntil > new Date();
};

// Compara contraseña ingresada con el hash guardado
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Incrementa intentos fallidos — bloquea 30 minutos al llegar a 5
// Usa updateOne directo para no disparar el pre('save') del password
UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  const newAttempts = this.loginAttempts + 1;
  if (newAttempts >= 5) {
    await mongoose.model('User').updateOne(
      { _id: this._id },
      { loginAttempts: 0, lockUntil: new Date(Date.now() + 30 * 60 * 1000) }
    );
    this.loginAttempts = 0;
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  } else {
    await mongoose.model('User').updateOne(
      { _id: this._id },
      { loginAttempts: newAttempts }
    );
    this.loginAttempts = newAttempts;
  }
};

// Resetea el contador después de un login exitoso
// Usa updateOne directo para no disparar el pre('save') del password
UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  await mongoose.model('User').updateOne(
    { _id: this._id },
    { loginAttempts: 0, lockUntil: null }
  );
  this.loginAttempts = 0;
  this.lockUntil = null;
};

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
