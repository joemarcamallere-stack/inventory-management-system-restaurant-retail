import { PrismaService } from '../prisma/prisma.service';
import { CreateKitchenOrderDto } from './dto/create-kitchen-order.dto';
import { VoidKitchenOrderDto } from './dto/void-kitchen-order.dto';
export declare class KitchenOrdersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    complete(createKitchenOrderDto: CreateKitchenOrderDto, businessId: string, completedById?: string): Promise<({
        recipe: {
            ingredients: ({
                item: {
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
                updatedAt: Date;
                quantity: number;
                unit: string | null;
                recipeId: string;
                itemId: string;
                unitCost: number | null;
                totalCost: number | null;
            })[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            businessId: string;
            category: string;
            servings: number;
            yieldPercentage: number;
            prepTimeMinutes: number | null;
            instructions: string | null;
            targetFoodCost: number | null;
            sellingPrice: number | null;
            isActive: boolean;
            menuItemId: string | null;
        };
        completedBy: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            passwordHash: string;
            role: string;
            status: string;
            businessId: string;
            lastLogin: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.KitchenOrderStatus;
        businessId: string;
        quantity: number;
        recipeId: string;
        notes: string | null;
        receiptNo: string;
        voidReason: string | null;
        voidedAt: Date | null;
        completedById: string | null;
    }) | null>;
    findAll(businessId: string, status?: string): Promise<({
        recipe: {
            ingredients: ({
                item: {
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
                updatedAt: Date;
                quantity: number;
                unit: string | null;
                recipeId: string;
                itemId: string;
                unitCost: number | null;
                totalCost: number | null;
            })[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            businessId: string;
            category: string;
            servings: number;
            yieldPercentage: number;
            prepTimeMinutes: number | null;
            instructions: string | null;
            targetFoodCost: number | null;
            sellingPrice: number | null;
            isActive: boolean;
            menuItemId: string | null;
        };
        completedBy: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            passwordHash: string;
            role: string;
            status: string;
            businessId: string;
            lastLogin: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.KitchenOrderStatus;
        businessId: string;
        quantity: number;
        recipeId: string;
        notes: string | null;
        receiptNo: string;
        voidReason: string | null;
        voidedAt: Date | null;
        completedById: string | null;
    })[]>;
    findOne(id: string, businessId: string): Promise<{
        recipe: {
            ingredients: ({
                item: {
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
                updatedAt: Date;
                quantity: number;
                unit: string | null;
                recipeId: string;
                itemId: string;
                unitCost: number | null;
                totalCost: number | null;
            })[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            businessId: string;
            category: string;
            servings: number;
            yieldPercentage: number;
            prepTimeMinutes: number | null;
            instructions: string | null;
            targetFoodCost: number | null;
            sellingPrice: number | null;
            isActive: boolean;
            menuItemId: string | null;
        };
        completedBy: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            passwordHash: string;
            role: string;
            status: string;
            businessId: string;
            lastLogin: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.KitchenOrderStatus;
        businessId: string;
        quantity: number;
        recipeId: string;
        notes: string | null;
        receiptNo: string;
        voidReason: string | null;
        voidedAt: Date | null;
        completedById: string | null;
    }>;
    void(id: string, voidDto: VoidKitchenOrderDto, businessId: string): Promise<({
        recipe: {
            ingredients: ({
                item: {
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
                updatedAt: Date;
                quantity: number;
                unit: string | null;
                recipeId: string;
                itemId: string;
                unitCost: number | null;
                totalCost: number | null;
            })[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            businessId: string;
            category: string;
            servings: number;
            yieldPercentage: number;
            prepTimeMinutes: number | null;
            instructions: string | null;
            targetFoodCost: number | null;
            sellingPrice: number | null;
            isActive: boolean;
            menuItemId: string | null;
        };
        completedBy: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            passwordHash: string;
            role: string;
            status: string;
            businessId: string;
            lastLogin: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.KitchenOrderStatus;
        businessId: string;
        quantity: number;
        recipeId: string;
        notes: string | null;
        receiptNo: string;
        voidReason: string | null;
        voidedAt: Date | null;
        completedById: string | null;
    }) | null>;
    private readonly kitchenOrderInclude;
}
