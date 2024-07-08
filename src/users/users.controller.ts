import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthenticatedUser, Public, Roles } from 'nest-keycloak-connect';
import { CreateUserDto } from './dto/create-user.dto';
import { EmailPasswordAuthDto } from './dto/email-password-auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('/auth')
  @Public()
  auth(@Body() emailPasswordAuthDto: EmailPasswordAuthDto) {
    return this.usersService.auth(emailPasswordAuthDto);
  }

  @Get()
  @Roles({ roles: ['sys-admin'] })
  findAll(
    @Query('orderBy') orderBy: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @AuthenticatedUser() user: any,
  ) {
    console.log('user', user);
    return this.usersService.findAll({ orderBy, page, limit, search });
  }

  @Get(':id')
  @Roles({ roles: ['sys-admin'] })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
