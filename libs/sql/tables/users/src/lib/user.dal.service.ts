import { Injectable } from '@nestjs/common';
import { UserCreateObject, UserEntity } from './user.entity';
import { UserRepo } from './user.repo';

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

@Injectable()
export class UserDalService {
  constructor(private readonly repo: UserRepo) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOneBy({ id });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOneBy({ email: normalizeEmail(email) });
  }

  findByFirebaseUid(firebaseUid: string): Promise<UserEntity | null> {
    return this.repo.findOneBy({ firebaseUid });
  }

  // The Firebase account's new email. The caller checks first that no other user has it.
  async updateEmail(id: string, email: string): Promise<void> {
    await this.repo.update({ id }, { email: normalizeEmail(email) });
  }

  async updateName(id: string, name: string): Promise<void> {
    await this.repo.update({ id }, { name });
  }

  create(user: UserCreateObject): Promise<UserEntity> {
    return this.repo.save(
      this.repo.create({ ...user, email: normalizeEmail(user.email) }),
    );
  }
}
