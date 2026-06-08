import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.create(createUserDto, currentUser.businessId);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findAll(currentUser.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findOne(id, currentUser.businessId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.update(id, updateUserDto, currentUser.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.remove(id, currentUser.businessId);
  }
}
