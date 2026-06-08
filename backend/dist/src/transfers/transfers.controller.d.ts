import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
export declare class TransfersController {
    private readonly transfersService;
    constructor(transfersService: TransfersService);
    create(dto: CreateTransferDto, user: AuthenticatedUser): Promise<{
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
            createdAt: Date;
            quantity: number;
            inventoryItemId: string;
            transferId: string;
        })[];
        createdBy: {
            id: string;
            name: string;
        } | null;
        fromLocation: {
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
        toLocation: {
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransferStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        fromLocationId: string;
        toLocationId: string;
        transferNumber: string;
        completedAt: Date | null;
    }>;
    findAll(user: AuthenticatedUser, status?: string, fromLocationId?: string, toLocationId?: string, page?: string, limit?: string): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
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
            createdAt: Date;
            quantity: number;
            inventoryItemId: string;
            transferId: string;
        })[];
        createdBy: {
            id: string;
            name: string;
        } | null;
        fromLocation: {
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
        toLocation: {
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransferStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        fromLocationId: string;
        toLocationId: string;
        transferNumber: string;
        completedAt: Date | null;
    }>;
    dispatch(id: string, user: AuthenticatedUser): Promise<{
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
            createdAt: Date;
            quantity: number;
            inventoryItemId: string;
            transferId: string;
        })[];
        createdBy: {
            id: string;
            name: string;
        } | null;
        fromLocation: {
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
        toLocation: {
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransferStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        fromLocationId: string;
        toLocationId: string;
        transferNumber: string;
        completedAt: Date | null;
    }>;
    complete(id: string, user: AuthenticatedUser): Promise<{
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
            createdAt: Date;
            quantity: number;
            inventoryItemId: string;
            transferId: string;
        })[];
        createdBy: {
            id: string;
            name: string;
        } | null;
        fromLocation: {
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
        toLocation: {
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransferStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        fromLocationId: string;
        toLocationId: string;
        transferNumber: string;
        completedAt: Date | null;
    }>;
    cancel(id: string, user: AuthenticatedUser): Promise<{
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
            createdAt: Date;
            quantity: number;
            inventoryItemId: string;
            transferId: string;
        })[];
        createdBy: {
            id: string;
            name: string;
        } | null;
        fromLocation: {
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
        toLocation: {
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransferStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        fromLocationId: string;
        toLocationId: string;
        transferNumber: string;
        completedAt: Date | null;
    }>;
}
