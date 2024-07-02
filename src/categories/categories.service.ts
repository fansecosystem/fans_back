import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import {
  PaginateFunction,
  PaginatedResult,
  paginator,
} from 'src/@shared/paginator/prisma.paginator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const paginate = paginator({ limit: 10 });

@Injectable()
export class CategoriesService {
  paginate: PaginateFunction;

  constructor(private readonly prismaService: PrismaService) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.prismaService.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        thumbnail: createCategoryDto.thumbnail,
        parentId: createCategoryDto.parent,
      },
    });
  }

  findAll({ orderBy, page, limit }): Promise<PaginatedResult<Category>> {
    const query = { where: { deletedAt: null } };
    if (orderBy) {
      query['orderBy'] = {
        [orderBy.split('_')[0]]: orderBy.split('_')[1],
      };
    }
    return paginate(this.prismaService.category, query, { page, limit });
  }

  async findOne(id: number) {
    const category = await this.prismaService.category.findUnique({
      where: {
        id,
        deletedAt: null,
      },
    });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return this.prismaService.category.update({
      data: {
        name: updateCategoryDto.name,
        description: updateCategoryDto.description,
        thumbnail: updateCategoryDto.thumbnail,
      },
      where: {
        id,
      },
    });
  }

  remove(id: number) {
    return this.prismaService.category.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
