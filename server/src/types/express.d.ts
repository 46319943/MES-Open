import { User as UserType } from '@/shared/models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: Omit<UserType, 'providerId'>;
      rawBody?: string;
    }
  }
}