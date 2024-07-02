import { Injectable } from '@nestjs/common';
import { paginator } from 'src/@shared/paginator/prisma.paginator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

const paginate = paginator({ limit: 10 });

@Injectable()
export class PartnersService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createPartnerDto: CreatePartnerDto) {
    return this.prismaService.partner.create({
      data: {
        name: createPartnerDto.name,
        categoryId: createPartnerDto.categoryId,
        thumbnail: createPartnerDto.thumbnail,
      },
    });
  }

  findAll({ orderBy, name, categoryId, page, limit }) {
    const query = { where: { deletedAt: null } };
    if (orderBy) {
      query['orderBy'] = {
        [orderBy.split('_')[0]]: orderBy.split('_')[1],
      };
    }
    if (name) {
      query['where']['name'] = { contains: name, mode: 'insensitive' };
    }
    if (categoryId) {
      query['where']['categoryId'] = parseInt(categoryId);
    }
    return paginate(this.prismaService.partner, query, { page, limit });
  }

  findOne(id: number) {
    return this.prismaService.partner.findUnique({
      where: { id, deletedAt: null },
    });
  }

  update(id: number, updatePartnerDto: UpdatePartnerDto) {
    return this.prismaService.partner.update({
      where: { id },
      data: {
        name: updatePartnerDto.name,
        categoryId: updatePartnerDto.categoryId,
        thumbnail: updatePartnerDto.thumbnail,
      },
    });
  }

  remove(id: number) {
    return this.prismaService.partner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
