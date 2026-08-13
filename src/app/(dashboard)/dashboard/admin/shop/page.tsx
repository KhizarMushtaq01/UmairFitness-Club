import { getAllProducts } from "@/features/shop/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddProductForm } from "./AddProductForm";

type ProductRow = Awaited<ReturnType<typeof getAllProducts>>[number];

export default async function AdminShopPage() {
  const products = await getAllProducts();

  return (
    <>
      <Topbar title="Shop" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <AddProductForm />
        {products.length === 0 ? (
          <EmptyState body="No products yet." />
        ) : (
          <DataTable<ProductRow>
            columns={[
              { header: "Product", render: (r) => r.name },
              { header: "Price", render: (r) => r.price },
              { header: "Category", render: (r) => r.category },
              {
                header: "Stock",
                render: (r) => <StatusBadge label={`${r.stock} in stock`} color={r.stockColor} />,
              },
            ]}
            rows={products}
          />
        )}
      </div>
    </>
  );
}
