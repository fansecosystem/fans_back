import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public, Roles } from 'nest-keycloak-connect';
import { ValidationTransform } from 'src/@shared/pipes/validation-transform.pipe';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { createCategorySchema } from './validators/create-category.validator';
import { updateCategorySchema } from './validators/update-category.validator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles({ roles: ['sys-admin'] })
  create(
    @Body(new ValidationTransform(createCategorySchema))
    createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @Public()
  findAll(
    @Query('orderBy') orderBy: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.categoriesService.findAll({ orderBy, page, limit });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  @Roles({ roles: ['sys-admin'] })
  update(
    @Param('id') id: string,
    @Body(new ValidationTransform(updateCategorySchema))
    updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}
