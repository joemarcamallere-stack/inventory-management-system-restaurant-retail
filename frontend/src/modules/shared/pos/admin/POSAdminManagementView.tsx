import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Banknote, Building2, Package, Pencil, Plus, Save, Settings2, Smartphone, Store, Tags, Trash2, Upload, UtensilsCrossed, Wallet } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createIngredientAlternative,
  createCategory,
  createInventoryItem,
  createRecipe,
  deleteIngredientAlternative,
  deleteCategory,
  deleteInventoryItem,
  updateIngredientAlternative,
  getCategories,
  updateRecipe,
  updateCategory,
  updateInventoryItem,
} from '../../../../app/api/client';
import type { ApiCategory, ApiIngredientAlternative, ApiInventoryItem, BusinessModule } from '../../../../app/api/domainTypes';
import {
  domainQueryKeys,
  useBusinessSettingsQuery,
  useDomainMutation,
  useIngredientAlternativesQuery,
  useInventoryQuery,
  useLocationsQuery,
  usePOSSettingsQuery,
  useRecipesQuery,
  useUpsertBusinessSettingMutation,
  useUpsertPOSSettingMutation,
} from '../../../lib/domainQueries';
import {
  BUSINESS_PROFILE_KEY,
  POS_PAYMENTS_KEY,
  POS_DISCOUNTS_KEY,
  POS_FEATURES_KEY,
  POS_PRICING_KEY,
  defaultBusinessProfile,
  defaultPOSDiscounts,
  defaultPOSFeatures,
  defaultPOSPayments,
  defaultPOSPricing,
  getBusinessProfile,
  getPOSDiscounts,
  getPOSFeatures,
  getPOSPayments,
  getPOSPricing,
  type BusinessProfileSetting,
  type POSDiscountSetting,
  type POSFeatureSetting,
  type POSPaymentSetting,
  type POSPricingSetting,
} from '../settings/posSettings';
import { formatMoney } from '../../money';
import bukolabsRestaurantLogoOnWhite from '../../../../imports/bukolabs-res1.png';
import bukolabsRetailLogoOnWhite from '../../../../imports/bukolabs-ret1.png';

type PageKind =
  | 'store-information'
  | 'store-settings'
  | 'categories'
  | 'products'
  | 'ingredients';

type Props = {
  module: BusinessModule;
  page: PageKind;
};

type InventoryForm = {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  quantity: string;
  price: string;
  unit: string;
  minStock: string;
  costPrice: string;
  available: boolean;
};

type CategoryForm = {
  name: string;
  description: string;
};

const pageCopy: Record<PageKind, { title: string; subtitle: string; icon: typeof Store }> = {
  'store-information': {
    title: 'Store Information',
    subtitle: '',
    icon: Store,
  },
  'store-settings': {
    title: 'Store Settings',
    subtitle: 'Manage payment, tax, and service charge settings',
    icon: Settings2,
  },
  categories: {
    title: 'Categories',
    subtitle: 'Manage categories for the current restaurant store.',
    icon: Tags,
  },
  products: {
    title: 'Products',
    subtitle: 'Add products for POS testing until the inventory API is integrated.',
    icon: Package,
  },
  ingredients: {
    title: 'Ingredients',
    subtitle: 'Create restaurant ingredient inventory before assigning ingredients to products.',
    icon: UtensilsCrossed,
  },
};

const blankInventoryForm: InventoryForm = {
  name: '',
  category: '',
  description: '',
  imageUrl: '',
  quantity: '0',
  price: '0',
  unit: 'pcs',
  minStock: '0',
  costPrice: '0',
  available: true,
};

const blankCategoryForm: CategoryForm = {
  name: '',
  description: '',
};

const paymentOptionCards = [
  { name: 'Cash', description: 'Physical cash payments.', icon: Banknote },
  { name: 'GCash', description: 'GCash wallet payments.', icon: Smartphone },
  { name: 'Maya', description: 'Maya wallet payments.', icon: Wallet },
  { name: 'Bank Transfer', description: 'Direct bank transfer payments.', icon: Building2 },
];

