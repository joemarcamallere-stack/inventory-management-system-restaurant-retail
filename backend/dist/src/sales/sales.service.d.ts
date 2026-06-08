import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
export declare class SalesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateSaleDto, businessId: string, cashierId?: string): Promise<any>;
    findAll(businessId: string, locationId?: string, status?: string, dateFrom?: string, dateTo?: string, page?: number, limit?: number): Promise<PaginatedResult<any>>;
    findOne(id: string, businessId: string): Promise<{
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
    refund(id: string, refundReason: string, businessId: string, refundedById?: string): Promise<{
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
    private readonly saleInclude;
}
