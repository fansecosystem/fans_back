export type KeycloakRole = 'sys-admin' | 'partner' | 'user';

export class CreateKeycloakUserDto {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: KeycloakRole;
}
