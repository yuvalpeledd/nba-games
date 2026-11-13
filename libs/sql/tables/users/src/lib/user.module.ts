import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDalService } from './user.dal.service';
import { UserEntity } from './user.entity';
import { UserRepo } from './user.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UserRepo, UserDalService],
  exports: [UserDalService],
})
export class UserModule {}
