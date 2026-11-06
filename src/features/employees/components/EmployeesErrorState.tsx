"use client";

// Estado de erro da listagem com nova tentativa (SPE-02 T008/T009, FR-004,
// SC-006): ErrorState transversal + ação de retry (router.refresh() para
// reexecutar o Server Component). Distinto de loading e vazio (Princípio V).

import { useRouter } from "next/navigation";
import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";

interface EmployeesErrorStateProps {
  message: string;
  detail: string;
}

export default function EmployeesErrorState({ message, detail }: EmployeesErrorStateProps) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-start gap-3">
      <ErrorState message={message} detail={detail} />
      <Button variant="secondary" onClick={() => router.refresh()}>
        Tentar novamente
      </Button>
    </div>
  );
}