export default function POSAdminManagementView({ module, page }: Props) {
  const queryClient = useQueryClient();
  const { data: businessSettings = [] } = useBusinessSettingsQuery();
  const { data: posSettings = [] } = usePOSSettingsQuery({ module });
  const { data: locations = [] } = useLocationsQuery();
  const itemType = page === 'ingredients' ? 'INGREDIENT' : page === 'products' ? 'MENU_ITEM' : undefined;
  const { data: inventory = [], isLoading: loadingInventory } = useInventoryQuery(
    itemType ? { itemType } : undefined,
      { enabled: page === 'categories' || page === 'products' || page === 'ingredients' },
  );
  const { data: ingredientInventory = [] } = useInventoryQuery(
    { itemType: 'INGREDIENT' },
    { enabled: page === 'products' },
  );
  const { data: recipes = [] } = useRecipesQuery(undefined, { enabled: page === 'products' });
  const { data: ingredientAlternatives = [], isLoading: loadingIngredientAlternatives } = useIngredientAlternativesQuery({
    enabled: page === 'ingredients',
  });
  const categoriesQueryKey = ['pos-admin-categories', module] as const;
  const { data: categoryRecords = [], isLoading: loadingCategories } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => getCategories(module),
    enabled: page === 'categories' || page === 'products',
  });
  const createCategoryMutation = useDomainMutation(createCategory, [domainQueryKeys.inventory]);
  const createInventoryMutation = useDomainMutation(createInventoryItem, [domainQueryKeys.inventory]);
  const createRecipeMutation = useDomainMutation(createRecipe, [domainQueryKeys.recipes, domainQueryKeys.inventory]);
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateCategory(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
  });
  const updateInventoryMutation = useDomainMutation(
    ({ id, data }: { id: string; data: unknown }) => updateInventoryItem(id, data),
    [domainQueryKeys.inventory],
  );
  const updateRecipeMutation = useDomainMutation(
    ({ id, data }: { id: string; data: unknown }) => updateRecipe(id, data),
    [domainQueryKeys.recipes, domainQueryKeys.inventory],
  );
  const deleteInventoryMutation = useDomainMutation((id: string) => deleteInventoryItem(id), [domainQueryKeys.inventory]);
  const createIngredientAlternativeMutation = useDomainMutation(createIngredientAlternative, [domainQueryKeys.ingredientAlternatives]);
  const updateIngredientAlternativeMutation = useDomainMutation(
    ({ id, data }: { id: string; data: unknown }) => updateIngredientAlternative(id, data),
    [domainQueryKeys.ingredientAlternatives],
  );
  const deleteIngredientAlternativeMutation = useDomainMutation((id: string) => deleteIngredientAlternative(id), [domainQueryKeys.ingredientAlternatives]);
  const upsertBusinessSetting = useUpsertBusinessSettingMutation();
  const upsertPOSSetting = useUpsertPOSSettingMutation();

  const loadedProfile = useMemo(() => getBusinessProfile(businessSettings), [businessSettings]);
  const loadedPricing = useMemo(() => getPOSPricing(posSettings), [posSettings]);
  const loadedPayments = useMemo(() => getPOSPayments(posSettings), [posSettings]);
  const loadedFeatures = useMemo(() => getPOSFeatures(posSettings), [posSettings]);
  const loadedDiscounts = useMemo(() => getPOSDiscounts(posSettings), [posSettings]);
  const [profile, setProfile] = useState<BusinessProfileSetting>(defaultBusinessProfile);
  const [pricing, setPricing] = useState<POSPricingSetting>(defaultPOSPricing);
  const [payments, setPayments] = useState<POSPaymentSetting>(defaultPOSPayments);
  const [features, setFeatures] = useState<POSFeatureSetting>(defaultPOSFeatures);
  const [discountSettings, setDiscountSettings] = useState<POSDiscountSetting>(defaultPOSDiscounts);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(blankCategoryForm);
  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ApiCategory | null>(null);
  const [inventoryForm, setInventoryForm] = useState<InventoryForm>(blankInventoryForm);
  const [editingInventory, setEditingInventory] = useState<ApiInventoryItem | null>(null);
  const [deletingInventory, setDeletingInventory] = useState<ApiInventoryItem | null>(null);
  const [productIngredients, setProductIngredients] = useState<Array<{ ingredientId: string; quantity: string; required: boolean; removable: boolean }>>([]);
  const [ingredientAlternative, setIngredientAlternative] = useState({ originalId: '', alternativeId: '', extraPrice: '0', available: true });
  const [editingIngredientAlternative, setEditingIngredientAlternative] = useState<ApiIngredientAlternative | null>(null);
  const [deletingIngredientAlternative, setDeletingIngredientAlternative] = useState<ApiIngredientAlternative | null>(null);
  const [discountForm, setDiscountForm] = useState({ name: '', percentage: '' });
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);

  useEffect(() => setProfile(loadedProfile), [loadedProfile]);
  useEffect(() => setPricing(loadedPricing), [loadedPricing]);
  useEffect(() => setPayments(loadedPayments), [loadedPayments]);
  useEffect(() => setFeatures(loadedFeatures), [loadedFeatures]);
  useEffect(() => setDiscountSettings(loadedDiscounts), [loadedDiscounts]);

  const copy = pageCopy[page];
  const Icon = copy.icon;
  const defaultWhiteLogo = module === 'RETAIL' ? bukolabsRetailLogoOnWhite : bukolabsRestaurantLogoOnWhite;
  const previewLogo = profile.logo || defaultWhiteLogo;

  const saveProfile = async () => {
    try {
      await upsertBusinessSetting.mutateAsync({ key: BUSINESS_PROFILE_KEY, value: profile });
      toast.success('Store information saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save store information');
    }
  };

  const saveSettings = async () => {
    try {
      await Promise.all([
        upsertPOSSetting.mutateAsync({ module, key: POS_PRICING_KEY, value: pricing }),
        upsertPOSSetting.mutateAsync({ module, key: POS_PAYMENTS_KEY, value: payments }),
        upsertPOSSetting.mutateAsync({ module, key: POS_FEATURES_KEY, value: features }),
        upsertPOSSetting.mutateAsync({ module, key: POS_DISCOUNTS_KEY, value: discountSettings }),
      ]);
      toast.success('Store settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save store settings');
    }
  };

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      const payload = {
        name: categoryForm.name.trim(),
        module,
        description: categoryForm.description.trim() || undefined,
      };
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data: payload });
      } else {
        await createCategoryMutation.mutateAsync(payload);
        await queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      }
      resetCategoryForm();
      toast.success(editingCategory ? 'Category saved' : 'Category created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
    }
  };

  const submitInventory = async (event: FormEvent) => {
    event.preventDefault();
    const isIngredient = page === 'ingredients';
    if (!inventoryForm.name.trim() || (!isIngredient && !inventoryForm.category.trim())) {
      toast.error(isIngredient ? 'Name is required' : 'Name and category are required');
      return;
    }
    const locationId = editingInventory?.locationId ?? locations[0]?.id;
    if (!locationId) {
      toast.error('Create a location before adding POS items');
      return;
    }
    try {
      const imageUrl = /^https?:\/\//i.test(inventoryForm.imageUrl.trim())
        ? inventoryForm.imageUrl.trim()
        : undefined;
      const payload = {
        name: inventoryForm.name.trim(),
        itemType: isIngredient ? 'INGREDIENT' : 'MENU_ITEM',
        category: isIngredient ? 'Ingredients' : inventoryForm.category.trim(),
        subcategory: 'General',
        quantity: Number(inventoryForm.quantity) || 0,
        price: isIngredient ? 0 : Number(inventoryForm.price) || 0,
        costPrice: isIngredient ? Number(inventoryForm.costPrice) || 0 : undefined,
        minStock: Number(inventoryForm.minStock) || 0,
        unit: isIngredient ? inventoryForm.unit.trim() || 'pcs' : undefined,
        imageUrl,
        locationId,
      };
      let savedItem: ApiInventoryItem;
      if (editingInventory) {
        savedItem = await updateInventoryMutation.mutateAsync({ id: editingInventory.id, data: payload });
      } else {
        savedItem = await createInventoryMutation.mutateAsync(payload);
      }
      if (!isIngredient) {
        await saveProductRecipe(savedItem);
      }
      resetInventoryForm();
      toast.success(editingInventory ? `${isIngredient ? 'Ingredient' : 'Product'} saved` : `${isIngredient ? 'Ingredient' : 'Product'} created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save item');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm(blankCategoryForm);
    setEditingCategory(null);
  };

  const editCategory = (category: ApiCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description ?? '',
    });
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategoryMutation.mutateAsync(deletingCategory.id);
      setDeletingCategory(null);
      toast.success('Category deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  const resetInventoryForm = () => {
    setInventoryForm(blankInventoryForm);
    setEditingInventory(null);
    setProductIngredients([]);
  };

  const editInventory = (item: ApiInventoryItem) => {
    const linkedRecipe = recipes.find((recipe) => recipe.menuItemId === item.id);
    setEditingInventory(item);
    setInventoryForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity ?? 0),
      price: String(item.price ?? 0),
      description: '',
      imageUrl: item.imageUrl ?? '',
      unit: item.unit ?? 'pcs',
      minStock: String(item.minStock ?? item.reorderPoint ?? 0),
      costPrice: String(item.costPrice ?? 0),
      available: item.quantity > 0,
    });
    setProductIngredients(
      linkedRecipe?.ingredients.map((ingredient) => {
        const modifier = Array.isArray((linkedRecipe as { modifiers?: unknown }).modifiers)
          ? ((linkedRecipe as { modifiers?: Array<{ itemId?: string; type?: string }> }).modifiers ?? []).some((itemModifier) => itemModifier.itemId === ingredient.itemId && itemModifier.type === 'remove')
          : false;
        return {
          ingredientId: ingredient.itemId,
          quantity: String(ingredient.quantity),
          required: true,
          removable: modifier,
        };
      }) ?? [],
    );
  };

  const confirmDeleteInventory = async () => {
    if (!deletingInventory) return;
    try {
      await deleteInventoryMutation.mutateAsync(deletingInventory.id);
      setDeletingInventory(null);
      toast.success('Record deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete record');
    }
  };

  const saveProductRecipe = async (menuItem: ApiInventoryItem) => {
    const ingredientMap = new Map<string, { ingredientId: string; quantity: string; required: boolean; removable: boolean }>();
    productIngredients.forEach((row) => {
      if (row.ingredientId && Number(row.quantity) > 0) {
        ingredientMap.set(row.ingredientId, row);
      }
    });
    const validIngredients = Array.from(ingredientMap.values());
    const existingRecipe = recipes.find((recipe) => recipe.menuItemId === menuItem.id);
    if (validIngredients.length === 0) {
      return;
    }

    const ingredientById = new Map(ingredientInventory.map((ingredient) => [ingredient.id, ingredient]));
    const recipePayload = {
      name: inventoryForm.name.trim(),
      category: inventoryForm.category.trim() || 'General',
      servings: 1,
      yieldPercentage: 100,
      sellingPrice: Number(inventoryForm.price) || 0,
      isActive: inventoryForm.available,
      imageUrl: /^https?:\/\//i.test(inventoryForm.imageUrl.trim()) ? inventoryForm.imageUrl.trim() : undefined,
      menuItemId: menuItem.id,
      ingredients: validIngredients.map((row) => {
        const ingredient = ingredientById.get(row.ingredientId);
        return {
          itemId: row.ingredientId,
          quantity: Number(row.quantity) || 0,
          unit: ingredient?.unit || undefined,
          unitCost: ingredient?.costPrice ?? ingredient?.price ?? undefined,
        };
      }),
      modifiers: validIngredients
        .filter((row) => row.removable)
        .map((row) => {
          const ingredient = ingredientById.get(row.ingredientId);
          return {
            id: `remove-${row.ingredientId}`,
            name: `Remove ${ingredient?.name ?? 'ingredient'}`,
            type: 'remove',
            itemId: row.ingredientId,
            itemName: ingredient?.name,
          };
        }),
    };

    if (existingRecipe) {
      await updateRecipeMutation.mutateAsync({ id: existingRecipe.id, data: recipePayload });
    } else {
      await createRecipeMutation.mutateAsync(recipePayload);
    }
  };

  const productCanMake = (item: ApiInventoryItem) => {
    const linkedRecipe = recipes.find((recipe) => recipe.menuItemId === item.id);
    if (!linkedRecipe || linkedRecipe.ingredients.length === 0) {
      return 0;
    }
    return Math.max(
      0,
      Math.min(
        ...linkedRecipe.ingredients.map((ingredient) => {
          const available = Number(ingredient.item?.quantity ?? 0);
          const required = Number(ingredient.quantity) || 1;
          return Math.floor(available / required);
        }),
      ),
    );
  };

  const submitIngredientAlternative = async (event: FormEvent) => {
    event.preventDefault();
    if (!ingredientAlternative.originalId || !ingredientAlternative.alternativeId) {
      toast.error('Original and alternative ingredients are required');
      return;
    }
    if (ingredientAlternative.originalId === ingredientAlternative.alternativeId) {
      toast.error('Choose two different ingredients');
      return;
    }

    const payload = {
      parentIngredientId: ingredientAlternative.originalId,
      alternativeIngredientId: ingredientAlternative.alternativeId,
      additionalPrice: Number(ingredientAlternative.extraPrice) || 0,
      isAvailable: ingredientAlternative.available,
    };

    try {
      if (editingIngredientAlternative) {
        await updateIngredientAlternativeMutation.mutateAsync({ id: editingIngredientAlternative.id, data: payload });
      } else {
        await createIngredientAlternativeMutation.mutateAsync(payload);
      }
      resetIngredientAlternativeForm();
      toast.success(editingIngredientAlternative ? 'Ingredient alternative saved' : 'Ingredient alternative added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save ingredient alternative');
    }
  };

  const resetIngredientAlternativeForm = () => {
    setIngredientAlternative({ originalId: '', alternativeId: '', extraPrice: '0', available: true });
    setEditingIngredientAlternative(null);
  };

  const editIngredientAlternative = (alternative: ApiIngredientAlternative) => {
    setEditingIngredientAlternative(alternative);
    setIngredientAlternative({
      originalId: alternative.parentIngredientId,
      alternativeId: alternative.alternativeIngredientId,
      extraPrice: String(alternative.additionalPrice ?? 0),
      available: alternative.isAvailable,
    });
  };

  const confirmDeleteIngredientAlternative = async () => {
    if (!deletingIngredientAlternative) return;
    try {
      await deleteIngredientAlternativeMutation.mutateAsync(deletingIngredientAlternative.id);
      setDeletingIngredientAlternative(null);
      toast.success('Ingredient alternative deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete ingredient alternative');
    }
  };

  const submitDiscount = () => {
    if (!discountForm.name.trim()) {
      toast.error('Discount name is required');
      return;
    }
    const percentage = Number(discountForm.percentage);
    if (!Number.isFinite(percentage) || percentage < 0) {
      toast.error('Discount percentage must be zero or greater');
      return;
    }
    setDiscountSettings((current) => {
      const discount = {
        id: editingDiscountId ?? `${Date.now()}`,
        name: discountForm.name.trim(),
        percentage,
      };
      return {
        discounts: editingDiscountId
          ? current.discounts.map((item) => (item.id === editingDiscountId ? discount : item))
          : [...current.discounts, discount],
      };
    });
    setDiscountForm({ name: '', percentage: '' });
    setEditingDiscountId(null);
  };

  const handleInventoryImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Product image must be 2MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setInventoryForm((current) => ({ ...current, imageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const editDiscount = (discount: POSDiscountSetting['discounts'][number]) => {
    setEditingDiscountId(discount.id);
    setDiscountForm({ name: discount.name, percentage: String(discount.percentage) });
  };

  const togglePaymentMethod = (method: string) => {
    setPayments((current) => {
      const methods = current.methods.includes(method)
        ? current.methods.filter((item) => item !== method)
        : [...current.methods, method];
      return { methods: methods.length > 0 ? methods : ['Cash'] };
    });
  };

  if (page === 'store-information') {
    return (
      <AdminPage title={copy.title} subtitle={copy.subtitle} icon={Icon} actionLabel="Save Changes" actionIcon={Save} onAction={saveProfile} hideHeading>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-[20px] font-semibold text-[#008967]">Business Information</h2>
            <div className="space-y-5">
              <EditableField label="Business Name" value={profile.displayName} onChange={(value) => setProfile({ ...profile, displayName: value })} required />
              <TextareaField label="Business Description" value={profile.businessDescription} onChange={(value) => setProfile({ ...profile, businessDescription: value })} />
              <div>
                <span className="mb-2 block text-[13px] font-medium text-[#9a9fc0]">Logo</span>
                <div className="flex items-center gap-4">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafb]">
                    <img src={previewLogo} alt={profile.displayName || 'Store logo'} className="size-full object-contain" />
                  </div>
                  <div className="space-y-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#e2e8f0] px-4 py-2 text-[14px] font-medium text-[#111827] hover:bg-[#f8fafb]">
                      Click to upload logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error('Logo must be 2MB or smaller.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => setProfile((current) => ({ ...current, logo: String(reader.result) }));
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {profile.logo && (
                      <button type="button" onClick={() => setProfile({ ...profile, logo: '' })} className="block text-[13px] font-medium text-red-600">
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <EditableField label="Contact Number" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
                <EditableField label="Email" value={profile.email} onChange={(value) => setProfile({ ...profile, email: value })} />
              </div>
              <TextareaField label="Address" value={profile.address} onChange={(value) => setProfile({ ...profile, address: value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <EditableField label="Operating Hours" value={profile.operatingHours} onChange={(value) => setProfile({ ...profile, operatingHours: value })} />
                <EditableField label="Currency" value={profile.currency} onChange={(value) => setProfile({ ...profile, currency: value })} />
              </div>
              <h3 className="pt-2 text-[18px] font-semibold text-[#008967]">Receipt Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <EditableField label="Thank You Message" value={profile.receiptHeader} onChange={(value) => setProfile({ ...profile, receiptHeader: value })} />
                <EditableField label="Footer Message" value={profile.receiptFooter} onChange={(value) => setProfile({ ...profile, receiptFooter: value })} />
              </div>
              <h3 className="pt-2 text-[18px] font-semibold text-[#008967]">Store Settings</h3>
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-[#9a9fc0]">Theme Color</span>
                <div className="flex gap-3">
                  <input type="color" value={profile.themeColor} onChange={(event) => setProfile({ ...profile, themeColor: event.target.value })} className="h-11 w-16 rounded-lg border border-[#e2e8f0] bg-white p-1" />
                  <input value={profile.themeColor} onChange={(event) => setProfile({ ...profile, themeColor: event.target.value })} className="h-11 flex-1 rounded-[8px] border border-[#e2e8f0] bg-white px-4 text-[14px] text-[#111827] outline-none focus:border-[#008967]" />
                </div>
              </label>
            </div>
          </section>
          <aside className="space-y-6">
            <section className="rounded-lg border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-[20px] font-semibold text-[#008967]">Receipt Preview</h2>
              <p className="mb-4 text-[13px] text-[#9a9fc0]">This is how your receipt header and footer will look.</p>
              <div className="rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafb] p-5 text-center text-[13px] text-[#111827]">
                <img src={previewLogo} alt="" className="mx-auto mb-3 size-14 rounded object-contain" />
                <div className="font-semibold">{profile.displayName || 'Business Name'}</div>
                <div className="mt-1 text-[#64748b]">{profile.address || 'Business address'}</div>
                <div className="mt-1 text-[#64748b]">{profile.phone || 'Contact number'}</div>
                <div className="my-4 border-t border-dashed border-[#cbd5e1]" />
                <div>{profile.receiptHeader || 'Thank you for your purchase.'}</div>
                <div className="mt-5 text-[#64748b]">{profile.receiptFooter || 'Footer message'}</div>
              </div>
            </section>
            <section className="rounded-lg border border-[#e2e8f0] bg-white p-6 text-[14px] text-[#64748b] shadow-sm">
              <h2 className="mb-2 text-[18px] font-semibold text-[#008967]">Important</h2>
              <p>Changes here control the store identity used by POS screens and printed receipts.</p>
            </section>
          </aside>
        </div>
      </AdminPage>
    );
  }

  if (page === 'store-settings') {
    return (
      <AdminPage title={copy.title} subtitle={copy.subtitle} icon={Icon} actionLabel="Save Settings" actionIcon={Save} onAction={saveSettings}>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]">
          <section className="rounded-lg border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-[20px] font-semibold text-[#111827]">Restaurant POS Settings</h2>
            <p className="mb-5 text-[14px] text-[#9a9fc0]">These settings are saved per store and applied to staff POS pages.</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <ToggleLine label="Customer Recommendations" description="Show recommendation prompts during ordering" checked={features.customerRecommendations} onChange={(checked) => setFeatures({ ...features, customerRecommendations: checked })} />
              <ToggleLine label="Table Management" description="Enable table assignment for dine-in orders" checked={features.tableManagement} onChange={(checked) => setFeatures({ ...features, tableManagement: checked })} />
              <ToggleLine label="Refund Processing" description="Allow refund actions on paid orders" checked={features.refundProcessing} onChange={(checked) => setFeatures({ ...features, refundProcessing: checked })} />
              <ToggleLine label="Void Transactions" description="Allow void actions on unpaid orders" checked={features.voidTransactions} onChange={(checked) => setFeatures({ ...features, voidTransactions: checked })} />
              <ToggleLine label="Service Charge" description="Apply configured service charge to orders" checked={pricing.serviceChargeEnabled} onChange={(checked) => setPricing({ ...pricing, serviceChargeEnabled: checked })} />
              {pricing.serviceChargeEnabled && <NumberField label="Service Charge Rate (%)" value={pricing.serviceChargeRate} onChange={(value) => setPricing({ ...pricing, serviceChargeRate: value })} />}
              <ToggleLine label="VAT" description="Apply configured tax/VAT to orders" checked={pricing.taxEnabled} onChange={(checked) => setPricing({ ...pricing, taxEnabled: checked })} />
              {pricing.taxEnabled && <NumberField label="Tax Rate (%)" value={pricing.taxRate} onChange={(value) => setPricing({ ...pricing, taxRate: value })} />}
              <ToggleLine label="Discounts" description="Enable preset discount choices in payment flow" checked={features.discounts} onChange={(checked) => setFeatures({ ...features, discounts: checked })} />
            </div>
            <div className="mt-4 rounded-lg border border-[#e2e8f0] p-4">
              <h3 className="font-medium text-[#111827]">Payment Methods</h3>
              <p className="mt-1 text-[14px] text-[#9a9fc0]">Choose which options appear in restaurant and retail POS payment screens.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {paymentOptionCards.map((method) => {
                  const MethodIcon = method.icon;
                  const checked = payments.methods.includes(method.name) || (method.name === 'Maya' && payments.methods.includes('PayMaya'));
                  return (
                    <button
                      key={method.name}
                      type="button"
                      onClick={() => togglePaymentMethod(method.name)}
                      className={`flex min-h-[92px] items-start gap-3 rounded-lg border p-3 text-left transition ${checked ? 'border-[#008967] bg-[#008967]/5 text-[#008967]' : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafb]'}`}
                    >
                      <MethodIcon className="size-5" />
                      <span>
                        <span className="block text-[14px] font-semibold">{method.name}</span>
                        <span className="mt-1 block text-[12px] text-[#64748b]">{method.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
          {features.discounts && (
            <section className="rounded-lg border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-[20px] font-semibold text-[#111827]">Discount Settings</h2>
              <p className="mb-5 text-[14px] text-[#9a9fc0]">Manage discount types and rates used by staff during checkout.</p>
              <div className="mb-5 space-y-3 rounded-lg border border-[#e2e8f0] p-4">
                <input value={discountForm.name} onChange={(event) => setDiscountForm({ ...discountForm, name: event.target.value })} placeholder="Discount name" className="h-10 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-4 text-[14px] text-[#111827] outline-none focus:border-[#008967]" />
                <input type="number" min={0} max={100} value={discountForm.percentage} onChange={(event) => setDiscountForm({ ...discountForm, percentage: event.target.value })} placeholder="Rate" className="h-10 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-4 text-[14px] text-[#111827] outline-none focus:border-[#008967]" />
                <button type="button" onClick={submitDiscount} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#008967] px-4 text-[14px] font-medium text-white">
                  <Plus className="size-4" />
                  {editingDiscountId ? 'Update Discount' : 'Add Discount'}
                </button>
              </div>
              <div className="divide-y divide-[#edf2f7] overflow-hidden rounded-lg border border-[#e2e8f0]">
                {discountSettings.discounts.map((discount) => (
                  <div key={discount.id} className="grid grid-cols-[1fr_120px_100px] items-center px-5 py-3 text-[14px]">
                    <span className="font-medium text-[#111827]">{discount.name}</span>
                    <span className="text-[#64748b]">{discount.percentage}%</span>
                    <div className="flex justify-end gap-2">
                      <IconButton label="Edit discount" icon={Pencil} onClick={() => editDiscount(discount)} />
                      <IconButton label="Delete discount" icon={Trash2} tone="danger" onClick={() => setDiscountSettings((current) => ({ discounts: current.discounts.filter((item) => item.id !== discount.id) }))} />
                    </div>
                  </div>
                ))}
                {discountSettings.discounts.length === 0 && <Empty text="No discounts configured yet." />}
              </div>
            </section>
          )}
        </div>
      </AdminPage>
    );
  }

  if (page === 'categories') {
    return (
      <AdminPage title={copy.title} subtitle={copy.subtitle} icon={Icon}>
        <form onSubmit={submitCategory} className="mb-6 rounded-lg border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto]">
            <EditableField label="Category Name" value={categoryForm.name} onChange={(value) => setCategoryForm({ ...categoryForm, name: value })} required />
            <EditableField label="Description" value={categoryForm.description} onChange={(value) => setCategoryForm({ ...categoryForm, description: value })} />
            <button type="submit" className="mt-7 h-11 rounded-lg bg-[#008967] px-5 text-[14px] font-medium text-white">
              {editingCategory ? 'Save' : 'Add'}
            </button>
          </div>
          {editingCategory && (
            <button type="button" onClick={resetCategoryForm} className="mt-3 text-[14px] font-medium text-[#64748b] hover:text-[#111827]">
              Cancel edit
            </button>
          )}
        </form>
        <section className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
          <TableHeader columns={['Name', 'Description', 'Actions']} grid="grid-cols-[1fr_1.5fr_120px]" />
          <div className="divide-y divide-[#edf2f7]">
            {loadingCategories ? (
              <Empty text="Loading categories..." />
            ) : categoryRecords.length === 0 ? (
              <Empty text="No categories found." />
            ) : (
              categoryRecords.map((category) => (
                <div key={category.id} className="grid grid-cols-[1fr_1.5fr_120px] items-center px-6 py-4 text-[14px] text-[#111827]">
                  <span className="font-medium">{category.name}</span>
                  <span className="text-[#64748b]">{category.description || '-'}</span>
                  <div className="flex justify-end gap-2">
                    <IconButton label="Edit category" icon={Pencil} onClick={() => editCategory(category)} />
                    <IconButton label="Delete category" icon={Trash2} tone="danger" onClick={() => setDeletingCategory(category)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        <ConfirmDialog open={Boolean(deletingCategory)} title="Confirm Delete" description={`Are you sure you want to delete ${deletingCategory?.name ?? 'this category'}?`} onCancel={() => setDeletingCategory(null)} onConfirm={confirmDeleteCategory} />
      </AdminPage>
    );
  }

  const isIngredient = page === 'ingredients';
  const productImagePreview = inventoryForm.imageUrl || defaultWhiteLogo;
  const ingredientSource = isIngredient ? inventory : ingredientInventory;
  const ingredientOptions = ingredientSource.map((item) => ({
    id: item.id,
    label: `${item.name} (${Number(item.quantity).toLocaleString()} ${item.unit || 'pcs'})`,
  }));
  return (
    <AdminPage title={copy.title} subtitle={copy.subtitle} icon={Icon}>
      <form onSubmit={submitInventory} className={`mb-6 rounded-lg border border-[#e2e8f0] bg-white p-6 shadow-sm ${isIngredient ? 'grid gap-4 md:grid-cols-[1fr_140px_160px_auto]' : ''}`}>
        {isIngredient ? (
          <>
            <input value={inventoryForm.name} onChange={(event) => setInventoryForm({ ...inventoryForm, name: event.target.value })} required placeholder="Ingredient name" className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] outline-none focus:border-[#008967]" />
            <input value={inventoryForm.unit} onChange={(event) => setInventoryForm({ ...inventoryForm, unit: event.target.value })} required placeholder="Unit" className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] outline-none focus:border-[#008967]" />
            <input type="number" value={inventoryForm.quantity} onChange={(event) => setInventoryForm({ ...inventoryForm, quantity: event.target.value })} required placeholder="Stock" className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] outline-none focus:border-[#008967]" />
            <button type="submit" className="rounded-lg bg-[#008967] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#007a5e]">
              {editingInventory ? 'Save' : 'Add'}
            </button>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <input value={inventoryForm.name} onChange={(event) => setInventoryForm({ ...inventoryForm, name: event.target.value })} required placeholder="Product name" className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] outline-none focus:border-[#008967]" />
              <select value={inventoryForm.category} onChange={(event) => setInventoryForm({ ...inventoryForm, category: event.target.value })} className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] outline-none focus:border-[#008967]">
                <option value="">No category</option>
                {categoryRecords.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
              <input type="number" value={inventoryForm.price} onChange={(event) => setInventoryForm({ ...inventoryForm, price: event.target.value })} required placeholder="Price" className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] outline-none focus:border-[#008967]" />
              <input value={inventoryForm.description} onChange={(event) => setInventoryForm({ ...inventoryForm, description: event.target.value })} placeholder="Description" className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] outline-none focus:border-[#008967] md:col-span-2" />
              <div>
                <div className="flex gap-3">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e2e8f0] bg-white">
                    {productImagePreview ? (
                      <img src={productImagePreview} alt={inventoryForm.name || 'Product'} className="h-full w-full object-cover" />
                    ) : (
                      <span className="px-2 text-center text-xs text-[#9a9fc0]">No image</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#e2e8f0] px-3 text-center text-[14px] text-[#008967] transition hover:bg-[#f8fafb]">
                      <Upload className="h-4 w-4" />
                      Upload product image
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleInventoryImageUpload} className="hidden" />
                    </label>
                    {inventoryForm.imageUrl && (
                      <button type="button" onClick={() => setInventoryForm({ ...inventoryForm, imageUrl: '' })} className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-[14px] text-[#008967] hover:bg-[#f8fafb]">
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-[#e2e8f0] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-medium text-[#111827]">Required Ingredients</h2>
                  <p className="text-[12px] text-[#9a9fc0]">Product availability is calculated from assigned ingredient stock.</p>
                </div>
                <button type="button" onClick={() => setProductIngredients((current) => [...current, { ingredientId: '', quantity: '', required: true, removable: true }])} className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-[14px] text-[#008967]">Add Ingredient</button>
              </div>
              <div className="space-y-3">
                {productIngredients.map((row, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[1fr_140px_120px_120px_auto]">
                    <select value={row.ingredientId} onChange={(event) => setProductIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ingredientId: event.target.value } : item))} className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px]">
                      <option value="">Select ingredient</option>
                      {ingredientOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                    <input type="number" value={row.quantity} onChange={(event) => setProductIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} placeholder="Quantity" className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px]" />
                    <label className="flex items-center gap-2 text-[14px] text-[#111827]">
                      <input type="checkbox" checked={row.required} onChange={(event) => setProductIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item))} className="h-5 w-5 accent-[#008967]" />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-[14px] text-[#111827]">
                      <input type="checkbox" checked={row.removable} onChange={(event) => setProductIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, removable: event.target.checked } : item))} className="h-5 w-5 accent-[#008967]" />
                      Removable
                    </label>
                    <button type="button" onClick={() => setProductIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-red-100 px-3 py-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {productIngredients.length === 0 && <p className="rounded-lg bg-[#f8fafb] p-3 text-[14px] text-[#9a9fc0]">No ingredients assigned yet.</p>}
              </div>
            </div>
          </>
        )}
        <label className={`${isIngredient ? 'md:col-span-4' : 'mt-4'} flex items-center gap-2 text-[14px] text-[#111827]`}>
          <input type="checkbox" checked={inventoryForm.available} onChange={(event) => setInventoryForm({ ...inventoryForm, available: event.target.checked })} className="size-5 accent-[#008967]" />
          {isIngredient ? 'Available for production' : 'Available'}
        </label>
        {!isIngredient && (
          <div className="mt-5 flex gap-3">
            <button className="rounded-lg bg-[#008967] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#007a5e]">
              {editingInventory ? 'Save Product' : 'Add Product'}
            </button>
          </div>
        )}
        {editingInventory && (
          <button type="button" onClick={resetInventoryForm} className="mt-3 text-[14px] font-medium text-[#64748b] hover:text-[#111827]">
            Cancel edit
          </button>
        )}
      </form>
      <section className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
        <TableHeader
          columns={isIngredient ? ['Name', 'Unit', 'Stock', 'Low Stock', 'Status', 'Actions'] : ['Name', 'Category', 'Price', 'Can Make', 'Status', 'Actions']}
          grid={isIngredient ? 'grid-cols-[1fr_120px_120px_120px_120px_120px]' : 'grid-cols-[1fr_180px_120px_120px_120px_120px]'}
        />
        <div className="divide-y divide-[#edf2f7]">
          {loadingInventory ? (
            <Empty text="Loading records..." />
          ) : inventory.length === 0 ? (
            <Empty text={isIngredient ? 'No ingredients found.' : 'No products found.'} />
          ) : (
            inventory.map((item) => (
              <div key={item.id} className={`grid items-center px-6 py-4 text-[14px] text-[#111827] ${isIngredient ? 'grid-cols-[1fr_120px_120px_120px_120px_120px]' : 'grid-cols-[1fr_180px_120px_120px_120px_120px]'}`}>
                <span className="font-medium">{item.name}</span>
                {isIngredient ? (
                  <>
                    <span>{item.unit || '-'}</span>
                    <span>{productCanMake(item).toLocaleString()}</span>
                    <span>{Number(item.minStock ?? item.reorderPoint ?? 0).toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    <span>{item.category || '-'}</span>
                    <span>{formatMoney(item.price)}</span>
                    <span>{Number(item.quantity).toLocaleString()}</span>
                  </>
                )}
                <span>{item.quantity > 0 ? 'Available' : 'Unavailable'}</span>
                <div className="flex justify-end gap-2">
                  <IconButton label={`Edit ${isIngredient ? 'ingredient' : 'product'}`} icon={Pencil} onClick={() => editInventory(item)} />
                  <IconButton label={`Delete ${isIngredient ? 'ingredient' : 'product'}`} icon={Trash2} tone="danger" onClick={() => setDeletingInventory(item)} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      {isIngredient && (
        <>
          <div className="mb-4 mt-8">
            <h2 className="mb-2 text-[24px] font-medium text-[#008967]">Ingredient Deduction History</h2>
            <p className="text-[15px] text-[#9a9fc0]">Recent order deductions from ingredient inventory.</p>
          </div>
          <section className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
            <TableHeader columns={['Date', 'Order', 'Item', 'Ingredient', 'Qty Deducted']} grid="grid-cols-[180px_1fr_1fr_1fr_160px]" />
            <Empty text="No ingredient deductions yet." />
          </section>

          <div className="mb-4 mt-8">
            <h2 className="mb-2 text-[24px] font-medium text-[#008967]">Ingredient Alternatives</h2>
            <p className="text-[15px] text-[#9a9fc0]">Link replacement ingredients that POS staff can choose when inventory is available.</p>
          </div>
          <form
            onSubmit={submitIngredientAlternative}
            className="mb-6 grid gap-4 rounded-lg border border-[#e2e8f0] bg-white p-6 shadow-sm md:grid-cols-[1fr_1fr_160px_140px]"
          >
            <select value={ingredientAlternative.originalId} onChange={(event) => setIngredientAlternative({ ...ingredientAlternative, originalId: event.target.value })} required className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px]">
              <option value="">Original ingredient</option>
              {ingredientSource.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={ingredientAlternative.alternativeId} onChange={(event) => setIngredientAlternative({ ...ingredientAlternative, alternativeId: event.target.value })} required className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px]">
              <option value="">Alternative ingredient</option>
              {ingredientSource.filter((item) => item.id !== ingredientAlternative.originalId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input type="number" value={ingredientAlternative.extraPrice} onChange={(event) => setIngredientAlternative({ ...ingredientAlternative, extraPrice: event.target.value })} placeholder="Extra price" className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[14px]" />
            <button className="rounded-lg bg-[#008967] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#007a5e]">{editingIngredientAlternative ? 'Save' : 'Add'}</button>
            <label className="flex items-center gap-2 text-[14px] text-[#111827] md:col-span-4">
              <input type="checkbox" checked={ingredientAlternative.available} onChange={(event) => setIngredientAlternative({ ...ingredientAlternative, available: event.target.checked })} className="h-5 w-5 accent-[#008967]" />
              Show this alternative in POS when stock is available
            </label>
            {editingIngredientAlternative && (
              <button type="button" onClick={resetIngredientAlternativeForm} className="text-left text-[14px] font-medium text-[#64748b] hover:text-[#111827] md:col-span-4">
                Cancel edit
              </button>
            )}
          </form>
          <section className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
            <TableHeader columns={['Original', 'Alternative', 'Extra Price', 'Status', 'Actions']} grid="grid-cols-[1fr_1fr_140px_120px_120px]" />
            <div className="divide-y divide-[#edf2f7]">
              {loadingIngredientAlternatives ? (
                <Empty text="Loading alternatives..." />
              ) : ingredientAlternatives.length === 0 ? (
                <Empty text="No alternatives configured yet." />
              ) : (
                ingredientAlternatives.map((alternative) => (
                  <div key={alternative.id} className="grid grid-cols-[1fr_1fr_140px_120px_120px] items-center px-6 py-4 text-[14px] text-[#111827]">
                    <span className="font-medium">{alternative.parentIngredientName}</span>
                    <span>{alternative.alternativeIngredientName}</span>
                    <span>{formatMoney(alternative.additionalPrice)}</span>
                    <span>{alternative.isAvailable ? 'Available' : 'Unavailable'}</span>
                    <div className="flex justify-end gap-2">
                      <IconButton label="Edit alternative" icon={Pencil} onClick={() => editIngredientAlternative(alternative)} />
                      <IconButton label="Delete alternative" icon={Trash2} tone="danger" onClick={() => setDeletingIngredientAlternative(alternative)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
      <ConfirmDialog open={Boolean(deletingInventory)} title="Confirm Delete" description={`Are you sure you want to delete ${deletingInventory?.name ?? 'this record'}?`} onCancel={() => setDeletingInventory(null)} onConfirm={confirmDeleteInventory} />
      <ConfirmDialog open={Boolean(deletingIngredientAlternative)} title="Confirm Delete" description={`Are you sure you want to delete this alternative for ${deletingIngredientAlternative?.parentIngredientName ?? 'this ingredient'}?`} onCancel={() => setDeletingIngredientAlternative(null)} onConfirm={confirmDeleteIngredientAlternative} />
    </AdminPage>
  );
}

function AdminPage({
  title,
  subtitle,
  icon: Icon,
  actionLabel,
  actionIcon: ActionIcon = Plus,
  onAction,
  hideHeading = false,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Store;
  actionLabel?: string;
  actionIcon?: typeof Plus;
  onAction?: () => void;
  hideHeading?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-background p-8 font-[var(--font-body)]">
      <div className={`flex items-start justify-between gap-4 ${hideHeading ? 'mb-0' : 'mb-6'}`}>
        {!hideHeading && (
          <div className="flex items-start gap-3">
            <div className="mt-1 flex size-10 items-center justify-center rounded-[10px] bg-[#008967]/10 text-[#008967]">
              <Icon className="size-5" />
            </div>
            <div>
              <h1 className="text-[28px] font-medium leading-tight text-[#008967]">{title}</h1>
              {subtitle && <p className="mt-2 text-[15px] text-[#9a9fc0]">{subtitle}</p>}
            </div>
          </div>
        )}
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#008967] px-4 text-[14px] font-semibold text-white transition hover:bg-[#007a5e]"
          >
            <ActionIcon className="size-4" />
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EditableField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#9a9fc0]">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-4 text-[14px] text-[#111827] outline-none focus:border-[#008967]"
      />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#9a9fc0]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full resize-none rounded-[8px] border border-[#e2e8f0] bg-white px-4 py-3 text-[14px] text-[#111827] outline-none focus:border-[#008967]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  fallback,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  fallback: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#9a9fc0]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-4 text-[14px] text-[#111827] outline-none focus:border-[#008967]"
      >
        <option value="">{fallback}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function NumberTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#9a9fc0]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-4 text-[14px] text-[#111827] outline-none focus:border-[#008967]"
      />
    </label>
  );
}

function NumberField({ label, value, disabled, onChange }: { label: string; value: number; disabled?: boolean; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#9a9fc0]">{label}</span>
      <input
        type="number"
        min={0}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="h-11 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-4 text-[14px] text-[#111827] outline-none focus:border-[#008967] disabled:bg-[#f8fafb] disabled:opacity-60"
      />
    </label>
  );
}

function ToggleLine({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[10px] border border-[#e2e8f0] bg-white px-4 py-3 text-[14px] text-[#111827]">
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-1 block text-[12px] text-[#64748b]">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#008967] focus:ring-offset-2 ${checked ? 'bg-[#008967]' : 'bg-[#9a9fc0]/40'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

function IconButton({ label, icon: Icon, tone = 'default', onClick }: { label: string; icon: typeof Pencil; tone?: 'default' | 'danger'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex size-8 items-center justify-center rounded-md transition ${
        tone === 'danger'
          ? 'text-[#64748b] hover:bg-red-50 hover:text-red-700'
          : 'text-[#64748b] hover:bg-slate-100 hover:text-[#008967]'
      }`}
    >
      <Icon className="size-5" strokeWidth={1.9} />
    </button>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-xl font-semibold text-[#111827]">{title}</h2>
        <p className="text-sm text-[#64748b]">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#f8fafb]">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function TableHeader({ columns, grid }: { columns: string[]; grid: string }) {
  return (
    <div className={`grid ${grid} bg-[#f1f5f9] px-6 py-3 text-[13px] font-semibold text-[#111827]`}>
      {columns.map((column) => <span key={column}>{column}</span>)}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-6 py-12 text-center text-[15px] text-[#9a9fc0]">{text}</div>;
}
