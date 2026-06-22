import { Module } from '@nestjs/common';
import { IngredientAlternativesController } from './ingredient-alternatives.controller';
import { IngredientAlternativesService } from './ingredient-alternatives.service';

@Module({
  controllers: [IngredientAlternativesController],
  providers: [IngredientAlternativesService],
})
export class IngredientAlternativesModule {}
