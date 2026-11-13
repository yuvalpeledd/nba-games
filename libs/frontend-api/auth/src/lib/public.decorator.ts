import { CustomDecorator, SetMetadata } from '@nestjs/common';

// A route (or controller) anyone may call: AccessGuard, global, guards every other one.
export const PUBLIC_KEY = 'public';
export const Public = (): CustomDecorator => SetMetadata(PUBLIC_KEY, true);
