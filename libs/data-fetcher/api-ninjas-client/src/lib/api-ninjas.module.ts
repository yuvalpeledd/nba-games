import { Module } from '@nestjs/common';
import { ApiNinjasClient } from './api-ninjas.client';

@Module({
  providers: [ApiNinjasClient],
  exports: [ApiNinjasClient],
})
export class ApiNinjasModule {}
