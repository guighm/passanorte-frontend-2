// Placeholder da seção admin/funcionarios — definida na SPE-02 (SPE-01 US2 T019,
// estático por análise E1). Acesso exclusivo do administrador (RF03).
import PlaceholderSection from "@/shared/components/PlaceholderSection";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PlaceholderSection
        title="funcionarios"
        description="Seção administrativa com implementação definida na spec correspondente."
        spec="SPE-02"
      />
    </div>
  );
}

export const metadata = {
  title: "funcionarios — PassaNorte",
};
