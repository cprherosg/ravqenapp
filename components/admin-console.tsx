"use client";

import { startTransition, useMemo, useState } from "react";
import {
  createMemberAction,
  deleteMemberAction,
  sendMemberPasswordResetAction,
  setMemberTemporaryPasswordAction,
  updateMemberAction,
} from "@/app/admin/actions";
import type { MembershipStatus, MemberAccessTier, MemberProfile } from "@/lib/admin-data";
import { isSuperAdminEmail } from "@/lib/auth/admin-constants";
import { isUuid } from "@/lib/utils/is-uuid";

type AdminConsoleProps = {
  members: MemberProfile[];
  membershipTiers: MemberAccessTier[];
  workoutCategories: string[];
};

type MemberInlineEditorProps = {
  selectedMember: MemberProfile;
  membershipTiers: MemberAccessTier[];
  workoutCategories: string[];
  selectedUsesWeeklyLimit: boolean;
  selectedMemberIsPersisted: boolean;
  selectedMemberIsSuperAdmin: boolean;
  temporaryPassword: string;
  setTemporaryPassword: (value: string) => void;
  saveError: string | null;
  saveMessage: string | null;
  isSettingTempPassword: boolean;
  isSendingReset: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  updateMember: (memberId: string, updates: Partial<MemberProfile>) => void;
  onSetTemporaryPassword: () => void;
  onSendReset: () => void;
  onSave: () => void;
  onRemove: () => void;
};

