import { GraphQLError } from "graphql";
import { prisma } from "@/lib/db";
import { STEPS, isValidStepId } from "@/lib/steps";
import { computeStatus } from "@/lib/status";

interface ReleaseRow {
  id: string;
  name: string;
  dueDate: Date;
  additionalInfo: string | null;
  completedSteps: number[];
}

const notFound = (id: string) =>
  new GraphQLError(`Release ${id} not found`, {
    extensions: { code: "NOT_FOUND" },
  });

const badInput = (msg: string) =>
  new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });

export const resolvers = {
  Query: {
    releases: () => prisma.release.findMany({ orderBy: { dueDate: "asc" } }),
    release: (_: unknown, { id }: { id: string }) =>
      prisma.release.findUnique({ where: { id } }),
  },

  Mutation: {
    createRelease: (
      _: unknown,
      args: { name: string; dueDate: string; additionalInfo?: string | null },
    ) => {
      const name = args.name.trim();
      if (!name) throw badInput("Name is required");
      const dueDate = new Date(args.dueDate);
      if (Number.isNaN(dueDate.getTime())) throw badInput("Invalid due date");
      return prisma.release.create({
        data: {
          name,
          dueDate,
          additionalInfo: args.additionalInfo?.trim() || null,
        },
      });
    },

    // Omitted fields stay unchanged; additionalInfo: null clears it.
    updateRelease: async (
      _: unknown,
      args: {
        id: string;
        name?: string | null;
        dueDate?: string | null;
        additionalInfo?: string | null;
      },
    ) => {
      const data: {
        name?: string;
        dueDate?: Date;
        additionalInfo?: string | null;
      } = {};
      if (args.name != null) {
        const name = args.name.trim();
        if (!name) throw badInput("Name is required");
        data.name = name;
      }
      if (args.dueDate != null) {
        const dueDate = new Date(args.dueDate);
        if (Number.isNaN(dueDate.getTime())) throw badInput("Invalid due date");
        data.dueDate = dueDate;
      }
      if (args.additionalInfo !== undefined) {
        data.additionalInfo = args.additionalInfo?.trim() || null;
      }
      const row = await prisma.release.findUnique({ where: { id: args.id } });
      if (!row) throw notFound(args.id);
      return prisma.release.update({ where: { id: args.id }, data });
    },

    // Sets (not flips) the step so retries / double clicks are idempotent.
    toggleStep: async (
      _: unknown,
      args: { releaseId: string; stepId: number; completed: boolean },
    ) => {
      if (!isValidStepId(args.stepId)) throw badInput("Unknown step");
      const row = await prisma.release.findUnique({
        where: { id: args.releaseId },
      });
      if (!row) throw notFound(args.releaseId);
      // Drop stale ids left over from an older step list while we're here.
      const set = new Set(row.completedSteps.filter(isValidStepId));
      if (args.completed) set.add(args.stepId);
      else set.delete(args.stepId);
      return prisma.release.update({
        where: { id: args.releaseId },
        data: { completedSteps: [...set].sort((a, b) => a - b) },
      });
    },

    updateAdditionalInfo: async (
      _: unknown,
      args: { releaseId: string; additionalInfo?: string | null },
    ) => {
      const row = await prisma.release.findUnique({
        where: { id: args.releaseId },
      });
      if (!row) throw notFound(args.releaseId);
      return prisma.release.update({
        where: { id: args.releaseId },
        data: { additionalInfo: args.additionalInfo?.trim() || null },
      });
    },

    deleteRelease: async (_: unknown, { id }: { id: string }) => {
      const { count } = await prisma.release.deleteMany({ where: { id } });
      if (count === 0) throw notFound(id);
      return true;
    },
  },

  // status and steps are derived from completedSteps, never stored.
  Release: {
    dueDate: (r: ReleaseRow) => r.dueDate.toISOString(),
    status: (r: ReleaseRow) => computeStatus(r.completedSteps),
    steps: (r: ReleaseRow) =>
      STEPS.map((s) => ({ ...s, completed: r.completedSteps.includes(s.id) })),
  },
};
