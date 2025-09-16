import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar?: string;
    verified: boolean;
  };
  rating: number;
  downloads: number;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  preview: {
    nodes: number;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedTime: string;
  };
  workflow: any;
  isOfficial: boolean;
  isFavorite?: boolean;
}

export const useWorkflowTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<WorkflowTemplate[]>([]);
  const [favorites, setFavorites] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/workflows/templates', {
        headers: user ? {
          'Authorization': `Bearer ${user.token}`,
          'x-tenant-id': user.tenantId
        } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMyTemplates = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/workflows/templates/my', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-tenant-id': user.tenantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch my templates');
      }

      const data = await response.json();
      setMyTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user]);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/workflows/templates/favorites', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-tenant-id': user.tenantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }

      const data = await response.json();
      setFavorites(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user]);

  const installTemplate = useCallback(async (templateId: string, customName?: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/templates/${templateId}/install`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify({ customName })
    });

    if (!response.ok) {
      throw new Error('Failed to install template');
    }

    return response.json();
  }, [user]);

  const createTemplate = useCallback(async (templateData: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    workflow: any;
    isPublic: boolean;
  }) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch('/api/workflows/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify(templateData)
    });

    if (!response.ok) {
      throw new Error('Failed to create template');
    }

    return response.json();
  }, [user]);

  const updateTemplate = useCallback(async (templateId: string, updates: Partial<WorkflowTemplate>) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update template');
    }

    return response.json();
  }, [user]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/templates/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete template');
    }
  }, [user]);

  const toggleFavorite = useCallback(async (templateId: string) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/templates/${templateId}/favorite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      }
    });

    if (!response.ok) {
      throw new Error('Failed to toggle favorite');
    }

    return response.json();
  }, [user]);

  const rateTemplate = useCallback(async (templateId: string, rating: number) => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/workflows/templates/${templateId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'x-tenant-id': user.tenantId
      },
      body: JSON.stringify({ rating })
    });

    if (!response.ok) {
      throw new Error('Failed to rate template');
    }

    return response.json();
  }, [user]);

  return {
    templates,
    myTemplates,
    favorites,
    loading,
    error,
    fetchTemplates,
    fetchMyTemplates,
    fetchFavorites,
    installTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    rateTemplate
  };
};
