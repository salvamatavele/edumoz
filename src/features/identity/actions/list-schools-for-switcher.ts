"use server";

import { listAllActiveSchools } from "@/features/identity/data/platform-schools";
import { auth } from "@/lib/auth/config";

/**
 * Todas as escolas activas, para o selector de escola (`SchoolSwitcher`) de um
 * administrador da plataforma — verifica `isPlatformAdmin` aqui, no servidor, e não
 * confia no que o cliente diz ser. Devolve lista vazia para quem não é superadmin, em vez
 * de um erro — o componente já sabe não mostrar nada nesse caso.
 */
export async function listSchoolsForSwitcher(): Promise<Array<{ id: string; name: string }>> {
  const session = await auth();

  if (!session?.isPlatformAdmin) return [];

  return listAllActiveSchools();
}
