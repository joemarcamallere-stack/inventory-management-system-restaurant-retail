import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseOrderDto, businessId: string, createdById?: string) {
    const orderNumber = `PO-${Date.now()}`;
    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    await this.assertReferencesBelongToBusiness(dto, businessId);
    try {
      return await this.prisma.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: dto.supplierId,
          notes: dto.notes,
          paymentMethod: dto.paymentMethod,
          paymentTerms: dto.paymentTerms,
          expectedDelivery: dto.expectedDelivery
            ? new Date(dto.expectedDelivery)
            : undefined,
          totalAmount,
          businessId,
          createdById,
          items: {
            create: dto.items.map((item) => ({
              inventoryItemId: item.inventoryItemId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
        include: this.poInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Order number "${orderNumber}" already exists`);
      }
      throw error;
    }
  }

  async findAll(
    businessId: string,
    status?: string,
    supplierId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.PurchaseOrderWhereInput = {
      businessId,
      ...(status ? { status: status as any } : {}),
      ...(supplierId ? { supplierId } : {}),
    };
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const data = await tx.purchaseOrder.findMany({
        where,
        include: this.poInclude,
        orderBy: { createdAt: 'desc' },
        ...paginateQuery(page, limit),
      });
      const total = await tx.purchaseOrder.count({ where });
      return [data, total] as const;
    });
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, businessId },
      include: this.poInclude,
    });
    if (!po) throw new NotFoundException(`Purchase order #${id} not found`);
    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, businessId: string) {
    const po = await this.findOne(id, businessId);
    if (!['DRAFT', 'SUBMITTED'].includes(po.status)) {
      throw new BadRequestException('Only DRAFT or SUBMITTED orders can be edited');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: dto,
      include: this.poInclude,
    });
  }

  async submit(id: string, businessId: string) {
    const po = await this.findOne(id, businessId);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT orders can be submitted');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      include: this.poInclude,
    });
  }

  async approve(id: string, businessId: string, role: string) {
    if (!['Admin', 'Manager'].includes(role)) {
      throw new ForbiddenException('Only Admin or Manager can approve purchase orders');
    }
    const po = await this.findOne(id, businessId);
    if (po.status !== 'SUBMITTED') {
      throw new BadRequestException('Only SUBMITTED orders can be approved');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: this.poInclude,
    });
  }

  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    businessId: string,
    receivedById?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, businessId },
        include: { items: true },
      });
      if (!po) throw new NotFoundException(`Purchase order #${id} not found`);
      if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
        throw new BadRequestException(
          'Only APPROVED or PARTIALLY_RECEIVED orders can be received',
        );
      }

      const receiptNumber = `GR-${Date.now()}`;
      const receiptItems: Array<{
        purchaseOrderItemId: string;
        inventoryItemId?: string;
        receivedQty: number;
        rejectedQty: number;
        condition?: string;
        notes?: string;
      }> = [];

      for (const receiveItem of dto.items) {
        const poItem = po.items.find((i) => i.id === receiveItem.id);
        if (!poItem) {
          throw new BadRequestException(
            `Purchase order item #${receiveItem.id} does not belong to this order`,
          );
        }

        const processedQty = poItem.receivedQty + poItem.rejectedQty;
        const submittedQty = receiveItem.receivedQty + receiveItem.rejectedQty;
        if (submittedQty <= 0) continue;
        if (processedQty + submittedQty > poItem.quantity) {
          throw new BadRequestException(
            `Receipt quantity for "${poItem.name}" exceeds the remaining ordered quantity`,
          );
        }

        if (receiveItem.receivedQty > 0 && poItem.inventoryItemId) {
          const item = await tx.inventoryItem.findFirst({
            where: { id: poItem.inventoryItemId, businessId },
          });
          if (!item) {
            throw new BadRequestException(
              `Inventory item for "${poItem.name}" is unavailable`,
            );
          }

          const previousQuantity = item.quantity;
          const newQuantity = previousQuantity + receiveItem.receivedQty;

          await tx.inventoryItem.update({
            where: { id: item.id },
            data: {
              quantity: newQuantity,
              ...(receiveItem.expiryDate
                ? { expiryDate: new Date(receiveItem.expiryDate) }
                : {}),
              ...(receiveItem.storageTemperature
                ? { storageTemperature: receiveItem.storageTemperature }
                : {}),
            },
          });

          await tx.stockMovement.create({
            data: {
              type: 'STOCK_IN',
              quantity: receiveItem.receivedQty,
              previousQuantity,
              newQuantity,
              unit: item.unit,
              reason: 'Purchase order received',
              referenceType: 'PURCHASE_ORDER',
              referenceId: po.id,
              notes: `Received from PO ${po.orderNumber}`,
              itemId: item.id,
              locationId: item.locationId,
              businessId,
              createdById: receivedById,
            },
          });
        }

        await tx.purchaseOrderItem.update({
          where: { id: receiveItem.id },
          data: {
            receivedQty: { increment: receiveItem.receivedQty },
            rejectedQty: { increment: receiveItem.rejectedQty },
          },
        });

        receiptItems.push({
          purchaseOrderItemId: poItem.id,
          inventoryItemId: poItem.inventoryItemId ?? undefined,
          receivedQty: receiveItem.receivedQty,
          rejectedQty: receiveItem.rejectedQty,
          condition: receiveItem.condition,
          notes: receiveItem.notes,
        });
      }

      if (receiptItems.length === 0) {
        throw new BadRequestException('At least one item quantity must be received or rejected');
      }

      await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: po.id,
          receivedById,
          notes: dto.notes,
          businessId,
          items: { create: receiptItems },
        },
      });

      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: po.id },
      });
      const isComplete = updatedItems.every(
        (item) => item.receivedQty + item.rejectedQty >= item.quantity,
      );

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: isComplete ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
          receivedAt: isComplete ? new Date() : undefined,
          receivedById,
        },
        include: this.poInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async reject(
    id: string,
    reason: string,
    businessId: string,
    role: string,
  ) {
    if (!['Admin', 'Manager'].includes(role)) {
      throw new ForbiddenException(
        'Only Admin or Manager can reject purchase orders',
      );
    }
    const po = await this.findOne(id, businessId);
    if (!['SUBMITTED', 'APPROVED'].includes(po.status)) {
      throw new BadRequestException(
        'Only SUBMITTED or APPROVED orders can be rejected',
      );
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        rejectedAt: new Date(),
      },
      include: this.poInclude,
    });
  }

  async findGoodsReceipts(
    businessId: string,
    purchaseOrderId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.GoodsReceiptWhereInput = {
      businessId,
      ...(purchaseOrderId ? { purchaseOrderId } : {}),
    };
    const include = {
      purchaseOrder: { include: { supplier: true } },
      receivedBy: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          purchaseOrderItem: true,
          inventoryItem: true,
        },
      },
    };
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const data = await tx.goodsReceipt.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        ...paginateQuery(page, limit),
      });
      const total = await tx.goodsReceipt.count({ where });
      return [data, total] as const;
    });
    return paginate(data, total, page, limit);
  }

  async cancel(id: string, businessId: string) {
    const po = await this.findOne(id, businessId);
    if (po.status === 'RECEIVED') {
      throw new BadRequestException('RECEIVED orders cannot be cancelled');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.poInclude,
    });
  }

  private readonly poInclude = {
    supplier: true,
    items: { include: { inventoryItem: true } },
    goodsReceipts: {
      include: {
        receivedBy: { select: { id: true, name: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' as const },
    },
    createdBy: { select: { id: true, name: true } },
    receivedBy: { select: { id: true, name: true } },
  };

  private async assertReferencesBelongToBusiness(
    dto: CreatePurchaseOrderDto,
    businessId: string,
  ) {
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, businessId, isActive: true },
        select: { id: true },
      });
      if (!supplier) {
        throw new BadRequestException('Supplier is unavailable for this business');
      }
    }

    const itemIds = dto.items
      .map((item) => item.inventoryItemId)
      .filter((id): id is string => Boolean(id));
    if (itemIds.length === 0) return;

    const count = await this.prisma.inventoryItem.count({
      where: { id: { in: [...new Set(itemIds)] }, businessId },
    });
    if (count !== new Set(itemIds).size) {
      throw new BadRequestException(
        'One or more inventory items are unavailable for this business',
      );
    }
  }
}