export function AdminConsole({
  members,
  membershipTiers,
  workoutCategories,
}: AdminConsoleProps) {
  const defaultAllowedCategories = useMemo(
    () => workoutCategories.filter((category) => category !== "Hyrox"),
    [workoutCategories],
  );
  const [memberState, setMemberState] = useState(members);
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? "");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSettingTempPassword, setIsSettingTempPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [newMember, setNewMember] = useState<MemberProfile>({
    id: "mem-new",
    name: "",
    email: "",
    tierType: "weekly_limit",
    tierLabel: "Weekly limit",
    status: "active",
    weeklyLimit: 3,
    sessionsRemaining: 3,
    allowedCategories: defaultAllowedCategories,
    gymProfile: "Commercial gym with standard free weights and cardio machines",
    equipmentOverride: "No override yet.",
    goalFocus: "Build consistency and follow guided training at a sustainable pace.",
    lastWorkoutSummary: "No sessions completed yet.",
    notes: "",
  });

  const selectedMember =
    memberState.find((member) => member.id === selectedMemberId) ?? null;
  const selectedUsesWeeklyLimit = selectedMember?.tierType === "weekly_limit";
  const selectedMemberIsSuperAdmin = selectedMember
    ? isSuperAdminEmail(selectedMember.email)
    : false;
  const newMemberUsesWeeklyLimit = newMember.tierType === "weekly_limit";
  const filteredMembers = useMemo(() => {
    const query = memberSearchQuery.trim().toLowerCase();

    if (!query) {
      return memberState;
    }

    return memberState.filter((member) => {
      return (
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.tierLabel.toLowerCase().includes(query) ||
        member.status.toLowerCase().includes(query)
      );
    });
  }, [memberSearchQuery, memberState]);

  const dashboardStats = useMemo(() => {
    const active = memberState.filter((member) => member.status === "active").length;
    const paused = memberState.filter((member) => member.status === "paused").length;
    const unlimited = memberState.filter((member) => member.tierType === "monthly_unlimited").length;

    return {
      active,
      paused,
      unlimited,
      total: memberState.length,
    };
  }, [memberState]);

  const updateMember = (memberId: string, updates: Partial<MemberProfile>) => {
    setSaveError(null);
    setSaveMessage(null);
    setMemberState((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, ...updates } : member,
      ),
    );
  };

  const resetNewMember = () => {
    setCreatePassword("");
    setNewMember({
      id: "mem-new",
      name: "",
      email: "",
      tierType: "weekly_limit",
      tierLabel: "Weekly limit",
      status: "active",
      weeklyLimit: 3,
      sessionsRemaining: 3,
      allowedCategories: defaultAllowedCategories,
      gymProfile: "Commercial gym with standard free weights and cardio machines",
      equipmentOverride: "No override yet.",
      goalFocus: "Build consistency and follow guided training at a sustainable pace.",
      lastWorkoutSummary: "No sessions completed yet.",
      notes: "",
    });
  };

  const createMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      setCreateError("Name and email are required.");
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    startTransition(async () => {
      const result = await createMemberAction({
        email: newMember.email,
        name: newMember.name,
        password: createPassword,
        tierType: newMember.tierType,
        status: newMember.status,
        weeklyLimit: newMember.weeklyLimit,
        sessionsRemaining: newMember.sessionsRemaining,
        allowedCategories: newMember.allowedCategories,
        gymProfile: newMember.gymProfile,
        equipmentOverride: newMember.equipmentOverride,
        goalFocus: newMember.goalFocus,
        notes: newMember.notes,
      });

      if (!result.ok) {
        setCreateError(result.message);
        setIsCreating(false);
        return;
      }

      setMemberState((current) => [result.member, ...current]);
      setSelectedMemberId(result.member.id);
      setIsCreateOpen(false);
      resetNewMember();
      setIsCreating(false);
    });
  };

  const persistSelectedMember = () => {
    if (!selectedMember) {
      return;
    }

    setSaveError(null);
    setSaveMessage(null);
    setIsSaving(true);

    startTransition(async () => {
      const payload = {
        id: selectedMember.id,
        name: selectedMember.name,
        email: selectedMember.email,
        tierType: selectedMember.tierType,
        status: selectedMember.status,
        weeklyLimit: selectedMember.weeklyLimit,
        sessionsRemaining: selectedMember.sessionsRemaining,
        allowedCategories: selectedMember.allowedCategories,
        gymProfile: selectedMember.gymProfile,
        equipmentOverride: selectedMember.equipmentOverride,
        goalFocus: selectedMember.goalFocus,
        lastWorkoutSummary: selectedMember.lastWorkoutSummary,
        notes: selectedMember.notes,
      };
      const result = await updateMemberAction(payload);

      if (!result.ok) {
        setSaveError(result.message);
        setIsSaving(false);
        return;
      }

      setMemberState((current) =>
        current.map((member) =>
          member.id === result.member.id ? result.member : member,
        ),
      );
      setSaveMessage("Member changes saved.");
      setIsSaving(false);
    });
  };

  const removeSelectedMember = () => {
    if (!selectedMember) {
      return;
    }

    if (!window.confirm(`Remove ${selectedMember.name} from Ravqen?`)) {
      return;
    }

    setSaveError(null);
    setSaveMessage(null);
    setIsDeleting(true);

    startTransition(async () => {
      const result = await deleteMemberAction(selectedMember.id);

      if (!result.ok) {
        setSaveError(result.message);
        setIsDeleting(false);
        return;
      }

      const nextMembers = memberState.filter((member) => member.id !== selectedMember.id);
      setMemberState(nextMembers);
      setSelectedMemberId(nextMembers[0]?.id ?? "");
      setSaveMessage("Member removed.");
      setIsDeleting(false);
    });
  };

  const selectedMemberIsPersisted = selectedMember ? isUuid(selectedMember.id) : false;

  return (
    <>
      <section className="rounded-[2rem] border border-cyan-300/12 bg-white/6 p-5 backdrop-blur">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Members" value={`${dashboardStats.total}`} />
          <StatTile label="Active" value={`${dashboardStats.active}`} />
          <StatTile label="Paused" value={`${dashboardStats.paused}`} />
          <StatTile label="Unlimited" value={`${dashboardStats.unlimited}`} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">
                Members
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Access roster and inline editor
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
                Choose a member from the roster below, then edit their access, notes, and password tools inline without jumping between separate panels.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="shrink-0 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full border border-cyan-300/35 bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_30px_rgba(34,211,238,0.28)] transition hover:scale-[1.01] hover:bg-cyan-200"
            >
              <span className="text-sm leading-none text-slate-950">+</span>
              New member
            </button>
          </div>

          <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-3">
            <label className="block">
              <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">
                Search members
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(event) => setMemberSearchQuery(event.target.value)}
                  placeholder="Search by name, email, tier, or status"
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMemberSearchQuery(memberSearchQuery.trim())}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
                >
                  Search
                </button>
              </div>
            </label>
          </div>

          <div className="max-h-[32rem] overflow-y-auto pr-1 space-y-3">
            {filteredMembers.length ? filteredMembers.map((member) => {
              const isSelected = member.id === selectedMemberId;

              return (
                <div
                  key={member.id}
                  className={`overflow-hidden rounded-[1.5rem] border transition ${
                    isSelected
                      ? "border-cyan-300/40 bg-cyan-300/10"
                      : "border-white/8 bg-white/4"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMemberId((current) =>
                        current === member.id ? "" : member.id,
                      )
                    }
                    className="w-full px-4 py-4 text-left transition hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{member.name}</p>
                        <p className="mt-1 text-xs text-stone-400">{member.email}</p>
                      </div>
                      <StatusPill status={member.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-stone-300">
                      <MiniMetric label="Tier" value={member.tierLabel} />
                      <MiniMetric
                        label="Weekly"
                        value={member.weeklyLimit === null ? "N/A" : `${member.weeklyLimit}`}
                      />
                      <MiniMetric label="Left" value={`${member.sessionsRemaining}`} />
                    </div>
                  </button>

                  {isSelected && selectedMember ? (
                    <MemberInlineEditor
                      selectedMember={selectedMember}
                      membershipTiers={membershipTiers}
                      workoutCategories={workoutCategories}
                      selectedUsesWeeklyLimit={selectedUsesWeeklyLimit}
                      selectedMemberIsPersisted={selectedMemberIsPersisted}
                      selectedMemberIsSuperAdmin={selectedMemberIsSuperAdmin}
                      temporaryPassword={temporaryPassword}
                      setTemporaryPassword={setTemporaryPassword}
                      saveError={saveError}
                      saveMessage={saveMessage}
                      isSettingTempPassword={isSettingTempPassword}
                      isSendingReset={isSendingReset}
                      isSaving={isSaving}
                      isDeleting={isDeleting}
                      updateMember={updateMember}
                      onSetTemporaryPassword={() => {
                        setSaveError(null);
                        setSaveMessage(null);

                        if (!temporaryPassword.trim()) {
                          setSaveError("Enter a temporary password first.");
                          return;
                        }

                        setIsSettingTempPassword(true);

                        startTransition(async () => {
                          const result = await setMemberTemporaryPasswordAction({
                            memberId: selectedMember.id,
                            password: temporaryPassword,
                          });

                          if (!result.ok) {
                            setSaveError(result.message);
                            setIsSettingTempPassword(false);
                            return;
                          }

                          setSaveMessage("Temporary password set.");
                          setTemporaryPassword("");
                          setIsSettingTempPassword(false);
                        });
                      }}
                      onSendReset={() => {
                        setSaveError(null);
                        setSaveMessage(null);
                        setIsSendingReset(true);

                        startTransition(async () => {
                          const result = await sendMemberPasswordResetAction(selectedMember.email);

                          if (!result.ok) {
                            setSaveError(result.message);
                            setIsSendingReset(false);
                            return;
                          }

                          setSaveMessage("Password reset email sent.");
                          setIsSendingReset(false);
                        });
                      }}
                      onSave={persistSelectedMember}
                      onRemove={removeSelectedMember}
                    />
                  ) : null}
                </div>
              );
            }) : (
              <div className="rounded-[1.5rem] border border-white/8 bg-white/4 px-4 py-6 text-center text-sm text-stone-300">
                No members matched your search.
              </div>
            )}
          </div>
        </div>
      </section>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 backdrop-blur">
          <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#071015] shadow-2xl shadow-black/40">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/8 bg-[#071015] px-5 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">
                  Create member
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Add a new member
                </h2>
                <p className="mt-2 text-sm text-stone-400">
                  This creates the member in Supabase auth and adds the starting
                  membership profile into Ravqen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  resetNewMember();
                  setCreateError(null);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              >
                Close
              </button>
              </div>

              <div className="overflow-y-auto px-5 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <ControlCard label="Name">
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(event) =>
                    setNewMember((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                  placeholder="John Tan"
                />
              </ControlCard>

              <ControlCard label="Email">
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(event) =>
                    setNewMember((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                  placeholder="john@example.com"
                />
              </ControlCard>

              <ControlCard label="Password">
                <input
                  type="password"
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Optional. Set at least 8 characters"
                />
                <p className="mt-2 text-sm text-stone-300">
                  Leave blank to create the member and set a password later.
                </p>
              </ControlCard>

              <ControlCard label="Membership tier">
                <select
                  value={newMember.tierType}
                  onChange={(event) => {
                    const nextTier = membershipTiers.find(
                      (tier) => tier.id === event.target.value,
                    );

                    setNewMember((current) => ({
                      ...current,
                      tierType: event.target.value as MemberProfile["tierType"],
                      tierLabel: nextTier?.label ?? current.tierLabel,
                      weeklyLimit:
                        event.target.value === "weekly_limit"
                          ? (current.weeklyLimit ?? 3)
                          : null,
                      sessionsRemaining:
                        event.target.value === "monthly_unlimited"
                          ? 9999
                          : current.sessionsRemaining,
                    }));
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                >
                  {membershipTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </ControlCard>

              <ControlCard label="Status">
                <div className="grid grid-cols-3 gap-2">
                  {(["active", "paused", "expired"] as MembershipStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setNewMember((current) => ({ ...current, status }))}
                      className={`rounded-2xl px-3 py-3 text-sm font-semibold capitalize transition ${
                        newMember.status === status
                          ? "bg-cyan-300 text-slate-950"
                          : "border border-white/10 bg-[#0b1519] text-stone-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </ControlCard>

              <ControlCard label="Weekly limit">
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={newMember.weeklyLimit ?? 3}
                  onChange={(event) =>
                    setNewMember((current) => ({
                      ...current,
                      weeklyLimit: Number(event.target.value),
                    }))
                  }
                  disabled={!newMemberUsesWeeklyLimit}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
                <p className="mt-2 text-sm text-stone-300">
                  {newMemberUsesWeeklyLimit
                    ? "Only applies to weekly-limit memberships."
                    : "Not used for this membership tier."}
                </p>
              </ControlCard>

              <ControlCard label="Sessions remaining">
                <input
                  type="number"
                  min={0}
                  value={newMember.sessionsRemaining}
                  onChange={(event) =>
                    setNewMember((current) => ({
                      ...current,
                      sessionsRemaining: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
              </ControlCard>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <ControlCard label="Allowed categories">
                <div className="grid grid-cols-2 gap-2">
                  {workoutCategories.map((category) => {
                    const enabled = newMember.allowedCategories.includes(category);

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() =>
                          setNewMember((current) => ({
                            ...current,
                            allowedCategories: enabled
                              ? current.allowedCategories.filter((item) => item !== category)
                              : [...current.allowedCategories, category],
                          }))
                        }
                        className={`rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                          enabled
                            ? "bg-cyan-300 text-slate-950"
                            : "border border-white/10 bg-[#0b1519] text-stone-200"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </ControlCard>

              <ControlCard label="Programming notes">
                <textarea
                  value={newMember.notes}
                  onChange={(event) =>
                    setNewMember((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={7}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
              </ControlCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <ControlCard label="Gym profile">
                <textarea
                  value={newMember.gymProfile}
                  onChange={(event) =>
                    setNewMember((current) => ({ ...current, gymProfile: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
              </ControlCard>

              <ControlCard label="Equipment override">
                <textarea
                  value={newMember.equipmentOverride}
                  onChange={(event) =>
                    setNewMember((current) => ({
                      ...current,
                      equipmentOverride: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
              </ControlCard>

              <ControlCard label="Goal focus">
                <textarea
                  value={newMember.goalFocus}
                  onChange={(event) =>
                    setNewMember((current) => ({ ...current, goalFocus: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
              </ControlCard>
            </div>
              </div>

              <div className="sticky bottom-0 z-10 mt-auto flex justify-end gap-3 border-t border-white/8 bg-[#071015] px-5 py-4">
              {createError ? (
                <div className="mr-auto rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {createError}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  resetNewMember();
                  setCreateError(null);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createMember}
                disabled={isCreating}
                className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950"
              >
                {isCreating ? "Adding..." : "Add member"}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ControlCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MemberInlineEditor({
  selectedMember,
  membershipTiers,
  workoutCategories,
  selectedUsesWeeklyLimit,
  selectedMemberIsPersisted,
  selectedMemberIsSuperAdmin,
  temporaryPassword,
  setTemporaryPassword,
  saveError,
  saveMessage,
  isSettingTempPassword,
  isSendingReset,
  isSaving,
  isDeleting,
  updateMember,
  onSetTemporaryPassword,
  onSendReset,
  onSave,
  onRemove,
}: MemberInlineEditorProps) {
  const canRemoveMember = selectedMemberIsPersisted && !selectedMemberIsSuperAdmin;

  return (
    <div className="border-t border-white/8 bg-[#091317] px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">
            Editing member
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {selectedMember.name}
          </h3>
          <p className="mt-1 text-sm text-stone-400">{selectedMember.email}</p>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">
              Quick actions
            </p>
            <p className="mt-1 text-sm text-stone-200">
              Password, reset, save, and member removal live here.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <input
                type="password"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                placeholder="Temporary password"
                className="w-44 rounded-full border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
              />
              <button
                type="button"
                onClick={onSetTemporaryPassword}
                disabled={isSettingTempPassword || !selectedMemberIsPersisted}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSettingTempPassword ? "Setting password..." : "Set temporary password"}
              </button>
            </div>
            <button
              type="button"
              onClick={onSendReset}
              disabled={isSendingReset}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingReset ? "Sending reset..." : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || !selectedMemberIsPersisted}
              className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save member changes"}
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={isDeleting || !canRemoveMember}
              className="rounded-full border border-rose-300/20 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting
                ? "Removing..."
                : selectedMemberIsSuperAdmin
                  ? "Protected super admin"
                  : "Remove member"}
            </button>
          </div>
          {!selectedMemberIsPersisted ? (
            <div className="max-w-md rounded-[1rem] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Password tools only work for real Supabase-backed members created through
              `New member`. Seeded demo members cannot receive a temporary password.
            </div>
          ) : null}
          {selectedMemberIsSuperAdmin ? (
            <div className="max-w-md rounded-[1rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
              This is the protected super admin account and it cannot be deleted.
            </div>
          ) : null}
          {saveError ? (
            <div className="max-w-md rounded-[1rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {saveError}
            </div>
          ) : null}
          {saveMessage ? (
            <div className="max-w-md rounded-[1rem] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {saveMessage}
            </div>
          ) : null}
          <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 md:max-w-md">
            <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">
              Gym profile
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {selectedMember.gymProfile}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ControlCard label="Member name">
          <input
            type="text"
            value={selectedMember.name}
            onChange={(event) =>
              updateMember(selectedMember.id, { name: event.target.value })
            }
            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
          />
        </ControlCard>

        <ControlCard label="Member email">
          <input
            type="email"
            value={selectedMember.email}
            onChange={(event) =>
              updateMember(selectedMember.id, { email: event.target.value })
            }
            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
          />
        </ControlCard>

        <ControlCard label="Membership tier">
          <select
            value={selectedMember.tierType}
            onChange={(event) => {
              const nextTier = membershipTiers.find(
                (tier) => tier.id === event.target.value,
              );

              updateMember(selectedMember.id, {
                tierType: event.target.value as MemberProfile["tierType"],
                tierLabel: nextTier?.label ?? selectedMember.tierLabel,
                weeklyLimit:
                  event.target.value === "weekly_limit"
                    ? (selectedMember.weeklyLimit ?? 3)
                    : null,
                sessionsRemaining:
                  event.target.value === "monthly_unlimited"
                    ? 9999
                    : selectedMember.sessionsRemaining,
              });
            }}
            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
          >
            {membershipTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.label}
              </option>
            ))}
          </select>
        </ControlCard>

        <ControlCard label="Membership status">
          <div className="grid grid-cols-3 gap-2">
            {(["active", "paused", "expired"] as MembershipStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateMember(selectedMember.id, { status })}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold capitalize transition ${
                  selectedMember.status === status
                    ? "bg-cyan-300 text-slate-950"
                    : "border border-white/10 bg-[#0b1519] text-stone-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </ControlCard>

        <ControlCard label="Weekly session limit">
          <input
            type="range"
            min={1}
            max={7}
            value={selectedMember.weeklyLimit ?? 3}
            onChange={(event) =>
              updateMember(selectedMember.id, {
                weeklyLimit: Number(event.target.value),
              })
            }
            disabled={!selectedUsesWeeklyLimit}
            className="w-full accent-cyan-300"
          />
          <p className="mt-2 text-sm text-stone-300">
            {selectedUsesWeeklyLimit
              ? `${selectedMember.weeklyLimit ?? 3} sessions per week`
              : "Not used for this membership tier"}
          </p>
        </ControlCard>

        <ControlCard label="Sessions remaining">
          <input
            type="number"
            min={0}
            value={selectedMember.sessionsRemaining}
            onChange={(event) =>
              updateMember(selectedMember.id, {
                sessionsRemaining: Number(event.target.value),
              })
            }
            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
          />
        </ControlCard>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <ControlCard label="Category access overrides">
          <p className="mb-3 text-sm leading-6 text-stone-300">
            Toggle which program families this member is allowed to enter.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {workoutCategories.map((category) => {
              const enabled = selectedMember.allowedCategories.includes(category);

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    const nextCategories = enabled
                      ? selectedMember.allowedCategories.filter((item) => item !== category)
                      : [...selectedMember.allowedCategories, category];

                    updateMember(selectedMember.id, {
                      allowedCategories: nextCategories,
                    });
                  }}
                  className={`rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                    enabled
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-white/10 bg-[#0b1519] text-stone-200"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </ControlCard>

        <ControlCard label="Programming notes">
          <textarea
            value={selectedMember.notes}
            onChange={(event) =>
              updateMember(selectedMember.id, { notes: event.target.value })
            }
            rows={8}
            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
          />
        </ControlCard>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <SummaryCard
          title="Equipment override"
          text={selectedMember.equipmentOverride}
        />
        <SummaryCard
          title="Goal focus"
          text={selectedMember.goalFocus}
        />
        <SummaryCard
          title="Last workout note"
          text={selectedMember.lastWorkoutSummary}
        />
      </div>

      {!selectedMemberIsPersisted ? (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          This is a prototype seeded member. Real save/remove actions only work for
          Supabase-backed members created through `New member`.
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-100">{text}</p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: MembershipStatus }) {
  const styles: Record<MembershipStatus, string> = {
    active: "bg-emerald-400/15 text-emerald-200 border-emerald-300/20",
    paused: "bg-amber-400/15 text-amber-100 border-amber-300/20",
    expired: "bg-rose-400/15 text-rose-100 border-rose-300/20",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
