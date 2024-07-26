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
        throw new BadRequestException('Usuário já possui cadastro');
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
          throw new InternalServerErrorException(
            'Falha no cadastro do usuário',
          );
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
    const user = await this.prismaService.user.findFirst({
      where: {
        email: data.email,
      },
    });
    if (!user) {
      throw new BadRequestException('Verifique suas credenciais');
    }
    if (!user.active) {
      throw new BadRequestException('Usuário bloqueado');
    }
    const response = await this.keycloakService.getUserToken(
      data.email,
      data.password,
    );
    if (!response) {
      throw new BadRequestException('Verifique suas credenciais');
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
        throw new BadRequestException('Código de verificação inválido');
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
        message: 'E-mail verificado com sucesso',
      };
    } catch (error) {
      Logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao verificar e-mail');
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        const user = await prisma.user.findFirst({
          where: {
            email,
            emailVerified: false,
            active: true,
          },
        });
        if (!user) {
          throw new BadRequestException('Usuário não encontrado');
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
        message: 'E-mail de verificação reenviado com sucesso',
      };
    } catch (error) {
      Logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Falha ao reenviar e-mail de verificação',
      );
    }
  }

  async forgotPassword(email: string) {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        const user = await prisma.user.findFirst({
          where: {
            email,
            active: true,
          },
        });
        if (!user) {
          throw new BadRequestException('Usuário não encontrado');
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
        message: 'E-mail de redefinição de senha enviado com sucesso',
      };
    } catch (error) {
      Logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Falha ao enviar e-mail de redefinição de senha',
      );
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      let error = '';
      await this.prismaService.$transaction(async (prisma) => {
        const user = await prisma.user.findFirst({
          where: {
            email: resetPasswordDto.email,
            active: true,
          },
        });
        if (!user) {
          error = 'Usuário não encontrado';
          return;
        }
        // Se o usuário tentar redefinir a senha mais de 3 vezes, bloqueia o usuário
        if (user.resetPasswordTryCount >= 3) {
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              verificationCode: null,
              resetPasswordTryCount: 0,
              active: false,
            },
          });
          error =
            'Limite de tentativas de redefinição de senha excedido, contate o suporte';
          return;
        }
        if (user.verificationCode !== resetPasswordDto.verificationCode) {
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              resetPasswordTryCount: user.resetPasswordTryCount + 1,
            },
          });
          error = 'Código de verificação inválido';
          return;
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
            resetPasswordTryCount: 0,
          },
        });
      });
      if (error) {
        throw new BadRequestException(error);
      }
      return {
        message: 'Senha redefinida com sucesso',
      };
    } catch (error) {
      Logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao redefinir senha');
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
      throw new BadRequestException('Usuário não encontrado');
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
