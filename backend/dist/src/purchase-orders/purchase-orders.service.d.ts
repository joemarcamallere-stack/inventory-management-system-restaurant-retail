import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
export declare class PurchaseOrdersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreatePurchaseOrderDto, businessId: string, createdById?: string): Promise<{
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
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            inventoryItemId: string | null;
            unitPrice: number;
            receivedQty: number;
            rejectedQty: number;
            totalPrice: number;
            purchaseOrderId: string;
        })[];
        supplier: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            businessId: string;
            address: string | null;
            phone: string | null;
            category: string | null;
            isActive: boolean;
            contactPerson: string | null;
        } | null;
        createdBy: {
            id: string;
            name: string;
        } | null;
        receivedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PurchaseOrderStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        supplierId: string | null;
        paymentMethod: string | null;
        paymentTerms: string | null;
        orderNumber: string;
        totalAmount: number;
        receivedAt: Date | null;
        receivedById: string | null;
    }>;
    findAll(businessId: string, status?: string, supplierId?: string, page?: number, limit?: number): Promise<PaginatedResult<any>>;
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
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            inventoryItemId: string | null;
            unitPrice: number;
            receivedQty: number;
            rejectedQty: number;
            totalPrice: number;
            purchaseOrderId: string;
        })[];
        supplier: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            businessId: string;
            address: string | null;
            phone: string | null;
            category: string | null;
            isActive: boolean;
            contactPerson: string | null;
        } | null;
        createdBy: {
            id: string;
            name: string;
        } | null;
        receivedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PurchaseOrderStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        supplierId: string | null;
        paymentMethod: string | null;
        paymentTerms: string | null;
        orderNumber: string;
        totalAmount: number;
        receivedAt: Date | null;
        receivedById: string | null;
    }>;
    update(id: string, dto: UpdatePurchaseOrderDto, businessId: string): Promise<{
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
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            inventoryItemId: string | null;
            unitPrice: number;
            receivedQty: number;
            rejectedQty: number;
            totalPrice: number;
            purchaseOrderId: string;
        })[];
        supplier: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            businessId: string;
            address: string | null;
            phone: string | null;
            category: string | null;
            isActive: boolean;
            contactPerson: string | null;
        } | null;
        createdBy: {
            id: string;
            name: string;
        } | null;
        receivedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PurchaseOrderStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        supplierId: string | null;
        paymentMethod: string | null;
        paymentTerms: string | null;
        orderNumber: string;
        totalAmount: number;
        receivedAt: Date | null;
        receivedById: string | null;
    }>;
    submit(id: string, businessId: string): Promise<{
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
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            inventoryItemId: string | null;
            unitPrice: number;
            receivedQty: number;
            rejectedQty: number;
            totalPrice: number;
            purchaseOrderId: string;
        })[];
        supplier: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            businessId: string;
            address: string | null;
            phone: string | null;
            category: string | null;
            isActive: boolean;
            contactPerson: string | null;
        } | null;
        createdBy: {
            id: string;
            name: string;
        } | null;
        receivedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PurchaseOrderStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        supplierId: string | null;
        paymentMethod: string | null;
        paymentTerms: string | null;
        orderNumber: string;
        totalAmount: number;
        receivedAt: Date | null;
        receivedById: string | null;
    }>;
    approve(id: string, businessId: string, role: string): Promise<{
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
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            inventoryItemId: string | null;
            unitPrice: number;
            receivedQty: number;
            rejectedQty: number;
            totalPrice: number;
            purchaseOrderId: string;
        })[];
        supplier: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            businessId: string;
            address: string | null;
            phone: string | null;
            category: string | null;
            isActive: boolean;
            contactPerson: string | null;
        } | null;
        createdBy: {
            id: string;
            name: string;
        } | null;
        receivedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PurchaseOrderStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        supplierId: string | null;
        paymentMethod: string | null;
        paymentTerms: string | null;
        orderNumber: string;
        totalAmount: number;
        receivedAt: Date | null;
        receivedById: string | null;
    }>;
    receive(id: string, dto: ReceivePurchaseOrderDto, businessId: string, receivedById?: string): Promise<{
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
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            inventoryItemId: string | null;
            unitPrice: number;
            receivedQty: number;
            rejectedQty: number;
            totalPrice: number;
            purchaseOrderId: string;
        })[];
        supplier: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            businessId: string;
            address: string | null;
            phone: string | null;
            category: string | null;
            isActive: boolean;
            contactPerson: string | null;
        } | null;
        createdBy: {
            id: string;
            name: string;
        } | null;
        receivedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PurchaseOrderStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        supplierId: string | null;
        paymentMethod: string | null;
        paymentTerms: string | null;
        orderNumber: string;
        totalAmount: number;
        receivedAt: Date | null;
        receivedById: string | null;
    }>;
    cancel(id: string, businessId: string): Promise<{
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
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            inventoryItemId: string | null;
            unitPrice: number;
            receivedQty: number;
            rejectedQty: number;
            totalPrice: number;
            purchaseOrderId: string;
        })[];
        supplier: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            businessId: string;
            address: string | null;
            phone: string | null;
            category: string | null;
            isActive: boolean;
            contactPerson: string | null;
        } | null;
        createdBy: {
            id: string;
            name: string;
        } | null;
        receivedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PurchaseOrderStatus;
        businessId: string;
        notes: string | null;
        createdById: string | null;
        supplierId: string | null;
        paymentMethod: string | null;
        paymentTerms: string | null;
        orderNumber: string;
        totalAmount: number;
        receivedAt: Date | null;
        receivedById: string | null;
    }>;
    private readonly poInclude;
}
