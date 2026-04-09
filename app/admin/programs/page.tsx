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
import { getProgrammingEngineSnapshot } from "@/lib/training-engine";

export default async function AdminProgramsPage() {
  const adminAccess = await requireAdminPageAccess();
  const programming = await getProgrammingStudioBootstrap();
  const engine = getProgrammingEngineSnapshot();

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
                Ravqen Program Studio
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-300">
                Edit the exercise library, assign rotating daily programs, and prepare Ravqen to
                use either Ymove demos or your own internal media.
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
          mode="schedule"
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

        <section className="rounded-[2rem] border border-white/10 bg-[#091317] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">Programming engine</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <EngineNote title={`${engine.blockName} • ${engine.blockWeekLabel}`} body={engine.progressionFocus} />
            <EngineNote title="Deload logic" body="Every fourth week should lower fatigue and preserve movement quality before the next build wave." />
            <EngineNote title="Substitutions" body={engine.substitutionRule} />
            <EngineNote title="Adaptation" body={engine.adaptationRule} />
          </div>
        </section>
      </div>
    </main>
  );
}

function EngineNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-stone-300">{body}</p>
    </div>
  );
}
