export { UserModule } from './lib/user.module';
export { normalizeEmail, UserDalService } from './lib/user.dal.service';
// A value for the other sql libs (relations); everyone else imports it as a type.
export { UserEntity } from './lib/user.entity';
export type { UserCreateObject } from './lib/user.entity';
