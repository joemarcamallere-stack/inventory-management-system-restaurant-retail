import { Injectable } from '@nestjs/common';
import { BusinessModule, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class POSSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string, module?: BusinessModule) {
    return this.prisma.pOSSetting.findMany({
      where: {
        businessId,
        ...(module ? { module } : {}),
      },
      orderBy: [{ module: 'asc' }, { key: 'asc' }],
    });
  }

  upsert(
    key: string,
    value: unknown,
    businessId: string,
    module: BusinessModule,
  ) {
    return this.prisma.pOSSetting.upsert({
      where: { businessId_module_key: { businessId, module, key } },
      create: {
        businessId,
        module,
        key,
        value: value as Prisma.InputJsonValue,
      },
      update: {
        value: value as Prisma.InputJsonValue,
      },
    });
  }
}
