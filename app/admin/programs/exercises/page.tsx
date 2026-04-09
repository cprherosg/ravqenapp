import { AdminIdentityBanner } from "@/components/admin-identity-banner";
import { AdminNav } from "@/components/admin-nav";
import { ProgramStudio } from "@/components/program-studio";
import {
  archiveProgramDefinitionAction,
  deleteProgramDefinitionAction,
  saveInternalExerciseLibraryAction,
  saveProgramDefinitionAction,
  saveRotationCalendarAction,
} from "@/app/admin/actions";
import { requireAdminPageAccess } from "@/lib/auth/admin";
import { getProgrammingStudioBootstrap } from "@/lib/repositories/programming";

export default async function AdminProgramsExercisesPage() {
  const adminAccess = await requireAdminPageAccess();
  const programming = await getProgrammingStudioBootstrap();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17383f_0%,#071015_45%,#020508_100%)] px-4 py-5 text-stone-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-[2rem] border border-cyan-300/12 bg-white/6 p-5 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
                Admin control
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Ravqen Internal Library
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-300">
                Filter and search the internal exercise bank, then maintain taxonomy, section
                suitability, and exercise details without cluttering the main program editor.
              </p>
            </div>

            <AdminNav />
          </div>
          <div className="mt-4">
            <AdminIdentityBanner
              fullName={adminAccess.fullName}
              email={adminAccess.email}
            />
          </div>
        </section>

        <ProgramStudio
          mode="exercise-bank"
          initialPrograms={programming.programs}
          initialCalendar={programming.calendar}
          initialInternalLibrary={programming.internalLibrary}
          initialDateOverrides={programming.dateOverrides}
          saveProgramAction={saveProgramDefinitionAction}
          archiveProgramAction={archiveProgramDefinitionAction}
          deleteProgramAction={deleteProgramDefinitionAction}
          saveCalendarAction={saveRotationCalendarAction}
          saveInternalLibraryAction={saveInternalExerciseLibraryAction}
        />
      </div>
    </main>
  );
}
