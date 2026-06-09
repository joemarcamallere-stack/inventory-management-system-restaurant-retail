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
    try {
      return await this.prisma.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: dto.supplierId,
          notes: dto.notes,
          paymentMethod: dto.paymentMethod,
          paymentTerms: dto.paymentTerms,
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
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: this.poInclude,
        orderBy: { createdAt: 'desc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
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
      if (po.status !== 'APPROVED') {
        throw new BadRequestException('Only APPROVED orders can be received');
      }

      for (const receiveItem of dto.items) {
        const poItem = po.items.find((i) => i.id === receiveItem.id);
        if (!poItem) continue;

        if (receiveItem.receivedQty > 0 && poItem.inventoryItemId) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: poItem.inventoryItemId },
          });
          if (!item) continue;

          const previousQuantity = item.quantity;
          const newQuantity = previousQuantity + receiveItem.receivedQty;

          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: newQuantity },
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
            receivedQty: receiveItem.receivedQty,
            rejectedQty: receiveItem.rejectedQty,
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          receivedById,
        },
        include: this.poInclude,
      });
    });
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
    createdBy: { select: { id: true, name: true } },
    receivedBy: { select: { id: true, name: true } },
  };
}
