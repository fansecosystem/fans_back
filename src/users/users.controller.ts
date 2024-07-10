import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AuthenticatedUser, Public, Roles } from 'nest-keycloak-connect';
import { ValidationTransform } from 'src/@shared/pipes/validation-transform.pipe';
import { IKeycloakUser } from 'src/interfaces/keycloak-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { EmailPasswordAuthDto } from './dto/email-password-auth.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UsersService } from './users.service';
import { authTokenSchema } from './validators/auth-token.validator';
import { createUserSchema } from './validators/create-user.validator';
import { emailValidationSchema } from './validators/resend-email-verification.validator';
import { resetPasswordSchema } from './validators/reset-password.validator';
import { updateUserSchema } from './validators/update-user.validator';
import { verifyEmailSchema } from './validators/verify-email.validator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public()
  create(
    @Body(new ValidationTransform(createUserSchema))
    createUserDto: CreateUserDto,
  ) {
    return this.usersService.create({ ...createUserDto, role: 'user' });
  }

  @Post('/partner')
  @Roles({ roles: ['sys-admin'] })
  createPartner(
    @Body(new ValidationTransform(createUserSchema))
    createUserDto: CreateUserDto,
  ) {
    return this.usersService.create({ ...createUserDto, role: 'partner' });
  }

  @Post('/auth')
  @Public()
  auth(
    @Body(new ValidationTransform(authTokenSchema))
    emailPasswordAuthDto: EmailPasswordAuthDto,
  ) {
    return this.usersService.auth(emailPasswordAuthDto);
  }

  @HttpCode(200)
  @Post('/verify')
  verify(
    @Body(new ValidationTransform(verifyEmailSchema))
    verifyEmailDto: VerifyEmailDto,
    @AuthenticatedUser() user: IKeycloakUser,
  ) {
    return this.usersService.verifyEmail(
      user?.sub,
      user?.email,
      verifyEmailDto.verificationCode,
    );
  }

  @Post('/resend-verification')
  @Public()
  resendVerification(
    @Body(new ValidationTransform(emailValidationSchema))
    dto: Pick<CreateUserDto, 'email'>,
  ) {
    return this.usersService.resendVerificationEmail(dto.email);
  }

  @Post('/forgot-password')
  @Public()
  forgotPassword(
    @Body(new ValidationTransform(emailValidationSchema))
    dto: Pick<CreateUserDto, 'email'>,
  ) {
    return this.usersService.forgotPassword(dto.email);
  }

  @Post('/reset-password')
  @Public()
  resetPassword(
    @Body(new ValidationTransform(resetPasswordSchema))
    resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  @Get()
  @Roles({ roles: ['sys-admin'] })
  findAll(
    @Query('orderBy') orderBy: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    return this.usersService.findAll({ orderBy, page, limit, search });
  }

  @Get('/me')
  getCurrentUser(@AuthenticatedUser() user: IKeycloakUser) {
    return this.usersService.getCurrentUser(user?.sub);
  }

  @Get(':id')
  @Roles({ roles: ['sys-admin'] })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put()
  update(
    @Body(new ValidationTransform(updateUserSchema))
    updateUserDto: UpdateUserDto,
    @AuthenticatedUser() user: IKeycloakUser,
  ) {
    return this.usersService.update(user?.sub, updateUserDto);
  }

  @Delete(':id')
  @Roles({ roles: ['sys-admin'] })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
