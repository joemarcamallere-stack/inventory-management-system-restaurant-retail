import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BusinessModulesGuard } from '../auth/business-modules.guard';
import { RequiredBusinessModules } from '../auth/business-modules.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateIngredientAlternativeDto } from './dto/create-ingredient-alternative.dto';
import { UpdateIngredientAlternativeDto } from './dto/update-ingredient-alternative.dto';
import { IngredientAlternativesService } from './ingredient-alternatives.service';

@Controller('ingredient-alternatives')
@UseGuards(JwtAuthGuard, RolesGuard, BusinessModulesGuard)
@Roles('Admin', 'Manager')
@RequiredBusinessModules('RESTAURANT')
export class IngredientAlternativesController {
  constructor(
    private readonly ingredientAlternativesService: IngredientAlternativesService,
  ) {}

  @Post()
  create(
    @Body() createIngredientAlternativeDto: CreateIngredientAlternativeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ingredientAlternativesService.create(
      createIngredientAlternativeDto,
      currentUser.businessId,
    );
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.ingredientAlternativesService.findAll(currentUser.businessId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIngredientAlternativeDto: UpdateIngredientAlternativeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ingredientAlternativesService.update(
      id,
      updateIngredientAlternativeDto,
      currentUser.businessId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ingredientAlternativesService.remove(id, currentUser.businessId);
  }
}
