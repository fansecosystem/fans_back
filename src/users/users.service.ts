import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { paginator } from 'src/@shared/paginator/prisma.paginator';
import { KeycloakService } from 'src/keycloak/keycloak.service';
import { MailerService } from 'src/mailer/mailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { generateVerificationCode } from 'src/utils/generate-verification-code';
import { removeSpecialCharacters } from 'src/utils/removeSpecialCharacteres';
import { CreateUserDto } from './dto/create-user.dto';
import { EmailPasswordAuthDto } from './dto/email-password-auth.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const paginate = paginator({ limit: 10 });

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly keycloakService: KeycloakService,
    private readonly mailerService: MailerService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [
            { email: createUserDto.email },
            { document: createUserDto.document },
          ],
        },
      });
      if (user) {
        throw new BadRequestException('User already exists');
      }
      await this.prismaService.$transaction(async (prisma) => {
        const keycloakUserId = await this.keycloakService.createUser({
          username: createUserDto.email,
          email: createUserDto.email,
          firstName: createUserDto.name.split(' ')[0],
          lastName: createUserDto.name.split(' ')[1],
          password: createUserDto.password,
          role: createUserDto.role,
        });
        if (!keycloakUserId) {
          throw new InternalServerErrorException('User creation failed');
        }
        const verificationCode = generateVerificationCode();
        await prisma.user.create({
          data: {
            name: createUserDto.name,
            email: createUserDto.email,
            document: removeSpecialCharacters(createUserDto.document),
            phone: createUserDto.phone,
            role: createUserDto.role,
            keycloakUserId,
            verificationCode,
          },
        });
        this.mailerService.sendMail(
          createUserDto.email,
          createUserDto.name,
          'Verifique seu e-mail',
          process.env.MAILERSEND_VERIFY_EMAIL_TEMPLATE_ID,
          [
            {
              email: createUserDto.email,
              data: {
                name: createUserDto.name,
                verificationCode,
              },
            },
          ],
        );
      });
      return this.auth({
        email: createUserDto.email,
        password: createUserDto.password,
      });
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }

  async auth(data: EmailPasswordAuthDto) {
    const response = await this.keycloakService.getUserToken(
      data.email,
      data.password,
    );
    if (!response) {
      throw new BadRequestException('Invalid credentials');
    }
    return response;
  }

  async verifyEmail(
    keycloakUserId: string,
    email: string,
    verificationCode: string,
  ) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: {
          email,
          keycloakUserId,
          verificationCode,
        },
      });
      if (!user) {
        throw new BadRequestException('Invalid verification code');
      }
      await this.prismaService.$transaction(async (prisma) => {
        await this.keycloakService.verifyUserEmail(user.email);
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            emailVerified: true,
            verificationCode: null,
          },
        });
      });
      return {
        message: 'Email verified successfully',
      };
    } catch (error) {
      Logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to verify e-mail');
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        const user = await prisma.user.findFirst({
          where: {
            email,
            emailVerified: false,
          },
        });
        if (!user) {
          throw new BadRequestException('User not found');
        }
        const verificationCode = generateVerificationCode();
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            verificationCode,
          },
        });
        this.mailerService.sendMail(
          email,
          user.name,
          'Verifique seu e-mail',
          process.env.MAILERSEND_VERIFY_EMAIL_TEMPLATE_ID,
          [
            {
              email,
              data: {
                name: user.name,
                verificationCode,
              },
            },
          ],
        );
      });
      return {
        message: 'Verification e-mail sent successfully',
      };
    } catch (error) {
      Logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to resend verification e-mail',
      );
    }
  }

  async forgotPassword(email: string) {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        const user = await prisma.user.findFirst({
          where: {
            email,
          },
        });
        if (!user) {
          throw new BadRequestException('User not found');
        }
        const verificationCode = generateVerificationCode();
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            verificationCode,
          },
        });
        this.mailerService.sendMail(
          email,
          user.name,
          'Redefinir senha',
          process.env.MAILERSEND_RESET_PASSWORD_TEMPLATE_ID,
          [
            {
              email,
              data: {
                name: user.name,
                verificationCode,
              },
            },
          ],
        );
      });
      return {
        message: 'Password reset e-mail sent successfully',
      };
    } catch (error) {
      Logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to send password reset e-mail',
      );
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        const user = await prisma.user.findFirst({
          where: {
            verificationCode: resetPasswordDto.verificationCode,
            email: resetPasswordDto.email,
          },
        });
        if (!user) {
          throw new BadRequestException('Invalid verification code');
        }
        await this.keycloakService.updatePassword(
          user.keycloakUserId,
          resetPasswordDto.password,
        );
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            verificationCode: null,
          },
        });
      });
      return {
        message: 'Password updated successfully',
      };
    } catch (error) {
      Logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update password');
    }
  }

  findAll({ orderBy, page, limit, search }) {
    const query = { where: { deletedAt: null } };
    if (orderBy) {
      query['orderBy'] = {
        [orderBy.split('_')[0]]: orderBy.split('_')[1],
      };
    }
    if (search) {
      query['where']['OR'] = [
        { name: { contains: search } },
        { email: { contains: search } },
        { document: { contains: removeSpecialCharacters(search) } },
        { phone: { contains: search } },
      ];
    }
    return paginate(this.prismaService.user, query, { page, limit });
  }

  getCurrentUser(keycloakUserId: string) {
    return this.prismaService.user.findFirst({
      where: {
        keycloakUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findOne(id: number) {
    return this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
  }

  async update(keycloakUserId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findFirst({
      where: {
        keycloakUserId,
      },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: updateUserDto.name,
        document: removeSpecialCharacters(updateUserDto.document),
        phone: updateUserDto.phone,
      },
    });
  }

  remove(id: number) {
    return this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
