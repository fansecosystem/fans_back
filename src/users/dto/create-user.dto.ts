import { KeycloakRole } from 'src/keycloak/dto/create-keycloak-user.dto';

export class CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone: string;
  document: string;
  role: KeycloakRole;
}
