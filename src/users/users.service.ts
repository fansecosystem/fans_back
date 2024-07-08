import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { paginator } from 'src/@shared/paginator/prisma.paginator';
import { KeycloakService } from 'src/keycloak/keycloak.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { EmailPasswordAuthDto } from './dto/email-password-auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const paginate = paginator({ limit: 10 });

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly keycloakService: KeycloakService,
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
        await prisma.user.create({
          data: {
            name: createUserDto.name,
            email: createUserDto.email,
            document: createUserDto.document,
            phone: createUserDto.phone,
            role: 'app-user',
          },
        });
        const created = await this.keycloakService.createUser({
          username: createUserDto.email,
          email: createUserDto.email,
          firstName: createUserDto.name.split(' ')[0],
          lastName: createUserDto.name.split(' ')[1],
          password: createUserDto.password,
        });
        if (!created) {
          throw new InternalServerErrorException('User creation failed');
        }
      });
      return {
        message: 'User created successfully',
      };
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
        { document: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    return paginate(this.prismaService.user, query, { page, limit });
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
