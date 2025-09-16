import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  lastExecution: Date | null;
  executionCount: number;
  successRate: number;
  triggers: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
}

export const useWorkflows = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/workflows', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-tenant-id': user.tenantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }

      const data = await response.json();
      setWorkflows(data.workflows);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createWorkflow = useCallback(async (workflowData: {
    name: string;
    description: string;
    template?: string;
    triggers?: string[];
  }) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify(workflowData)
    });

    if (!response.ok) {
      throw new Error('Failed to create workflow');
    }

    return response.json();
  }, [user]);

  const updateWorkflow = useCallback(async (workflowId: string, updates: Partial<Workflow>) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update workflow');
    }

    return response.json();
  }, [user]);

  const deleteWorkflow = useCallback(async (workflowId: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete workflow');
    }
  }, [user]);

  const executeWorkflow = useCallback(async (workflowId: string, input?: any) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify({ input })
    });

    if (!response.ok) {
      throw new Error('Failed to execute workflow');
    }

    return response.json();
  }, [user]);

  const toggleWorkflowStatus = useCallback(async (workflowId: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/${workflowId}/toggle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to toggle workflow status');
    }

    return response.json();
  }, [user]);

  const saveWorkflow = useCallback(async (workflowData: any) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/${workflowData.id || ''}`, {
      method: workflowData.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify(workflowData)
    });

    if (!response.ok) {
      throw new Error('Failed to save workflow');
    }

    return response.json();
  }, [user]);

  const validateWorkflow = useCallback(async (workflowData: any) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch('/api/workflows/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify(workflowData)
    });

    if (!response.ok) {
      throw new Error('Failed to validate workflow');
    }

    const result = await response.json();
    return result.errors || [];
  }, [user]);

  return {
    workflows,
    stats,
    loading,
    error,
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    toggleWorkflowStatus,
    saveWorkflow,
    validateWorkflow
  };
};
