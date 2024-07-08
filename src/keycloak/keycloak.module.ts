import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { KeycloakService } from './keycloak.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [KeycloakService],
  exports: [KeycloakService],
})
export class KeycloakModule {}
