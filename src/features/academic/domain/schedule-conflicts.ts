import type {
  ScheduleConflict,
  ScheduleConflictCheck,
  ScheduleEntryCandidate,
  TeachingGroupMembership,
} from "./scheduling";

/**
 * Detector de conflitos de horário.
 *
 * Função pura: corre sobre horários hipotéticos — o que o utilizador está a arrastar no
 * ecrã antes de gravar — e não sobre linhas do Prisma.
 *
 * Dos quatro conflitos possíveis, três (professor, sala, agrupamento) também estão
 * protegidos por índice único na base de dados. O quarto, ALUNO, não é exprimível como
 * índice: uma matrícula pertence a vários agrupamentos ao mesmo tempo, e a colisão só é
 * visível cruzando os membros com o horário. É esse que só existe aqui.
 * Ver docs/specs/domain-foundation.md §4.5.
 */

/** Par ordenado e estável, para o mesmo conflito ser sempre relatado da mesma maneira. */
function pair(a: string, b: string): readonly [string, string] {
  return a <= b ? [a, b] : [b, a];
}

function groupBySlot(
  entries: readonly ScheduleEntryCandidate[],
): Map<string, ScheduleEntryCandidate[]> {
  const bySlot = new Map<string, ScheduleEntryCandidate[]>();

  for (const entry of entries) {
    const bucket = bySlot.get(entry.timeSlotId);
    if (bucket) bucket.push(entry);
    else bySlot.set(entry.timeSlotId, [entry]);
  }

  return bySlot;
}

function membershipIndex(
  memberships: readonly TeachingGroupMembership[],
): Map<string, readonly string[]> {
  return new Map(memberships.map((m) => [m.teachingGroupId, m.enrollmentIds]));
}

/**
 * Devolve TODOS os conflitos, não apenas o primeiro.
 *
 * Quem está a montar um horário precisa de ver o estrago todo de uma vez; parar no
 * primeiro conflito transforma a tarefa num jogo de tentativa e erro.
 */
export function detectScheduleConflicts(
  check: ScheduleConflictCheck,
): readonly ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const members = membershipIndex(check.memberships);

  for (const [timeSlotId, entries] of groupBySlot(check.entries)) {
    if (entries.length < 2) continue;

    const byTeacher = new Map<string, string[]>();
    const byRoom = new Map<string, string[]>();
    const byGroup = new Map<string, number>();
    const byEnrollment = new Map<string, string[]>();

    for (const entry of entries) {
      byTeacher.set(entry.teacherId, [
        ...(byTeacher.get(entry.teacherId) ?? []),
        entry.teachingGroupId,
      ]);

      byRoom.set(entry.roomId, [
        ...(byRoom.get(entry.roomId) ?? []),
        entry.teachingGroupId,
      ]);

      byGroup.set(entry.teachingGroupId, (byGroup.get(entry.teachingGroupId) ?? 0) + 1);

      for (const enrollmentId of members.get(entry.teachingGroupId) ?? []) {
        byEnrollment.set(enrollmentId, [
          ...(byEnrollment.get(enrollmentId) ?? []),
          entry.teachingGroupId,
        ]);
      }
    }

    for (const [teacherId, groups] of byTeacher) {
      if (groups.length > 1) {
        conflicts.push({
          kind: "TEACHER_DOUBLE_BOOKED",
          timeSlotId,
          teacherId,
          teachingGroupIds: pair(groups[0], groups[1]),
        });
      }
    }

    for (const [roomId, groups] of byRoom) {
      if (groups.length > 1) {
        conflicts.push({
          kind: "ROOM_DOUBLE_BOOKED",
          timeSlotId,
          roomId,
          teachingGroupIds: pair(groups[0], groups[1]),
        });
      }
    }

    for (const [teachingGroupId, count] of byGroup) {
      if (count > 1) {
        conflicts.push({ kind: "GROUP_DOUBLE_BOOKED", timeSlotId, teachingGroupId });
      }
    }

    for (const [enrollmentId, groups] of byEnrollment) {
      // Um agrupamento repetido no mesmo tempo já é GROUP_DOUBLE_BOOKED; aqui interessa
      // o aluno que está em DOIS agrupamentos distintos ao mesmo tempo.
      const distinct = [...new Set(groups)];

      if (distinct.length > 1) {
        conflicts.push({
          kind: "STUDENT_DOUBLE_BOOKED",
          timeSlotId,
          enrollmentId,
          teachingGroupIds: pair(distinct[0], distinct[1]),
        });
      }
    }
  }

  return conflicts;
}

/**
 * Conflitos que a colocação de `candidate` introduziria num horário existente.
 *
 * Filtra os conflitos que já lá estavam: quem está a colocar uma aula não deve ser
 * culpado por problemas anteriores do horário.
 */
export function conflictsForPlacement(
  candidate: ScheduleEntryCandidate,
  existing: readonly ScheduleEntryCandidate[],
  memberships: readonly TeachingGroupMembership[],
): readonly ScheduleConflict[] {
  // Substituir a própria entrada, quando é uma remarcação e não uma inserção.
  const others = candidate.id
    ? existing.filter((entry) => entry.id !== candidate.id)
    : existing;

  const before = detectScheduleConflicts({ entries: others, memberships });
  const after = detectScheduleConflicts({
    entries: [...others, candidate],
    memberships,
  });

  const previous = new Set(before.map((conflict) => JSON.stringify(conflict)));

  return after.filter((conflict) => !previous.has(JSON.stringify(conflict)));
}

export function isFree(
  candidate: ScheduleEntryCandidate,
  existing: readonly ScheduleEntryCandidate[],
  memberships: readonly TeachingGroupMembership[],
): boolean {
  return conflictsForPlacement(candidate, existing, memberships).length === 0;
}
