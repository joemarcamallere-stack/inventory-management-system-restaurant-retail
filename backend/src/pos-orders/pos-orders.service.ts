import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessModule, DiningTableStatus, POSOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { CompletePOSOrderPaymentDto } from './dto/complete-pos-order-payment.dto';
import { CreatePOSOrderDto } from './dto/create-pos-order.dto';

@Injectable()
export class POSOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePOSOrderDto,
    businessId: string,
    module: BusinessModule,
    createdById?: string,
  ) {
    if (!dto.items.length) {
      throw new BadRequestException('POS order must include at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.assertOrderContext(tx, businessId, dto.locationId, dto.tableId);
      if (dto.tableId) {
        await this.markDiningTableStatus(tx, dto.tableId, businessId, DiningTableStatus.OCCUPIED);
      }

      const subtotal = dto.items.reduce(
        (sum, item) => sum + (item.totalPrice ?? item.quantity * item.unitPrice),
        0,
      );
      const discount = dto.discount ?? 0;
      const tax = dto.tax ?? 0;
      const serviceCharge = dto.serviceCharge ?? 0;
      const total = subtotal - discount + tax + serviceCharge;
      if (total < 0) {
        throw new BadRequestException('POS order total cannot be negative');
      }

      try {
        const order = await tx.pOSOrder.create({
          data: {
            orderNumber: dto.orderNumber?.trim() || `ORD-${Date.now()}`,
            orderType: dto.orderType,
            status: dto.status ?? POSOrderStatus.PENDING,
            customerName: dto.customerName,
            contactNumber: dto.contactNumber,
            tableName: dto.tableName,
            partySize: dto.partySize,
            subtotal,
            discount,
            discountType: dto.discountType,
            tax,
            serviceCharge,
            total,
            notes: dto.notes,
            locationId: dto.locationId,
            tableId: dto.tableId,
            businessId,
            module,
            createdById,
            items: {
              create: dto.items.map((item) => ({
                inventoryItemId: item.inventoryItemId,
                recipeId: item.recipeId,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice ?? item.quantity * item.unitPrice,
                itemType: item.itemType,
                notes: item.notes,
                customizations: (item.customizations ?? []) as Prisma.InputJsonValue,
              })),
            },
          },
          include: this.posOrderInclude,
        });

        if (module === BusinessModule.RESTAURANT) {
          await this.createKitchenTicketsForPOSOrder(tx, order, dto.items, businessId);
        }

        return tx.pOSOrder.findUnique({
          where: { id: order.id },
          include: this.posOrderInclude,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException(`POS order number "${dto.orderNumber}" already exists`);
        }
        throw error;
      }
    });
  }

  async findAll(
    businessId: string,
    module: BusinessModule,
    status?: string,
    paymentStatus?: string,
    locationId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.POSOrderWhereInput = {
      businessId,
      module,
      ...(status ? { status: status as any } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as any } : {}),
      ...(locationId ? { locationId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.pOSOrder.findMany({
        where,
        include: this.posOrderInclude,
        orderBy: { createdAt: 'desc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.pOSOrder.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string, module: BusinessModule) {
    const order = await this.prisma.pOSOrder.findFirst({
      where: { id, businessId, module },
      include: this.posOrderInclude,
    });
    if (!order) throw new NotFoundException(`POS order #${id} not found`);
    return order;
  }

  async updateStatus(
    id: string,
    status: POSOrderStatus,
    businessId: string,
    module: BusinessModule,
    notes?: string,
  ) {
    const result = await this.prisma.pOSOrder.updateMany({
      where: { id, businessId, module },
      data: {
        status,
        ...(notes !== undefined ? { notes } : {}),
        ...(status === POSOrderStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });
    if (result.count === 0) throw new NotFoundException(`POS order #${id} not found`);
    return this.findOne(id, businessId, module);
  }

  async void(
    id: string,
    voidReason: string,
    businessId: string,
    module: BusinessModule,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.pOSOrder.findFirst({
        where: { id, businessId, module, paymentStatus: 'NOT_PAID' },
        select: { id: true, tableId: true },
      });
      if (!order) {
        throw new BadRequestException('Only unpaid POS orders can be voided from this endpoint');
      }

      await tx.pOSOrder.update({
        where: { id: order.id },
        data: {
          status: 'VOIDED',
          paymentStatus: 'VOIDED',
          voidReason,
          voidedAt: new Date(),
        },
      });
      if (order.tableId) {
        await this.markDiningTableStatus(tx, order.tableId, businessId, DiningTableStatus.AVAILABLE);
      }
      await tx.kitchenOrder.updateMany({
        where: {
          posOrderId: order.id,
          businessId,
          status: { in: ['PENDING', 'PREPARING', 'READY'] },
        },
        data: {
          status: 'VOIDED',
          voidReason,
          voidedAt: new Date(),
        },
      });

      return tx.pOSOrder.findUnique({
        where: { id: order.id },
        include: this.posOrderInclude,
      });
    });
  }

  async completePayment(
    id: string,
    dto: CompletePOSOrderPaymentDto,
    businessId: string,
    module: BusinessModule,
    processedById?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "POSOrder"
        WHERE id = ${id}
        FOR UPDATE
      `;

      const order = await tx.pOSOrder.findFirst({
        where: { id, businessId, module },
        include: { items: true, sale: true },
      });
      if (!order) throw new NotFoundException(`POS order #${id} not found`);
      if (order.saleId || order.sale) {
        throw new BadRequestException('POS order is already linked to a sale');
      }
      if (order.paymentStatus !== 'NOT_PAID') {
        throw new BadRequestException('Only unpaid POS orders can be paid');
      }
      if (order.status === 'VOIDED' || order.status === 'CANCELLED') {
        throw new BadRequestException('Voided or cancelled POS orders cannot be paid');
      }

      if (dto.amountPaid < order.total) {
        throw new BadRequestException('Insufficient payment amount');
      }

      const inventoryBackedItems = order.items.filter((item) => item.inventoryItemId);
      const recipeBackedItems = order.items.filter((item) => item.recipeId && !item.inventoryItemId);
      const unsupportedItems = order.items.filter((item) => !item.inventoryItemId && !item.recipeId);
      if (unsupportedItems.length > 0) {
        throw new BadRequestException(
          'Every POS order item must reference an inventory item or recipe before payment',
        );
      }

      const recipes = recipeBackedItems.length > 0
        ? await tx.recipe.findMany({
            where: {
              id: { in: recipeBackedItems.map((item) => item.recipeId!) },
              businessId,
              isActive: true,
            },
            include: {
              ingredients: { include: { item: true } },
              menuItem: true,
            },
          })
        : [];
      const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

      for (const orderItem of recipeBackedItems) {
        const recipe = recipeMap.get(orderItem.recipeId!);
        if (!recipe) throw new NotFoundException(`Recipe ${orderItem.recipeId} not found`);
        if (!recipe.menuItemId) {
          throw new BadRequestException(`Recipe "${recipe.name}" is not linked to a menu item`);
        }
        if (recipe.ingredients.length === 0) {
          throw new BadRequestException(`Recipe "${recipe.name}" has no ingredients to deduct`);
        }
      }

      const itemIds = Array.from(new Set([
        ...inventoryBackedItems.map((item) => item.inventoryItemId!),
        ...recipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ingredient.itemId)),
      ]));
      if (itemIds.length > 0) {
        await tx.$queryRaw`
          SELECT id FROM "InventoryItem"
          WHERE id = ANY(${itemIds}::uuid[])
          FOR UPDATE
        `;
      }

      const inventoryItems = await tx.inventoryItem.findMany({
        where: { id: { in: itemIds }, businessId },
      });
      const itemMap = new Map(inventoryItems.map((item) => [item.id, item]));

      for (const orderItem of inventoryBackedItems) {
        const item = itemMap.get(orderItem.inventoryItemId!);
        if (!item) {
          throw new NotFoundException(`Inventory item ${orderItem.inventoryItemId} not found`);
        }
        if (item.quantity < orderItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${item.name}" (available: ${item.quantity}, required: ${orderItem.quantity})`,
          );
        }
      }

      for (const orderItem of recipeBackedItems) {
        const recipe = recipeMap.get(orderItem.recipeId!)!;
        const servingFactor = orderItem.quantity / Math.max(recipe.servings, 1);
        for (const ingredient of recipe.ingredients) {
          const item = itemMap.get(ingredient.itemId);
          if (!item) {
            throw new NotFoundException(`Ingredient item ${ingredient.itemId} not found`);
          }
          const requiredQuantity = ingredient.quantity * servingFactor;
          if (item.quantity < requiredQuantity) {
            throw new BadRequestException(
              `Insufficient stock for "${item.name}" (available: ${item.quantity}, required: ${requiredQuantity})`,
            );
          }
        }
      }

      const transactionNumber = `TXN-${Date.now()}`;
      const paymentNumber = `PAY-${Date.now()}`;
      const receiptNumber = `REC-${Date.now()}`;
      const change = dto.amountPaid - order.total;

      let sale;
      try {
        sale = await tx.sale.create({
          data: {
            transactionNumber,
            locationId: order.locationId,
            cashierId: processedById,
            subtotal: order.subtotal,
            discount: order.discount,
            tax: order.tax,
            total: order.total,
            paymentMethod: dto.paymentMethod,
            amountPaid: dto.amountPaid,
            change,
            customer: order.customerName,
            businessId,
            module,
            items: {
              create: order.items.map((orderItem) => ({
                inventoryItemId: orderItem.inventoryItemId ?? recipeMap.get(orderItem.recipeId!)!.menuItemId!,
                name: orderItem.name,
                quantity: orderItem.quantity,
                unitPrice: orderItem.unitPrice,
                totalPrice: orderItem.totalPrice,
              })),
            },
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException(`Transaction number "${transactionNumber}" already exists`);
        }
        throw error;
      }

      for (const orderItem of inventoryBackedItems) {
        const item = itemMap.get(orderItem.inventoryItemId!)!;
        const previousQuantity = item.quantity;
        const newQuantity = previousQuantity - orderItem.quantity;

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: newQuantity },
        });

        await tx.stockMovement.create({
          data: {
            type: 'SALE',
            quantity: orderItem.quantity,
            previousQuantity,
            newQuantity,
            unit: item.unit,
            reason: 'POS order payment',
            referenceType: 'SALE',
            referenceId: sale.id,
            notes: `Sale ${transactionNumber} from POS order ${order.orderNumber}`,
            itemId: item.id,
            locationId: order.locationId,
            businessId,
            module,
            createdById: processedById,
          },
        });

        itemMap.set(item.id, { ...item, quantity: newQuantity });
      }

      for (const orderItem of recipeBackedItems) {
        const recipe = recipeMap.get(orderItem.recipeId!)!;
        const servingFactor = orderItem.quantity / Math.max(recipe.servings, 1);
        for (const ingredient of recipe.ingredients) {
          const item = itemMap.get(ingredient.itemId)!;
          const requiredQuantity = ingredient.quantity * servingFactor;
          const previousQuantity = item.quantity;
          const newQuantity = previousQuantity - requiredQuantity;

          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: newQuantity },
          });

          await tx.stockMovement.create({
            data: {
              type: 'RECIPE_CONSUMPTION',
              quantity: requiredQuantity,
              previousQuantity,
              newQuantity,
              unit: item.unit ?? ingredient.unit,
              reason: 'POS order recipe consumption',
              referenceType: 'POS_ORDER',
              referenceId: order.id,
              notes: `Recipe ${recipe.name} consumed by POS order ${order.orderNumber}`,
              itemId: item.id,
              locationId: item.locationId,
              businessId,
              module: BusinessModule.RESTAURANT,
              createdById: processedById,
            },
          });

          itemMap.set(item.id, { ...item, quantity: newQuantity });
        }
      }

      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          method: dto.paymentMethod,
          amountDue: order.total,
          amountPaid: dto.amountPaid,
          change,
          status: 'PAID',
          saleId: sale.id,
          posOrderId: order.id,
          businessId,
          processedById,
        },
      });

      await tx.receipt.create({
        data: {
          receiptNumber,
          receiptData: (dto.receiptData ?? {
            receiptNumber,
            paymentNumber,
            transactionNumber,
            orderNumber: order.orderNumber,
            subtotal: order.subtotal,
            discount: order.discount,
            tax: order.tax,
            serviceCharge: order.serviceCharge,
            total: order.total,
            amountPaid: dto.amountPaid,
            change,
            paymentMethod: dto.paymentMethod,
          }) as Prisma.InputJsonValue,
          saleId: sale.id,
          posOrderId: order.id,
          paymentId: payment.id,
          businessId,
          printedAt: new Date(),
        },
      });

      await tx.pOSOrder.update({
        where: { id: order.id },
        data: {
          saleId: sale.id,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      if (order.tableId) {
        await this.markDiningTableStatus(tx, order.tableId, businessId, DiningTableStatus.AVAILABLE);
      }

      return tx.pOSOrder.findUnique({
        where: { id: order.id },
        include: this.posOrderInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async assertOrderContext(
    tx: Prisma.TransactionClient,
    businessId: string,
    locationId: string,
    tableId?: string,
  ) {
    const location = await tx.location.findFirst({
      where: { id: locationId, businessId },
      select: { id: true },
    });
    if (!location) throw new NotFoundException(`Location #${locationId} not found`);

    if (tableId) {
      const table = await tx.diningTable.findFirst({
        where: { id: tableId, businessId },
        select: { id: true, locationId: true, status: true },
      });
      if (!table) throw new NotFoundException(`Dining table #${tableId} not found`);
      if (table.locationId !== locationId) {
        throw new BadRequestException('Dining table does not belong to the selected location');
      }
      if (
        table.status !== DiningTableStatus.AVAILABLE &&
        table.status !== DiningTableStatus.RESERVED
      ) {
        throw new BadRequestException('Dining table is not available for a new POS order');
      }
    }
  }

  private async markDiningTableStatus(
    tx: Prisma.TransactionClient,
    tableId: string,
    businessId: string,
    status: DiningTableStatus,
  ) {
    await tx.diningTable.updateMany({
      where: { id: tableId, businessId },
      data: { status },
    });
  }

  private async createKitchenTicketsForPOSOrder(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      orderNumber: string;
      locationId: string;
      tableId: string | null;
      tableName: string | null;
    },
    items: CreatePOSOrderDto['items'],
    businessId: string,
  ) {
    const recipeItems = items.filter((item) => item.recipeId);
    for (const [index, item] of recipeItems.entries()) {
      const customizations = Array.isArray(item.customizations) ? item.customizations : [];
      await tx.kitchenOrder.create({
        data: {
          receiptNo: `${order.orderNumber}-K${index + 1}`,
          recipeId: item.recipeId!,
          quantity: item.quantity,
          notes: [
            item.notes,
            order.tableName ? `Table: ${order.tableName}` : undefined,
            customizations.length
              ? `Customizations: ${JSON.stringify(customizations)}`
              : undefined,
          ].filter(Boolean).join(' | ') || undefined,
          status: 'PENDING',
          locationId: order.locationId,
          tableId: order.tableId,
          posOrderId: order.id,
          businessId,
        },
      });
    }
  }

  private readonly posOrderInclude = {
    items: true,
    location: { select: { id: true, name: true } },
    table: { select: { id: true, tableNumber: true, status: true } },
    sale: { select: { id: true, transactionNumber: true, status: true } },
    kitchenOrders: {
      include: {
        recipe: { select: { id: true, name: true } },
        table: { select: { id: true, tableNumber: true } },
      },
    },
    payments: true,
    receipts: true,
    createdBy: { select: { id: true, name: true } },
  };
}
