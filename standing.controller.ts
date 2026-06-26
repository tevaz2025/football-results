import mongoose, { Document, Schema } from 'mongoose';

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface IEvent {
  time: number;         // minuto
  team: string;
  player: string;
  type: string;         // 'Goal' | 'Card' | 'subst'
  detail: string;       // 'Normal Goal', 'Yellow Card', etc.
}

export interface IMatch extends Document {
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreHT: number | null;   // resultado al entretiempo
  awayScoreHT: number | null;
  date: Date;
  competition: string;
  competitionId: number;
  competitionLogo: string;
  country: string;
  countryCode: string;
  status: MatchStatus;
  statusShort: string;          // 'FT', '1H', 'HT', etc.
  elapsed: number | null;       // minuto actual si está en vivo
  venue: string;
  referee: string;
  events: IEvent[];             // goles, tarjetas, sustituciones
  round: string;                // "Regular Season - 15"
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>({
  time:   { type: Number, default: 0 },
  team:   { type: String, default: '' },
  player: { type: String, default: '' },
  type:   { type: String, default: '' },
  detail: { type: String, default: '' },
}, { _id: false });

const MatchSchema = new Schema<IMatch>(
  {
    externalId:      { type: Number, required: true, unique: true },
    homeTeam:        { type: String, required: true, trim: true },
    awayTeam:        { type: String, required: true, trim: true },
    homeLogo:        { type: String, default: '' },
    awayLogo:        { type: String, default: '' },
    homeScore:       { type: Number, default: null },
    awayScore:       { type: Number, default: null },
    homeScoreHT:     { type: Number, default: null },
    awayScoreHT:     { type: Number, default: null },
    date:            { type: Date, required: true },
    competition:     { type: String, required: true, trim: true },
    competitionId:   { type: Number, default: 0 },
    competitionLogo: { type: String, default: '' },
    country:         { type: String, default: '' },
    countryCode:     { type: String, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'finished', 'postponed', 'cancelled'],
      default: 'scheduled',
    },
    statusShort: { type: String, default: '' },
    elapsed:     { type: Number, default: null },
    venue:       { type: String, default: '' },
    referee:     { type: String, default: '' },
    events:      { type: [EventSchema], default: [] },
    round:       { type: String, default: '' },
  },
  { timestamps: true }
);

// Índices para queries rápidas
MatchSchema.index({ date: 1 });
MatchSchema.index({ date: 1, status: 1 });
MatchSchema.index({ competitionId: 1, date: 1 });
MatchSchema.index({ country: 1, date: 1 });
MatchSchema.index({ status: 1 });

export const Match = mongoose.model<IMatch>('Match', MatchSchema);
