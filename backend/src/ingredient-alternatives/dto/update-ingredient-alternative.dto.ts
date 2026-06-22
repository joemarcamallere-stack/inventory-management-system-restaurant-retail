import { PartialType } from '@nestjs/mapped-types';
import { CreateIngredientAlternativeDto } from './create-ingredient-alternative.dto';

export class UpdateIngredientAlternativeDto extends PartialType(
  CreateIngredientAlternativeDto,
) {}
