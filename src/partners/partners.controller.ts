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
import { ValidationTransform } from 'src/@shared/pipes/validation-transform.pipe';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnersService } from './partners.service';
import { createPartnerSchema } from './validators/create-partner.validator';
import { updatePartnerSchema } from './validators/update-partner.validator';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  create(
    @Body(new ValidationTransform(createPartnerSchema))
    createPartnerDto: CreatePartnerDto,
  ) {
    return this.partnersService.create(createPartnerDto);
  }

  @Get()
  findAll(
    @Query('orderBy') orderBy: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('name') name: string,
    @Query('categoryId') categoryId: string,
  ) {
    return this.partnersService.findAll({
      orderBy,
      name,
      categoryId,
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ValidationTransform(updatePartnerSchema))
    updatePartnerDto: UpdatePartnerDto,
  ) {
    return this.partnersService.update(+id, updatePartnerDto);
  }

  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partnersService.remove(+id);
  }
}
