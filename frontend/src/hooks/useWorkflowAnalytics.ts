import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface AnalyticsData {
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  errorRate: number;
  executionTrends: Array<{
    date: string;
    executions: number;
    success: number;
    failed: number;
    avgDuration: number;
  }>;
  workflowPerformance: Array<{
    workflowId: string;
    workflowName: string;
    executions: number;
    successRate: number;
    avgDuration: number;
    errorRate: number;
  }>;
  triggerAnalytics: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  resourceUsage: Array<{
    date: string;
    cpu: number;
    memory: number;
    executions: number;
  }>;
  errorAnalysis: Array<{
    errorType: string;
    count: number;
    workflows: string[];
    trend: 'up' | 'down' | 'stable';
  }>;
  topWorkflows: Array<{
    id: string;
    name: string;
    executions: number;
    successRate: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export const useWorkflowAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (timeRange: string = '7d') => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workflows/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-tenant-id': user.tenantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const exportAnalytics = useCallback(async (timeRange: string, format: 'csv' | 'pdf') => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/analytics/export?timeRange=${timeRange}&format=${format}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to export analytics');
    }

    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `workflow-analytics-${timeRange}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [user]);

  return {
    analytics,
    loading,
    error,
    fetchAnalytics,
    exportAnalytics
  };
};
