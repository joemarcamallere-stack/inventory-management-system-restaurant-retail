import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string) {
    return this.prisma.businessSetting.findMany({
      where: { businessId },
      orderBy: { key: 'asc' },
    });
  }

  upsert(key: string, value: unknown, businessId: string) {
    return this.prisma.businessSetting.upsert({
      where: { businessId_key: { businessId, key } },
      create: {
        businessId,
        key,
        value: value as Prisma.InputJsonValue,
      },
      update: {
        value: value as Prisma.InputJsonValue,
      },
    });
  }
}
