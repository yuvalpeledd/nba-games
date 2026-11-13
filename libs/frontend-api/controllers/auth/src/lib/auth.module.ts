import { Module } from '@nestjs/common';
import { FrontendApiAuthModule } from '@nba/frontend-api-auth';
import { UserModule } from '@nba/sql-users';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [FrontendApiAuthModule, UserModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class FrontendApiAuthControllerModule {}
