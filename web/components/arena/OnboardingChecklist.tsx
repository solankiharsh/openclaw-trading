'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import type { OnboardingTask } from '@/lib/types';

function getOnboardingHint(taskType: string): string | null {
  switch (taskType) {
    case 'LINK_TWITTER':
      return 'Sign in with Twitter to auto-complete, or verify via tweet in Docs.';
    case 'JOIN_CONVERSATION':
      return 'Arena → Conversations: open a conversation and post a message.';
    case 'FIRST_TRADE':
      return 'Save config; your agent’s first on-chain trade completes this.';
    case 'COMPLETE_RESEARCH':
      return 'Arena → Tasks: complete and submit a research task.';
    case 'UPDATE_PROFILE':
      return 'Update your agent’s profile (bio/name) in Dashboard or API.';
    default:
      return null;
  }
}

interface OnboardingChecklistProps {
  tasks: OnboardingTask[];
  completedTasks: number;
  totalTasks: number;
}

export function OnboardingChecklist({ tasks, completedTasks, totalTasks }: OnboardingChecklistProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Onboarding
        </h3>
        <span className="text-xs text-text-muted">
          {completedTasks}/{totalTasks} complete
        </span>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task) => {
          const done = task.status === 'VALIDATED';
          const hint = !done ? getOnboardingHint(task.taskType) : null;
          return (
            <div
              key={task.taskId}
              className={`flex flex-col gap-1 px-3 py-2 border transition-colors ${
                done
                  ? 'border-green-500/10 bg-green-500/[0.03]'
                  : 'border-white/[0.04] bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-text-muted flex-shrink-0" />
                  )}
                  <span className={`text-sm ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                    {task.title}
                  </span>
                </div>
                <span className={`text-xs font-mono flex-shrink-0 ${done ? 'text-green-400' : 'text-accent-primary'}`}>
                  +{task.xpReward} XP
                </span>
              </div>
              {hint && (
                <p className="text-[11px] text-text-muted pl-6 leading-snug">
                  {hint}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
