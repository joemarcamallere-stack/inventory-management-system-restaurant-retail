import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientAlternativeDto } from './dto/create-ingredient-alternative.dto';
import { UpdateIngredientAlternativeDto } from './dto/update-ingredient-alternative.dto';

type IngredientAlternativeRow = {
  id: string;
  parentIngredientId: string;
  parentIngredientName: string;
  alternativeIngredientId: string;
  alternativeIngredientName: string;
  additionalPrice: number;
  isAvailable: boolean;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class IngredientAlternativesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIngredientAlternativeDto, businessId: string) {
    await this.assertIngredients(dto, businessId);

    try {
      const id = randomUUID();
      const rows = await this.prisma.$queryRaw<IngredientAlternativeRow[]>`
        INSERT INTO "IngredientAlternative" (
          "id",
          "parentIngredientId",
          "alternativeIngredientId",
          "additionalPrice",
          "isAvailable",
          "businessId",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${dto.parentIngredientId},
          ${dto.alternativeIngredientId},
          ${dto.additionalPrice ?? 0},
          ${dto.isAvailable ?? true},
          ${businessId},
          ${new Date()}
        )
        RETURNING *
      `;

      return this.findOne(rows[0].id, businessId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This ingredient alternative already exists');
      }
      throw error;
    }
  }

  async findAll(businessId: string) {
    return this.prisma.$queryRaw<IngredientAlternativeRow[]>`
      SELECT
        ia."id",
        ia."parentIngredientId",
        parent."name" AS "parentIngredientName",
        ia."alternativeIngredientId",
        alternative."name" AS "alternativeIngredientName",
        ia."additionalPrice",
        ia."isAvailable",
        ia."businessId",
        ia."createdAt",
        ia."updatedAt"
      FROM "IngredientAlternative" ia
      INNER JOIN "InventoryItem" parent ON parent."id" = ia."parentIngredientId"
      INNER JOIN "InventoryItem" alternative ON alternative."id" = ia."alternativeIngredientId"
      WHERE ia."businessId" = ${businessId}
      ORDER BY parent."name" ASC, alternative."name" ASC
    `;
  }

  async findOne(id: string, businessId: string) {
    const rows = await this.prisma.$queryRaw<IngredientAlternativeRow[]>`
      SELECT
        ia."id",
        ia."parentIngredientId",
        parent."name" AS "parentIngredientName",
        ia."alternativeIngredientId",
        alternative."name" AS "alternativeIngredientName",
        ia."additionalPrice",
        ia."isAvailable",
        ia."businessId",
        ia."createdAt",
        ia."updatedAt"
      FROM "IngredientAlternative" ia
      INNER JOIN "InventoryItem" parent ON parent."id" = ia."parentIngredientId"
      INNER JOIN "InventoryItem" alternative ON alternative."id" = ia."alternativeIngredientId"
      WHERE ia."id" = ${id} AND ia."businessId" = ${businessId}
      LIMIT 1
    `;

    const alternative = rows[0];
    if (!alternative) {
      throw new NotFoundException(`Ingredient alternative #${id} not found`);
    }
    return alternative;
  }

  async update(
    id: string,
    dto: UpdateIngredientAlternativeDto,
    businessId: string,
  ) {
    const current = await this.findOne(id, businessId);
    const next = {
      parentIngredientId: dto.parentIngredientId ?? current.parentIngredientId,
      alternativeIngredientId:
        dto.alternativeIngredientId ?? current.alternativeIngredientId,
      additionalPrice: dto.additionalPrice ?? current.additionalPrice,
      isAvailable: dto.isAvailable ?? current.isAvailable,
    };

    await this.assertIngredients(next, businessId);

    try {
      await this.prisma.$executeRaw`
        UPDATE "IngredientAlternative"
        SET
          "parentIngredientId" = ${next.parentIngredientId},
          "alternativeIngredientId" = ${next.alternativeIngredientId},
          "additionalPrice" = ${next.additionalPrice},
          "isAvailable" = ${next.isAvailable},
          "updatedAt" = ${new Date()}
        WHERE "id" = ${id} AND "businessId" = ${businessId}
      `;

      return this.findOne(id, businessId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This ingredient alternative already exists');
      }
      throw error;
    }
  }

  async remove(id: string, businessId: string) {
    const alternative = await this.findOne(id, businessId);
    await this.prisma.$executeRaw`
      DELETE FROM "IngredientAlternative"
      WHERE "id" = ${id} AND "businessId" = ${businessId}
    `;
    return alternative;
  }

  private async assertIngredients(
    dto: Pick<
      CreateIngredientAlternativeDto,
      'parentIngredientId' | 'alternativeIngredientId'
    >,
    businessId: string,
  ) {
    if (dto.parentIngredientId === dto.alternativeIngredientId) {
      throw new BadRequestException(
        'Original and alternative ingredients must be different',
      );
    }

    const items = await this.prisma.inventoryItem.findMany({
      where: {
        businessId,
        id: { in: [dto.parentIngredientId, dto.alternativeIngredientId] },
      },
      select: { id: true, itemType: true },
    });

    if (items.length !== 2) {
      throw new NotFoundException('One or more ingredients were not found');
    }

    if (items.some((item) => item.itemType !== 'INGREDIENT')) {
      throw new BadRequestException(
        'Ingredient alternatives can only use ingredient inventory records',
      );
    }
  }
}
