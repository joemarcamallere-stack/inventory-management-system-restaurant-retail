import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    create(dto: CreateSaleDto, user: AuthenticatedUser): Promise<any>;
    findAll(user: AuthenticatedUser, locationId?: string, status?: string, dateFrom?: string, dateTo?: string, page?: string, limit?: string): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string, user: AuthenticatedUser): Promise<{
        items: ({
            inventoryItem: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                businessId: string;
                itemType: import("@prisma/client").$Enums.InventoryItemType;
                sku: string | null;
                category: string;
                targetCustomer: string | null;
                subcategory: string | null;
                size: string | null;
                condition: string | null;
                quantity: number;
                price: number;
                unit: string | null;
                minStock: number | null;
                maxStock: number | null;
                reorderPoint: number | null;
                expiryDate: Date | null;
                storageTemperature: string | null;
                dateAdded: Date;
                locationId: string;
            };
        } & {
            id: string;
            name: string;
            createdAt: Date;
            quantity: number;
            inventoryItemId: string;
            unitPrice: number;
            totalPrice: number;
            saleId: string;
        })[];
        location: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            businessId: string;
            address: string;
            manager: string;
            phone: string;
            itemCount: number;
        };
        cashier: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SaleStatus;
        businessId: string;
        locationId: string;
        total: number;
        paymentMethod: string;
        discount: number;
        tax: number;
        amountPaid: number;
        customer: string | null;
        transactionNumber: string;
        cashierId: string | null;
        subtotal: number;
        change: number;
        refundReason: string | null;
    }>;
    refund(id: string, dto: RefundSaleDto, user: AuthenticatedUser): Promise<{
        items: ({
            inventoryItem: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                businessId: string;
                itemType: import("@prisma/client").$Enums.InventoryItemType;
                sku: string | null;
                category: string;
                targetCustomer: string | null;
                subcategory: string | null;
                size: string | null;
                condition: string | null;
                quantity: number;
                price: number;
                unit: string | null;
                minStock: number | null;
                maxStock: number | null;
                reorderPoint: number | null;
                expiryDate: Date | null;
                storageTemperature: string | null;
                dateAdded: Date;
                locationId: string;
            };
        } & {
            id: string;
            name: string;
            createdAt: Date;
            quantity: number;
            inventoryItemId: string;
            unitPrice: number;
            totalPrice: number;
            saleId: string;
        })[];
        location: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            businessId: string;
            address: string;
            manager: string;
            phone: string;
            itemCount: number;
        };
        cashier: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SaleStatus;
        businessId: string;
        locationId: string;
        total: number;
        paymentMethod: string;
        discount: number;
        tax: number;
        amountPaid: number;
        customer: string | null;
        transactionNumber: string;
        cashierId: string | null;
        subtotal: number;
        change: number;
        refundReason: string | null;
    }>;
}
