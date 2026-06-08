import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
} as any);

async function main() {
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const staffPasswordHash = await bcrypt.hash('staff123', 12);

  const business = await prisma.business.upsert({
    where: { name: 'Ukay + Restaurant Demo' },
    update: {
      modules: ['UKAY', 'RESTAURANT'],
    },
    create: {
      name: 'Ukay + Restaurant Demo',
      modules: ['UKAY', 'RESTAURANT'],
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@ukayukay.com' },
    update: {
      name: 'Admin User',
      role: 'Admin',
      status: 'Active',
      passwordHash: adminPasswordHash,
      businessId: business.id,
    },
    create: {
      name: 'Admin User',
      email: 'admin@ukayukay.com',
      role: 'Admin',
      status: 'Active',
      passwordHash: adminPasswordHash,
      businessId: business.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@ukayukay.com' },
    update: {
      name: 'Staff User',
      role: 'Staff',
      status: 'Active',
      passwordHash: staffPasswordHash,
      businessId: business.id,
    },
    create: {
      name: 'Staff User',
      email: 'staff@ukayukay.com',
      role: 'Staff',
      status: 'Active',
      passwordHash: staffPasswordHash,
      businessId: business.id,
    },
  });

  const mainStore = await prisma.location.upsert({
    where: { businessId_name: { businessId: business.id, name: 'Main Store' } },
    update: {
      address: 'Downtown Branch',
      manager: 'Admin User',
      phone: '+63 900 000 0001',
    },
    create: {
      name: 'Main Store',
      address: 'Downtown Branch',
      manager: 'Admin User',
      phone: '+63 900 000 0001',
      businessId: business.id,
    },
  });

  const warehouse = await prisma.location.upsert({
    where: { businessId_name: { businessId: business.id, name: 'Warehouse' } },
    update: {
      address: 'Storage Facility',
      manager: 'Warehouse Manager',
      phone: '+63 900 000 0002',
    },
    create: {
      name: 'Warehouse',
      address: 'Storage Facility',
      manager: 'Warehouse Manager',
      phone: '+63 900 000 0002',
      businessId: business.id,
    },
  });

  await prisma.location.upsert({
    where: { businessId_name: { businessId: business.id, name: 'Branch 1' } },
    update: {
      address: 'Branch Location',
      manager: 'Branch Manager',
      phone: '+63 900 000 0003',
    },
    create: {
      name: 'Branch 1',
      address: 'Branch Location',
      manager: 'Branch Manager',
      phone: '+63 900 000 0003',
      businessId: business.id,
    },
  });

  const coldStorage = await prisma.location.upsert({
    where: {
      businessId_name: { businessId: business.id, name: 'Cold Storage' },
    },
    update: {
      address: 'Restaurant cold storage',
      manager: 'Kitchen Manager',
      phone: '+63 900 000 0004',
    },
    create: {
      name: 'Cold Storage',
      address: 'Restaurant cold storage',
      manager: 'Kitchen Manager',
      phone: '+63 900 000 0004',
      businessId: business.id,
    },
  });

  const dryStorage = await prisma.location.upsert({
    where: { businessId_name: { businessId: business.id, name: 'Dry Storage' } },
    update: {
      address: 'Restaurant dry storage',
      manager: 'Kitchen Manager',
      phone: '+63 900 000 0005',
    },
    create: {
      name: 'Dry Storage',
      address: 'Restaurant dry storage',
      manager: 'Kitchen Manager',
      phone: '+63 900 000 0005',
      businessId: business.id,
    },
  });

  const kitchen = await prisma.location.upsert({
    where: { businessId_name: { businessId: business.id, name: 'Kitchen' } },
    update: {
      address: 'Restaurant kitchen',
      manager: 'Kitchen Manager',
      phone: '+63 900 000 0006',
    },
    create: {
      name: 'Kitchen',
      address: 'Restaurant kitchen',
      manager: 'Kitchen Manager',
      phone: '+63 900 000 0006',
      businessId: business.id,
    },
  });

  const existingItems = await prisma.inventoryItem.count({
    where: { businessId: business.id },
  });
  if (existingItems === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        {
          name: 'Vintage Band T-Shirt',
          itemType: 'UKAY_ITEM',
          sku: 'UKAY-TEE-001',
          category: 'Tops',
          targetCustomer: 'Unisex',
          subcategory: 'T-Shirts',
          size: 'M',
          condition: 'Good',
          quantity: 8,
          price: 180,
          unit: 'pcs',
          minStock: 1,
          reorderPoint: 3,
          locationId: mainStore.id,
          businessId: business.id,
        },
        {
          name: 'Classic Denim Jeans',
          itemType: 'UKAY_ITEM',
          sku: 'UKAY-JEANS-001',
          category: 'Bottoms',
          targetCustomer: 'Unisex',
          subcategory: 'Jeans',
          size: '30',
          condition: 'Excellent',
          quantity: 5,
          price: 250,
          unit: 'pcs',
          minStock: 1,
          reorderPoint: 3,
          locationId: mainStore.id,
          businessId: business.id,
        },
        {
          name: 'Mixed Clothing Bale',
          itemType: 'UKAY_ITEM',
          sku: 'UKAY-BALE-001',
          category: 'Bales',
          targetCustomer: 'Unisex',
          subcategory: 'Mixed Clothing',
          size: 'Assorted',
          condition: 'Good',
          quantity: 20,
          price: 120,
          unit: 'pcs',
          minStock: 2,
          reorderPoint: 5,
          locationId: warehouse.id,
          businessId: business.id,
        },
      ],
    });
  }

  const romaine = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: business.id, sku: 'REST-ING-001' } },
    update: {
      name: 'Romaine Lettuce',
      itemType: 'INGREDIENT',
      category: 'Vegetables',
      quantity: 15,
      price: 45,
      unit: 'kg',
      minStock: 3,
      reorderPoint: 5,
      expiryDate: new Date('2026-06-10T00:00:00.000Z'),
      storageTemperature: 'Chilled',
      locationId: coldStorage.id,
    },
    create: {
      name: 'Romaine Lettuce',
      itemType: 'INGREDIENT',
      sku: 'REST-ING-001',
      category: 'Vegetables',
      quantity: 15,
      price: 45,
      unit: 'kg',
      minStock: 3,
      reorderPoint: 5,
      expiryDate: new Date('2026-06-10T00:00:00.000Z'),
      storageTemperature: 'Chilled',
      locationId: coldStorage.id,
      businessId: business.id,
    },
  });

  const chicken = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: business.id, sku: 'REST-ING-002' } },
    update: {
      name: 'Chicken Breast',
      itemType: 'INGREDIENT',
      category: 'Meat & Poultry',
      quantity: 20,
      price: 185,
      unit: 'kg',
      minStock: 4,
      reorderPoint: 8,
      expiryDate: new Date('2026-06-09T00:00:00.000Z'),
      storageTemperature: 'Frozen',
      locationId: coldStorage.id,
    },
    create: {
      name: 'Chicken Breast',
      itemType: 'INGREDIENT',
      sku: 'REST-ING-002',
      category: 'Meat & Poultry',
      quantity: 20,
      price: 185,
      unit: 'kg',
      minStock: 4,
      reorderPoint: 8,
      expiryDate: new Date('2026-06-09T00:00:00.000Z'),
      storageTemperature: 'Frozen',
      locationId: coldStorage.id,
      businessId: business.id,
    },
  });

  const oliveOil = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: business.id, sku: 'REST-ING-003' } },
    update: {
      name: 'Olive Oil',
      itemType: 'INGREDIENT',
      category: 'Condiments',
      quantity: 10,
      price: 320,
      unit: 'L',
      minStock: 2,
      reorderPoint: 3,
      storageTemperature: 'Dry storage',
      locationId: dryStorage.id,
    },
    create: {
      name: 'Olive Oil',
      itemType: 'INGREDIENT',
      sku: 'REST-ING-003',
      category: 'Condiments',
      quantity: 10,
      price: 320,
      unit: 'L',
      minStock: 2,
      reorderPoint: 3,
      storageTemperature: 'Dry storage',
      locationId: dryStorage.id,
      businessId: business.id,
    },
  });

  const caesarMenuItem = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: business.id, sku: 'REST-MENU-001' } },
    update: {
      name: 'Chicken Caesar Salad',
      itemType: 'MENU_ITEM',
      category: 'Salads',
      quantity: 0,
      price: 220,
      unit: 'serving',
      locationId: kitchen.id,
    },
    create: {
      name: 'Chicken Caesar Salad',
      itemType: 'MENU_ITEM',
      sku: 'REST-MENU-001',
      category: 'Salads',
      quantity: 0,
      price: 220,
      unit: 'serving',
      locationId: kitchen.id,
      businessId: business.id,
    },
  });

  const caesarRecipe = await prisma.recipe.upsert({
    where: {
      businessId_name: {
        businessId: business.id,
        name: 'Chicken Caesar Salad',
      },
    },
    update: {
      category: 'Salads',
      servings: 4,
      yieldPercentage: 100,
      prepTimeMinutes: 15,
      sellingPrice: 220,
      targetFoodCost: 35,
      isActive: true,
      menuItemId: caesarMenuItem.id,
      instructions: 'Prepare greens, grill chicken, toss, and plate.',
    },
    create: {
      name: 'Chicken Caesar Salad',
      category: 'Salads',
      servings: 4,
      yieldPercentage: 100,
      prepTimeMinutes: 15,
      sellingPrice: 220,
      targetFoodCost: 35,
      isActive: true,
      menuItemId: caesarMenuItem.id,
      instructions: 'Prepare greens, grill chicken, toss, and plate.',
      businessId: business.id,
    },
  });

  await prisma.recipeIngredient.deleteMany({
    where: { recipeId: caesarRecipe.id },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipeId: caesarRecipe.id,
        itemId: romaine.id,
        quantity: 0.3,
        unit: 'kg',
        unitCost: 45,
        totalCost: 13.5,
      },
      {
        recipeId: caesarRecipe.id,
        itemId: chicken.id,
        quantity: 0.4,
        unit: 'kg',
        unitCost: 185,
        totalCost: 74,
      },
      {
        recipeId: caesarRecipe.id,
        itemId: oliveOil.id,
        quantity: 0.05,
        unit: 'L',
        unitCost: 320,
        totalCost: 16,
      },
    ],
  });

  // --- Ukay-only business ---
  const ukayBusiness = await prisma.business.upsert({
    where: { name: 'Ukay-Only Demo' },
    update: { modules: ['UKAY'] },
    create: { name: 'Ukay-Only Demo', modules: ['UKAY'] },
  });

  await prisma.user.upsert({
    where: { email: 'admin@ukay.com' },
    update: {
      name: 'Ukay Admin',
      role: 'Admin',
      status: 'Active',
      passwordHash: adminPasswordHash,
      businessId: ukayBusiness.id,
    },
    create: {
      name: 'Ukay Admin',
      email: 'admin@ukay.com',
      role: 'Admin',
      status: 'Active',
      passwordHash: adminPasswordHash,
      businessId: ukayBusiness.id,
    },
  });

  await prisma.location.upsert({
    where: { businessId_name: { businessId: ukayBusiness.id, name: 'Main Store' } },
    update: { address: 'Downtown', manager: 'Ukay Admin', phone: '+63 900 100 0001' },
    create: {
      name: 'Main Store',
      address: 'Downtown',
      manager: 'Ukay Admin',
      phone: '+63 900 100 0001',
      businessId: ukayBusiness.id,
    },
  });

  // --- Restaurant-only business ---
  const restaurantBusiness = await prisma.business.upsert({
    where: { name: 'Restaurant-Only Demo' },
    update: { modules: ['RESTAURANT'] },
    create: { name: 'Restaurant-Only Demo', modules: ['RESTAURANT'] },
  });

  await prisma.user.upsert({
    where: { email: 'admin@restaurant.com' },
    update: {
      name: 'Restaurant Admin',
      role: 'Admin',
      status: 'Active',
      passwordHash: adminPasswordHash,
      businessId: restaurantBusiness.id,
    },
    create: {
      name: 'Restaurant Admin',
      email: 'admin@restaurant.com',
      role: 'Admin',
      status: 'Active',
      passwordHash: adminPasswordHash,
      businessId: restaurantBusiness.id,
    },
  });

  const restKitchen = await prisma.location.upsert({
    where: { businessId_name: { businessId: restaurantBusiness.id, name: 'Kitchen' } },
    update: { address: 'Main Kitchen', manager: 'Restaurant Admin', phone: '+63 900 200 0001' },
    create: {
      name: 'Kitchen',
      address: 'Main Kitchen',
      manager: 'Restaurant Admin',
      phone: '+63 900 200 0001',
      businessId: restaurantBusiness.id,
    },
  });

  await prisma.location.upsert({
    where: { businessId_name: { businessId: restaurantBusiness.id, name: 'Cold Storage' } },
    update: { address: 'Cold Storage Room', manager: 'Restaurant Admin', phone: '+63 900 200 0002' },
    create: {
      name: 'Cold Storage',
      address: 'Cold Storage Room',
      manager: 'Restaurant Admin',
      phone: '+63 900 200 0002',
      businessId: restaurantBusiness.id,
    },
  });

  await prisma.location.upsert({
    where: { businessId_name: { businessId: restaurantBusiness.id, name: 'Dry Storage' } },
    update: { address: 'Dry Storage Room', manager: 'Restaurant Admin', phone: '+63 900 200 0003' },
    create: {
      name: 'Dry Storage',
      address: 'Dry Storage Room',
      manager: 'Restaurant Admin',
      phone: '+63 900 200 0003',
      businessId: restaurantBusiness.id,
    },
  });

  const restChicken = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: restaurantBusiness.id, sku: 'REST2-ING-001' } },
    update: { name: 'Chicken Breast', itemType: 'INGREDIENT', category: 'Meat & Poultry', quantity: 15, price: 185, unit: 'kg', minStock: 3, reorderPoint: 5, storageTemperature: 'Frozen', locationId: restKitchen.id },
    create: { name: 'Chicken Breast', itemType: 'INGREDIENT', sku: 'REST2-ING-001', category: 'Meat & Poultry', quantity: 15, price: 185, unit: 'kg', minStock: 3, reorderPoint: 5, storageTemperature: 'Frozen', locationId: restKitchen.id, businessId: restaurantBusiness.id },
  });

  const restRice = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: restaurantBusiness.id, sku: 'REST2-ING-002' } },
    update: { name: 'White Rice', itemType: 'INGREDIENT', category: 'Grains', quantity: 50, price: 48, unit: 'kg', minStock: 10, reorderPoint: 20, storageTemperature: 'Dry storage', locationId: restKitchen.id },
    create: { name: 'White Rice', itemType: 'INGREDIENT', sku: 'REST2-ING-002', category: 'Grains', quantity: 50, price: 48, unit: 'kg', minStock: 10, reorderPoint: 20, storageTemperature: 'Dry storage', locationId: restKitchen.id, businessId: restaurantBusiness.id },
  });

  const chickenRiceMenu = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: restaurantBusiness.id, sku: 'REST2-MENU-001' } },
    update: { name: 'Chicken Rice Bowl', itemType: 'MENU_ITEM', category: 'Main Course', quantity: 0, price: 150, unit: 'serving', locationId: restKitchen.id },
    create: { name: 'Chicken Rice Bowl', itemType: 'MENU_ITEM', sku: 'REST2-MENU-001', category: 'Main Course', quantity: 0, price: 150, unit: 'serving', locationId: restKitchen.id, businessId: restaurantBusiness.id },
  });

  const chickenRiceRecipe = await prisma.recipe.upsert({
    where: { businessId_name: { businessId: restaurantBusiness.id, name: 'Chicken Rice Bowl' } },
    update: { category: 'Main Course', servings: 2, yieldPercentage: 100, prepTimeMinutes: 20, sellingPrice: 150, targetFoodCost: 40, isActive: true, menuItemId: chickenRiceMenu.id, instructions: 'Cook rice, grill chicken, plate together.' },
    create: { name: 'Chicken Rice Bowl', category: 'Main Course', servings: 2, yieldPercentage: 100, prepTimeMinutes: 20, sellingPrice: 150, targetFoodCost: 40, isActive: true, menuItemId: chickenRiceMenu.id, instructions: 'Cook rice, grill chicken, plate together.', businessId: restaurantBusiness.id },
  });

  await prisma.recipeIngredient.deleteMany({ where: { recipeId: chickenRiceRecipe.id } });
  await prisma.recipeIngredient.createMany({
    data: [
      { recipeId: chickenRiceRecipe.id, itemId: restChicken.id, quantity: 0.3, unit: 'kg', unitCost: 185, totalCost: 55.5 },
      { recipeId: chickenRiceRecipe.id, itemId: restRice.id, quantity: 0.2, unit: 'kg', unitCost: 48, totalCost: 9.6 },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
