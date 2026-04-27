import { Module } from '@nestjs/common';

// Sessions are tracked via the refresh_tokens table in AuthModule.
// This module is reserved for future session analytics, device management,
// and real-time WebSocket session tracking.
@Module({})
export class SessionsModule {}
