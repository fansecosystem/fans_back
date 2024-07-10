import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { CreateKeycloakUserDto } from './dto/create-keycloak-user.dto';

@Injectable()
export class KeycloakService {
  constructor(private readonly httpService: HttpService) {}

  async getAdminAccessToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', process.env.KEYCLOAK_ADMIN_USERNAME);
    params.append('password', process.env.KEYCLOAK_ADMIN_PASSWORD);
    params.append('client_id', 'admin-cli');
    try {
      const response = await this.httpService.axiosRef.post(
        `${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response?.data?.access_token;
    } catch (error) {
      Logger.error(JSON.stringify(error));
      return null;
    }
  }

  async createUser(data: CreateKeycloakUserDto) {
    try {
      const accessToken = await this.getAdminAccessToken();
      if (!accessToken) {
        throw new InternalServerErrorException('Failed to get access token');
      }

      await this.httpService.axiosRef.post(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
        {
          username: data.username,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          enabled: true,
          emailVerified: false,
          credentials: [
            {
              type: 'password',
              value: data.password,
              temporary: false,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const userResponse = await this.httpService.axiosRef.get(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?username=${data.username}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const user = userResponse.data[0];
      const userId = user.id;

      if (!userId) {
        throw new InternalServerErrorException('Failed to get user id');
      }

      const roleResponse = await this.httpService.axiosRef.get(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/clients/${process.env.KEYCLOAK_CLIENT_UUID}/roles/${data.role}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const userRole = roleResponse.data;

      await this.httpService.axiosRef.post(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}/role-mappings/clients/${process.env.KEYCLOAK_CLIENT_UUID}`,
        [userRole],
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return userId;
    } catch (error) {
      console.log(error);
      Logger.error('Failed to create user', error);
      return null;
    }
  }

  async getUserToken(username: string, password: string) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', username);
      params.append('password', password);
      params.append('client_id', process.env.KEYCLOAK_CLIENT_ID);
      params.append('client_secret', process.env.KEYCLOAK_SECRET);
      const response = await this.httpService.axiosRef.post(
        `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data;
    } catch (error) {
      Logger.error('Failed to get token', error);
      return null;
    }
  }

  getEmailFromBearerToken(bearerToken: string) {
    if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
      throw new Error('Invalid Bearer token');
    }
    const token = bearerToken.slice(7); // Remove 'Bearer ' prefix
    const decodedToken = jwt.decode(token);
    if (!decodedToken) {
      throw new Error('Failed to decode token');
    }
    if (!decodedToken.email) {
      throw new Error('Email not found in token');
    }
    return decodedToken.email;
  }

  async verifyUserEmail(email: string) {
    try {
      const accessToken = await this.getAdminAccessToken();
      if (!accessToken) {
        throw new InternalServerErrorException('Failed to get access token');
      }

      const userResponse = await this.httpService.axiosRef.get(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?email=${email}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const user = userResponse.data[0];
      if (!user) {
        throw new InternalServerErrorException('User not found');
      }

      await this.httpService.axiosRef.put(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${user.id}`,
        {
          emailVerified: true,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return true;
    } catch (error) {
      Logger.error('Failed to verify user email', error);
      return false;
    }
  }

  async updatePassword(userId: string, password: string) {
    const accessToken = await this.getAdminAccessToken();
    if (!accessToken) {
      throw new InternalServerErrorException('Failed to get access token');
    }
    return this.httpService.axiosRef.put(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}/reset-password`,
      {
        type: 'password',
        value: password,
        temporary: false,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  }
}
