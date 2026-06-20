import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto });
  }

  async findAllForUser(
    userId: string,
    businessId: string,
    onlyUnread = false,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where = {
      userId,
      businessId,
      ...(onlyUnread ? { isRead: false } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException(`Notification #${id} not found`);
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string, businessId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, businessId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async countUnread(userId: string, businessId: string) {
    return this.prisma.notification.count({
      where: { userId, businessId, isRead: false },
    });
  }

  // ─── Event triggers (best-effort; callers wrap in try/catch) ────────────────

  private async getStockManagerIds(businessId: string) {
    const managers = await this.prisma.user.findMany({
      where: { businessId, role: { in: ['Admin', 'Manager'] } },
      select: { id: true },
    });
    return managers.map((m) => m.id);
  }

  /**
   * Emit a LOW_STOCK notification when an item's stock crosses at/below its
   * reorder threshold. Only fires on the downward crossing (so we don't spam on
   * every subsequent sale), de-duped against an existing unread alert per item.
   */
  async notifyLowStock(
    items: {
      id: string;
      name: string;
      unit?: string | null;
      previousQuantity: number;
      newQuantity: number;
      reorderPoint?: number | null;
      minStock?: number | null;
      businessId: string;
    }[],
  ) {
    const crossed = items.filter((item) => {
      const threshold = item.reorderPoint ?? item.minStock ?? 0;
      return (
        threshold > 0 &&
        item.previousQuantity > threshold &&
        item.newQuantity <= threshold
      );
    });
    if (crossed.length === 0) return;

    const businessId = crossed[0].businessId;
    const recipientIds = await this.getStockManagerIds(businessId);
    if (recipientIds.length === 0) return;

    for (const item of crossed) {
      // Skip if an unread low-stock alert already exists for this item.
      const existing = await this.prisma.notification.findFirst({
        where: {
          businessId,
          type: 'LOW_STOCK',
          entityType: 'INVENTORY_ITEM',
          entityId: item.id,
          isRead: false,
        },
        select: { id: true },
      });
      if (existing) continue;

      const unit = item.unit ? ` ${item.unit}` : '';
      const threshold = item.reorderPoint ?? item.minStock;
      await this.prisma.notification.createMany({
        data: recipientIds.map((userId) => ({
          type: 'LOW_STOCK' as const,
          title: 'Low stock',
          message: `"${item.name}" is low — ${item.newQuantity}${unit} left (reorder at ${threshold}${unit}).`,
          entityType: 'INVENTORY_ITEM',
          entityId: item.id,
          userId,
          businessId,
        })),
      });
    }
  }

  /** Notify the staff member who submitted a purchase order that it was approved. */
  async notifyPurchaseOrderApproved(po: {
    id: string;
    poNumber?: string | null;
    createdById?: string | null;
    businessId: string;
  }) {
    if (!po.createdById) return;
    await this.prisma.notification.create({
      data: {
        type: 'PURCHASE_ORDER_APPROVED',
        title: 'Purchase order approved',
        message: `Your purchase order ${po.poNumber ?? po.id} has been approved.`,
        entityType: 'PURCHASE_ORDER',
        entityId: po.id,
        userId: po.createdById,
        businessId: po.businessId,
      },
    });
  }
}
