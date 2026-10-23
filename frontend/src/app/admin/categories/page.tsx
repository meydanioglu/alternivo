import { AdminHeader } from "@/components/admin/admin-parts";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";
import { userApi } from "@/lib/auth/session";

export default async function AdminCategoriesPage() {
  const categories = await userApi<CategoryRow[]>("/api/v1/admin/categories", { persist: false });
  return (
    <>
      <AdminHeader
        title="Kategoriler"
        description="Kategori ekleyin, düzenleyin veya silin. İçinde uygulama ya da alt kategori olan kategori silinemez."
      />
      <CategoryManager categories={categories} />
    </>
  );
}
