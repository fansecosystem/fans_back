import { Injectable } from '@nestjs/common';
import { paginator } from 'src/@shared/paginator/prisma.paginator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const paginate = paginator({ limit: 10 });

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createProductDto: CreateProductDto) {
    return this.prismaService.product.create({
      data: {
        name: createProductDto.name,
        description: createProductDto.description,
        price: createProductDto.price,
        thumbnail: createProductDto.thumbnail,
        quantity: createProductDto.quantity ?? 0,
        type: createProductDto.type,
      },
    });
  }

  findAll({ orderBy, page, limit }) {
    const query = { where: { deletedAt: null } };
    if (orderBy) {
      query['orderBy'] = {
        [orderBy.split('_')[0]]: orderBy.split('_')[1],
      };
    }
    return paginate(this.prismaService.product, query, { page, limit });
  }

  findOne(id: number) {
    return this.prismaService.product.findUnique({
      where: { id },
    });
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return this.prismaService.product.update({
      where: { id },
      data: {
        name: updateProductDto.name,
        description: updateProductDto.description,
        price: updateProductDto.price,
        thumbnail: updateProductDto.thumbnail,
        quantity: updateProductDto.quantity,
        type: updateProductDto.type,
      },
    });
  }

  remove(id: number) {
    return this.prismaService.product.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
