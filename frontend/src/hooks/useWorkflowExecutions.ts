import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'error' | 'cancelled' | 'waiting';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  triggeredBy: string;
  triggerType: 'manual' | 'webhook' | 'schedule' | 'chat';
  input: any;
  output?: any;
  error?: string;
  steps: ExecutionStep[];
  resourceUsage: {
    cpu: number;
    memory: number;
    duration: number;
  };
}

interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

interface ExecutionStats {
  running: number;
  completedToday: number;
  failedToday: number;
  avgDuration: number;
}

export const useWorkflowExecutions = () => {
  const { user } = useAuth();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/executions', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-tenant-id': user.tenantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }

      const data = await response.json();
      setExecutions(data.executions);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getExecutionDetails = useCallback(async (executionId: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/executions/${executionId}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch execution details');
    }

    return response.json();
  }, [user]);

  const stopExecution = useCallback(async (executionId: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/executions/${executionId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to stop execution');
    }

    return response.json();
  }, [user]);

  const retryExecution = useCallback(async (executionId: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/executions/${executionId}/retry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to retry execution');
    }

    return response.json();
  }, [user]);

  const deleteExecution = useCallback(async (executionId: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/executions/${executionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete execution');
    }
  }, [user]);

  return {
    executions,
    stats,
    loading,
    error,
    fetchExecutions,
    getExecutionDetails,
    stopExecution,
    retryExecution,
    deleteExecution
  };
};
